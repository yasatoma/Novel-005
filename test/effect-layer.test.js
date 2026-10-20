import test from "node:test";
import assert from "node:assert/strict";
import { Runner } from "../engine/js/runner.js";
import { Renderer } from "../engine/js/renderer.js";
import { createGameState } from "../engine/js/state.js";
import { validateScenario } from "../engine/js/validator.js";
import { assertValidSaveState, assertValidTransferPayload } from "../engine/js/data-validation.js";
import { exportTransfer, importTransfer } from "../engine/js/transfer.js";

const bg = args => ({type:"bg", action:"show", args:{id:"BG_A", ...args}, source:{file:"layer.txt",line:1}});
const assets = {backgrounds:{BG_A:"a.webp"}};

test("effect plane is generic, optional, and validated", () => {
  for (const effect of ["none","mist_weak","steam_weak","steam_medium","dust_weak","dust_medium"]) {
    for (const effect_layer of [undefined,"background","foreground"]) {
      assert.equal(validateScenario([bg({effect,effect_layer})], {assets}), true);
    }
  }
  for (const effect_layer of ["front","",null,1]) {
    assert.throws(() => validateScenario([bg({effect_layer})]), /effect_layer/);
  }
});

test("runner resets the plane on omission, hide, and chapter reset", () => {
  const state = createGameState();
  const run = command => new Runner([command], state).start();
  assert.equal(state.currentBackgroundEffectLayer, "background");
  run(bg({effect:"dust_weak",effect_layer:"foreground"}));
  assert.equal(state.currentBackgroundEffectLayer, "foreground");
  run(bg({effect:"mist_weak"}));
  assert.equal(state.currentBackgroundEffectLayer, "background");
  for (const command of [
    {type:"bg",action:"hide",args:{}},
    {type:"chapter",action:"start",args:{id:"C",reset:true}}
  ]) {
    run(bg({effect_layer:"foreground"}));
    run(command);
    assert.equal(state.currentBackgroundEffectLayer, "background");
  }
});

test("save and transfer accept old data, preserve the plane, and reject invalid values", async () => {
  const config={workId:"test",engineVersion:"1.0"};
  const state=createGameState();
  state.currentBackgroundEffectLayer="foreground";
  assert.equal(assertValidSaveState(state),state);
  const result=await importTransfer(config,await exportTransfer(config,state,[]));
  assert.equal(result.state.currentBackgroundEffectLayer,"foreground");
  delete state.currentBackgroundEffectLayer;
  assert.equal(assertValidSaveState(state),state);
  const old=await importTransfer(config,await exportTransfer(config,state,[]));
  assert.equal(old.state.currentBackgroundEffectLayer,undefined);
  assert.throws(()=>assertValidSaveState({...state,currentBackgroundEffectLayer:"bad"}),/EffectLayer/);
  assert.throws(()=>assertValidTransferPayload({state:{currentBackgroundEffectLayer:"bad"},readIds:[]}),/EffectLayer/);
});

function element() {
  return {dataset:{},style:{setProperty(){},removeProperty(){}},hidden:false,
    setAttribute(){},append(child){this.children.push(child);},children:[]};
}

test("renderer uses a separate foreground plane and clears it on hide and restore", () => {
  const previous=globalThis.document;
  globalThis.document={createElement:element};
  try {
    const renderer=Object.create(Renderer.prototype);
    Object.assign(renderer,{game:element(),background:element(),transition:null,
      transitionTimers:[],transitionGeneration:0,workRoot:"https://example.test/content/"});
    renderer.showBackground(bg({effect:"dust_medium",effect_layer:"foreground"}),assets);
    assert.equal(renderer.background.dataset.effectLayer,"foreground");
    assert.equal(renderer.foregroundEffect.dataset.effect,"dust_medium");
    assert.equal(renderer.foregroundEffect.hidden,false);
    assert.equal(renderer.game.children.length,1);
    renderer.showBackground(bg({effect:"mist_weak"}),assets);
    assert.equal(renderer.background.dataset.effectLayer,"background");
    assert.equal(renderer.foregroundEffect.hidden,true);
    renderer.showBackground(bg({effect:"mist_weak",effect_layer:"foreground"}),assets);
    renderer.showBackground({action:"hide"},assets);
    assert.equal(renderer.foregroundEffect.hidden,true);
    renderer.resetPresentation=()=>renderer.updateEffectLayer("none","background");
    renderer.startGame=()=>{};
    renderer.comparison=element();
    renderer.restore({currentBackground:"BG_A",currentBackgroundEffect:"mist_weak",
      currentBackgroundEffectLayer:"foreground"},assets);
    assert.equal(renderer.foregroundEffect.hidden,false);
    renderer.restore({currentBackground:"BG_A",currentBackgroundEffect:"mist_weak"},assets);
    assert.equal(renderer.foregroundEffect.hidden,true);
    assert.equal(renderer.game.children.length,1);
  } finally {globalThis.document=previous;}
});
