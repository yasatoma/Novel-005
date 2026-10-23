import { resolveContentUrl } from "./content-url.js";
import { calculateCharacterPositionOffset, calculateFaceCropPresentation, measureAlphaBounds } from "./character-crop.js";
export function rubySegments(text,map={},seen=new Set()){
  let segments=[{text:String(text),reading:null}];
  for(const [word,reading] of Object.entries(map).sort((a,b)=>b[0].length-a[0].length)){
    if(!word||seen.has(word))continue;
    for(let i=0;i<segments.length;i++){
      const segment=segments[i];
      if(segment.reading!==null)continue;
      const at=segment.text.indexOf(word);
      if(at<0)continue;
      const next=[];
      if(at>0)next.push({text:segment.text.slice(0,at),reading:null});
      next.push({text:word,reading:String(reading)});
      if(at+word.length<segment.text.length)next.push({text:segment.text.slice(at+word.length),reading:null});
      segments.splice(i,1,...next);
      seen.add(word);
      break;
    }
  }
  return segments;
}
function escapeHtml(value){return String(value).replace(/[&<>]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[char]));}
export function applyRuby(text,map={},seen=new Set()){
  return rubySegments(text,map,seen).map(segment=>segment.reading===null
    ? escapeHtml(segment.text)
    : `<ruby>${escapeHtml(segment.text)}<rt>${escapeHtml(segment.reading)}</rt></ruby>`).join("");
}
function renderRuby(target,text,map={},seen=new Set()){
  if(typeof document==="undefined"||typeof target?.replaceChildren!=="function"){target.textContent=String(text);return;}
  target.replaceChildren();
  for(const segment of rubySegments(text,map,seen)){
    if(segment.reading===null){target.append(document.createTextNode(segment.text));continue;}
    const ruby=document.createElement("ruby"),rt=document.createElement("rt");
    ruby.append(document.createTextNode(segment.text));
    rt.textContent=segment.reading;
    ruby.append(rt);
    target.append(ruby);
  }
}
export function resolveBackgroundAsset(assets, id, variant = "base") {
  const registered = assets.backgrounds?.[id];
  if (!registered) throw new Error(`background asset not registered: ${id}`);
  if (typeof registered === "string") {
    if (variant !== "base") throw new Error(`background variant not registered: ${id}/${variant}`);
    return registered;
  }
  const variants = registered.variants ?? registered;
  const file = variants?.[variant];
  if (!file) throw new Error(`background variant not registered: ${id}/${variant}`);
  return file;
}

export function resolveBackgroundPosition(assets, id) {
  const registered = assets.backgrounds?.[id];
  if (!registered || typeof registered === "string") return "center";
  return registered.position ?? "center";
}

export class Renderer {
  constructor(workRoot = "../content/", options = {}) {
    this.workRoot = workRoot;
    this.defaultCharacterPosition = options.defaultCharacterPosition ?? "right";
    this.rubySeen = new Map();
    this.currentChapterId = null;
    this.transitionTimers = [];
    this.transitionGeneration = 0;
    this.characterAlphaBounds = new Map();
    this.textAdvanceTimer = null;
    this.title = document.querySelector("#title");
    this.game = document.querySelector("#game");
    this.background = document.querySelector("#background");
    this.transition = document.querySelector("#transition-layer");
    this.comparison = document.querySelector("#comparison");
    this.speakerBox = document.querySelector("#speaker-box");
    this.speaker = document.querySelector("#speaker");
    this.textbox = document.querySelector("#textbox");
    this.chapterTitle = document.querySelector("#chapter-title");
    this.text = document.querySelector("#text");
    this.readStatus = document.querySelector("#read-status");
    this.advanceMark = document.querySelector("#advance-mark");
    this.choices = document.querySelector("#choices");
    this.notice = document.querySelector("#notice");
    this.ending = document.querySelector("#ending");
    this.characterSlots = new Map(
      [...document.querySelectorAll("#characters img")].map(element => [element.dataset.position, element])
    );
  }

