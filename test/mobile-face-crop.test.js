import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("face crop uses the desktop close-up fallback scale",async()=>{
  const css=await readFile(new URL("../engine/css/main.css",import.meta.url),"utf8");
  assert.match(css,/#characters img\[data-crop="face"\]\{[^}]*top:var\(--char-face-top,-12vh\)[^}]*bottom:auto[^}]*max-width:none[^}]*height:var\(--char-face-height,170vh\)[^}]*\}/);
});

test("face crop has a mobile-specific fallback scale",async()=>{
  const css=await readFile(new URL("../engine/css/main.css",import.meta.url),"utf8");
  assert.match(css,/@media\(max-width:700px\)\{#characters img\[data-crop="face"\]\{top:var\(--char-face-top-mobile,-8vh\);height:var\(--char-face-height-mobile,155vh\)\}/);
});

test("crop presets are separate valid CSS rules",async()=>{
  const css=await readFile(new URL("../engine/css/main.css",import.meta.url),"utf8");
  assert.match(css,/#characters img\[data-crop="bust"\]\{[^}]*\}\s*#characters img\[data-crop="face"\]\{/);
});

test("mobile face crop override comes after the desktop face preset",async()=>{
  const css=await readFile(new URL("../engine/css/main.css",import.meta.url),"utf8");
  const desktop=css.indexOf('#characters img[data-crop="face"]{top:var(--char-face-top,-12vh)');
  const mobile=css.indexOf('@media(max-width:700px){#characters img[data-crop="face"]{top:var(--char-face-top-mobile,-8vh);height:var(--char-face-height-mobile,155vh)}');
  assert.notEqual(desktop,-1);
  assert.notEqual(mobile,-1);
  assert.ok(mobile>desktop);
});
