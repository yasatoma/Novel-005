import { readFile, access } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseScenario } from "../engine/js/parser.js";
import { validateScenario } from "../engine/js/validator.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async path => JSON.parse(await readFile(join(root, path), "utf8"));
const config = await readJson("content/config.json");
const assets = await readJson("content/data/assets.json");
const memos = await readJson("content/data/memo.json");
const endings = await readJson("content/data/endings.json");
await readJson("content/data/ruby.json");
if (config.engineVersion !== "1.0") throw new Error("engineVersion must be 1.0");
const source = await readFile(join(root, "content", config.entryScenario), "utf8");
const commands = parseScenario(source, config.entryScenario);
validateScenario(commands, { assets, memos, endings });
if (commands.some(c => c.type === "ambient")) throw new Error("@ambient is forbidden");
const files = [];
for (const value of Object.values(assets.backgrounds)) {
  const variants = typeof value === "string" ? { base: value } : value.variants;
  for (const file of Object.values(variants)) files.push(join("content/images/bg", file));
}
for (const value of Object.values(assets.characters))
  for (const file of Object.values(value.expressions))
    files.push(join("content/images/char", file));
for (const file of assets.audio.bgm) files.push(join("content/audio/bgm", file));
for (const file of assets.audio.se) files.push(join("content/audio/se", file));
if (config.titleImage) files.push(join("content/images/title", config.titleImage));
for (const file of files) await access(join(root, file));
const count = type => commands.filter(c => c.type === type).length;
if (count("chapter") !== 46) throw new Error("Expected 23 chapters");
if (count("ending") !== 1) throw new Error("Expected one ending");
console.log(JSON.stringify({
  chapters: count("chapter") / 2,
  text: count("text"),
  backgrounds: Object.keys(assets.backgrounds).length,
  characters: Object.keys(assets.characters).length,
  bgm: assets.audio.bgm.length,
  se: assets.audio.se.length,
  files: files.length,
  commands: commands.length
}, null, 2));