  showTitle(config) {
    this.clearAdvance();
    document.querySelector("#work-title").textContent = config.title;
    this.title.dataset.layout = config.titleLayout ?? "left";
    const image = config.titleImage ? resolveContentUrl(this.workRoot, `images/title/${config.titleImage}`) : "";
    this.title.style.setProperty("--title-image", image ? `url("${image}")` : "none");
    this.title.hidden = false;
    this.game.hidden = true;
  }

  startGame() {
    this.title.hidden = true;
    this.game.hidden = false;
  }

  clearTransition() {
    for (const timer of this.transitionTimers) clearTimeout(timer);
    this.transitionTimers = [];
    this.transitionGeneration++;
    if (this.transition) {
      this.transition.hidden = true;
      this.transition.className = "";
      this.transition.style.backgroundImage = "";
      this.transition.style.backgroundColor = "";
      this.transition.style.backgroundPosition = "";
      this.transition.style.backgroundSize = "";
      this.transition.style.filter = "";
      delete this.transition.dataset.effect;
      delete this.transition.dataset.active;
    }
  }

  resetPresentation() {
    this.clearAdvance();
    this.clearTransition();
    this.comparison.hidden = true;
    this.choices.hidden = true;
    this.choices.replaceChildren();
    this.ending.hidden = true;
    this.currentChapterId = null;
    this.rubySeen.clear();
    if (this.chapterTitle) this.chapterTitle.textContent = "";
    this.speaker.textContent = "";
    this.speakerBox.hidden = true;
    this.text.textContent = "";
    this.readStatus.textContent = "";
    this.background.style.backgroundImage = "";
    this.background.style.backgroundPosition = "center";
    this.background.dataset.filter = "normal";
    this.background.dataset.effect = "none";
    this.updateEffectLayer("none", "background");
    this.background.dataset.view = "full";
    for (const slot of this.characterSlots.values()) {
      slot.hidden = true; slot.removeAttribute("src"); delete slot.dataset.character; delete slot.dataset.hiding; slot.style.opacity = "";
      slot.style.zIndex = "";
      for (const name of ["--char-face-height","--char-face-top","--char-face-height-mobile","--char-face-top-mobile","--char-position-offset-x"]) slot.style.removeProperty(name);
    }
    this.updateVisibleCharacterCount();
  }

  showChapter(command) {
    if (this.chapterTitle) this.chapterTitle.textContent = command.args.title || "章";
    this.currentChapterId=command.args.id;if(!this.rubySeen.has(command.args.id))this.rubySeen.set(command.args.id,new Set());
  }

  restoreChapterContext(chapterId, title, seenWords = []) {
    this.currentChapterId = chapterId ?? null;
    if (this.chapterTitle) this.chapterTitle.textContent = chapterId ? (title || "章") : "";
    this.rubySeen.clear();
    if (chapterId) this.rubySeen.set(chapterId, new Set(seenWords));
  }

  exportRubySeenState() {
    return Object.fromEntries([...this.rubySeen].map(([chapterId,words])=>[chapterId,[...words]]));
  }

  bringSpeakingCharacterToFront(characterId) {
    if (!characterId) return;
    const speakingSlot = [...this.characterSlots.values()].find(slot => !slot.hidden && slot.dataset.character === characterId);
    if (!speakingSlot) return;
    for (const slot of this.characterSlots.values()) slot.style.zIndex = slot === speakingSlot ? "2" : "";
  }

  showText(command, next, options = {}) {
    if (this.textAdvanceTimer !== null) { clearTimeout(this.textAdvanceTimer); this.textAdvanceTimer = null; }
    this.bringSpeakingCharacterToFront(command.args.speaker);
    const narration = command.args.speaker === "narration";
    const speaker = options.speaker ?? {};
    this.speaker.textContent = narration ? "" : (speaker.name ?? "話者不明");
    this.speakerBox.hidden = narration;
    this.speakerBox.style.setProperty("--speaker-color", narration ? "#9aa5a5" : (speaker.color ?? "#d1b884"));
    this.textbox.style.setProperty("--speaker-color", narration ? "#9aa5a5" : (speaker.color ?? "#d1b884"));
    renderRuby(this.text, command.text, options.rubyMap ?? {}, this.rubySeen.get(this.currentChapterId) ?? new Set());
    this.readStatus.textContent = options.wasRead ? "既読" : "未読";
    this.advanceMark.hidden = false;
    let advanced = false;
    const advanceOnce = () => {
      if (advanced) return;
      advanced = true;
      if (this.textAdvanceTimer !== null) { clearTimeout(this.textAdvanceTimer); this.textAdvanceTimer = null; }
      next();
    };
    this.textbox.onclick = event => {
      if (event.target.closest("button")) return;
      advanceOnce();
    };
    if (options.auto) this.textAdvanceTimer = setTimeout(advanceOnce, options.autoDelay ?? 900);
  }

