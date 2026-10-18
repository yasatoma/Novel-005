import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("face crop uses the tuned desktop close-up fallback scale",async()=>{
  const css=await readFile(new URL("../engine/css/main.css",import.meta.url),"utf8");
  assert.match(css,/#characters img\[data-crop="face"\]\{[^}]*top:var\(--char-face-top,-12vh\)[^}]*bottom:auto[^}]*max-width:none[^}]*height:var\(--char-face-height,195vh\)[^}]*\}/);
});

test("face crop has the tuned mobile fallback scale",async()=>{
  const css=await readFile(new URL("../engine/css/main.css",import.meta.url),"utf8");
  assert.match(css,/@media\(max-width:700px\)\{[^}]*#characters img\[data-crop="face"\]\{top:var\(--char-face-top-mobile,-8vh\);height:var\(--char-face-height-mobile,175vh\)\}/);
});

test("bust crop uses the tuned large presentation on desktop and mobile",async()=>{
  const css=await readFile(new URL("../engine/css/main.css",import.meta.url),"utf8");
  assert.match(css,/#characters img\[data-crop="bust"\]\{top:auto;bottom:-30vh;max-height:140vh;max-width:none;height:auto\}/);
  assert.match(css,/@media\(max-width:700px\)\{#characters img\[data-crop="bust"\]\{bottom:-30vh;max-height:140vh;max-width:none;width:auto;height:auto\}/);
});

test("character positions apply alpha-bound horizontal compensation",async()=>{
  const css=await readFile(new URL("../engine/css/main.css",import.meta.url),"utf8");
  assert.match(css,/data-position="left"\]\{left:3%;transform:translateX\(var\(--char-position-offset-x,0%\)\)/);
  assert.match(css,/data-position="center"\]\{left:50%;transform:translateX\(calc\(-50% \+ var\(--char-position-offset-x,0%\)\)\)/);
  assert.match(css,/data-position="right"\]\{right:3%;transform:translateX\(var\(--char-position-offset-x,0%\)\)/);
});