  clearAdvance() {
    if (this.textAdvanceTimer !== null) { clearTimeout(this.textAdvanceTimer); this.textAdvanceTimer = null; }
    this.textbox.onclick = null;
    this.advanceMark.hidden = true;
  }

  restore(state, assets) {
    this.resetPresentation();
    this.startGame();
    if (state.currentBackground) this.showBackground({ action:"show", args:{
      id:state.currentBackground,
      image:state.currentBackgroundImage ?? "base",
      filter:state.currentBackgroundFilter ?? "normal",
      effect:state.currentBackgroundEffect ?? "none",
      effect_layer:state.currentBackgroundEffectLayer ?? "background",
      view:state.currentBackgroundView ?? "full"
    } }, assets);
    for (const [position, character] of Object.entries(state.visibleCharacters ?? {})) {
      this.showCharacter({ action:"show", args:{ id:character.id, expression:character.expression, position, crop:character.crop ?? "bust" } }, assets);
    }
    if (state.currentComparison) this.showComparison({ action:"show", args:state.currentComparison }, assets);
    else this.comparison.hidden = true;
  }

  showBacklog(entries, rubyMap = {}, characters = {}) {
    const list=document.querySelector("#backlog-list"); list.replaceChildren();
    for(const entry of entries){
      const article=document.createElement("article"); article.className="log-item";
      const speakerName = entry.speaker === "narration" ? "" : (entry.speakerName ?? characters?.[entry.speaker]?.name ?? "話者不明");
      if(speakerName) article.append(document.createTextNode(speakerName+"："));
      const body=document.createElement("span"); renderRuby(body,entry.text,rubyMap,new Set()); article.append(body);
      list.append(article);
    }
    const backlog=document.querySelector("#backlog");
    backlog.hidden=false;
    const scrollTarget=document.querySelector("#backlog-list");
    requestAnimationFrame(()=>{ scrollTarget.scrollTop=scrollTarget.scrollHeight; });
  }

  showRecords(ids, memos) {
    const list=document.querySelector("#records-list"); list.replaceChildren();
    if (!ids.length) {
      const p=document.createElement("p"); p.className="panel-note"; p.textContent="まだ記録はありません。"; list.append(p);
    }
    for (const id of ids) {
      const memo=memos[id]; if(!memo) continue;
      const article=document.createElement("article"); article.className="record-card";
      const h=document.createElement("h3"); h.textContent=memo.title || "記録";
      const p=document.createElement("p"); p.textContent=memo.text ?? "";
      article.append(h,p); list.append(article);
    }
    document.querySelector("#records-count").textContent=String(ids.length);
    document.querySelector("#records").hidden=false;
  }

  updateEffectLayer(effect, layer) {
    this.background.dataset.effectLayer = layer;
    if (layer === "foreground" && effect !== "none" && !this.foregroundEffect) {
      this.foregroundEffect = document.createElement("div");
      this.foregroundEffect.className = "presentation-effect-layer";
      this.foregroundEffect.setAttribute("aria-hidden", "true");
      this.game.append(this.foregroundEffect);
    }
    if (this.foregroundEffect) {
      this.foregroundEffect.dataset.effect = effect;
      this.foregroundEffect.hidden = layer !== "foreground" || effect === "none";
    }
  }

  showBackground(command, assets, done) {
    this.clearTransition();
    if (command.action === "hide") { this.background.style.backgroundImage = ""; this.background.style.backgroundPosition = "center"; this.background.dataset.filter="normal"; this.background.dataset.effect="none"; this.updateEffectLayer("none", "background"); this.background.dataset.view="full"; done?.(); return; }
    const file = resolveBackgroundAsset(assets, command.args.id, command.args.image ?? "base");
    const apply = () => {
      const backgroundUrl = resolveContentUrl(this.workRoot, `images/bg/${file}`);
      this.background.style.backgroundImage = `url("${backgroundUrl}")`;
      this.background.style.backgroundPosition = resolveBackgroundPosition(assets, command.args.id);
      this.background.dataset.filter = command.args.filter ?? "normal";
      this.background.dataset.effect = command.args.effect ?? "none";
      this.updateEffectLayer(command.args.effect ?? "none", command.args.effect_layer ?? "background");
      this.background.dataset.view = command.args.view ?? "full";
    };
    const transition = command.args.transition ?? "cut";
    const duration = Number(command.args.duration_ms ?? 0);
    if (transition === "cut" || duration <= 0 || !this.transition) { apply(); done?.(); return; }
    const layer = this.transition;
    const generation = this.transitionGeneration;
    layer.hidden = false;
    layer.dataset.transition = transition;
    layer.style.setProperty("--transition-ms", `${duration}ms`);
    if (transition === "blackfade") {
      layer.style.backgroundImage = "";
      layer.style.backgroundColor = "#000";
      layer.className = "transition-blackfade";
      this.transitionTimers.push(setTimeout(() => { if (generation === this.transitionGeneration) apply(); }, duration / 2));
    } else {
      layer.style.backgroundColor = "";
      layer.style.backgroundImage = this.background.style.backgroundImage;
      layer.style.backgroundPosition = getComputedStyle(this.background).backgroundPosition;
      layer.style.backgroundSize = getComputedStyle(this.background).backgroundSize;
      layer.style.filter = getComputedStyle(this.background).filter;
      layer.dataset.effect = this.background.dataset.effect ?? "none";
      layer.className = "transition-crossfade";
      apply();
    }
    requestAnimationFrame(() => { if (generation === this.transitionGeneration) layer.dataset.active = "true"; });
    this.transitionTimers.push(setTimeout(() => {
      if (generation !== this.transitionGeneration) return;
      this.transitionTimers = [];
      layer.hidden = true;
      layer.className = "";
      layer.style.backgroundImage = "";
      layer.style.backgroundPosition = "";
      layer.style.backgroundSize = "";
      layer.style.filter = "";
      delete layer.dataset.effect;
      delete layer.dataset.active;
      done?.();
    }, duration));
  }

  showComparison(command, assets) {
    if (command.action === "hide") { this.comparison.hidden = true; return; }
    const resolve = (id, image) => resolveContentUrl(this.workRoot, `images/bg/${resolveBackgroundAsset(assets, id, image ?? "base")}`);
    document.querySelector("#compare-left").style.backgroundImage = `url("${resolve(command.args.left_id, command.args.left_image)}")`;
    document.querySelector("#compare-right").style.backgroundImage = `url("${resolve(command.args.right_id, command.args.right_image)}")`;
    this.comparison.hidden = false;
  }

  updateVisibleCharacterCount() {
    const count = [...this.characterSlots.values()].filter(slot => !slot.hidden).length;
    document.querySelector("#characters").dataset.visibleCount = String(count);
  }

  showCharacter(command, assets) {
    if (command.action === "hide") {
      for (const slot of this.characterSlots.values()) {
        if (slot.dataset.character === command.args.id) {
          const duration = Number(command.args.duration_ms ?? 0);
          slot.style.setProperty("--char-fade-ms", `${duration}ms`);
          if (duration > 0) {
            slot.dataset.hiding = "true";
            slot.style.opacity = "0";
            setTimeout(() => {
              if (slot.dataset.hiding !== "true") return;
              slot.hidden = true; slot.removeAttribute("src"); delete slot.dataset.character; delete slot.dataset.hiding; slot.style.opacity = "";
              this.updateVisibleCharacterCount();
            }, duration);
          } else {
            slot.hidden = true; slot.removeAttribute("src"); delete slot.dataset.character;
            this.updateVisibleCharacterCount();
          }
        }
      }
      return;
    }
    const position = command.args.position ?? (command.action === "show" ? this.defaultCharacterPosition : this.findCharacterPosition(command.args.id));
    const slot = this.characterSlots.get(position);
    if (!slot) throw new Error(`unknown character position: ${position}`);
    const character = assets.characters?.[command.args.id];
    const file = character?.expressions?.[command.args.expression];
    if (!file) throw new Error(`character asset not registered: ${command.args.id}/${command.args.expression}`);
    delete slot.dataset.hiding;
    const duration = Number(command.args.duration_ms ?? 0);
    const source = resolveContentUrl(this.workRoot, `images/char/${file}`);
    slot.src = source;
    slot.alt = character.name || "登場人物";
    slot.dataset.character = command.args.id;
    if (command.args.crop !== undefined || command.action === "show") slot.dataset.crop = command.args.crop ?? "bust";
    this.prepareCharacterCrop(slot, source);
    slot.style.setProperty("--char-fade-ms", `${duration}ms`);
    if (duration > 0) {
      slot.style.opacity = "0";
      slot.hidden = false;
      requestAnimationFrame(() => { if (slot.dataset.character === command.args.id) slot.style.opacity = "1"; });
    } else {
      slot.style.opacity = "";
      slot.hidden = false;
    }
    this.updateVisibleCharacterCount();
  }

  prepareCharacterCrop(slot, source) {
    for (const name of ["--char-face-height","--char-face-top","--char-face-height-mobile","--char-face-top-mobile"]) slot.style.removeProperty(name);
    const apply = bounds => {
      if (!bounds || slot.src !== source) return;
      const offset = calculateCharacterPositionOffset(bounds, slot.dataset.position);
      slot.style.setProperty("--char-position-offset-x", `${offset}%`);
      if (slot.dataset.crop !== "face") return;
      const presentation = calculateFaceCropPresentation(bounds);
      slot.style.setProperty("--char-face-height", `${presentation.desktop.imageHeightVh}vh`);
      slot.style.setProperty("--char-face-top", `${presentation.desktop.imageTopVh}vh`);
      slot.style.setProperty("--char-face-height-mobile", `${presentation.mobile.imageHeightVh}vh`);
      slot.style.setProperty("--char-face-top-mobile", `${presentation.mobile.imageTopVh}vh`);
    };
    const cached = this.characterAlphaBounds.get(source);
    if (cached) { apply(cached); return; }
    const measure = () => {
      if (slot.src !== source) return;
      try {
        const bounds = measureAlphaBounds(slot);
        if (!bounds) return;
        this.characterAlphaBounds.set(source, bounds);
        apply(bounds);
      } catch {
        // Keep the CSS fallback preset if pixel inspection is unavailable.
      }
    };
    if (slot.complete && slot.naturalWidth) queueMicrotask(measure);
    else slot.addEventListener("load", measure, { once:true });
  }

  findCharacterPosition(id) {
    for (const [position, slot] of this.characterSlots) if (slot.dataset.character === id) return position;
    throw new Error(`character is not visible: ${id}`);
  }

  showMemo(command, memos) {
    const memo = memos[command.args.id];
    if (!memo) throw new Error(`memo not registered: ${command.args.id}`);
    // Unlock state is owned by Runner; the record screen reads state.unlockedMemoIds.
  }

  showEnding(command, endings, toTitle) {
    const ending = endings[command.args.id];
    if (!ending) throw new Error(`ending not registered: ${command.args.id}`);
    this.clearAdvance();
    document.querySelector("#ending-title").textContent = ending.title || "エンディング";
    document.querySelector("#ending-text").textContent = ending.text ?? "";
    this.ending.hidden = false;
    document.querySelector("#ending-title-button").onclick = () => { this.ending.hidden = true; toTitle(); };
  }

  showChoice(_command, options, select) {
    this.clearAdvance();
    this.choices.replaceChildren();
    for (const option of options) {
      const button = document.createElement("button");
      button.type = "button"; button.textContent = option.args.text;
      button.onclick = () => { this.choices.hidden = true; this.choices.replaceChildren(); select(option); };
      this.choices.append(button);
    }
    this.choices.hidden = false;
  }
}
