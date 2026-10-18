import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { UI_SOUNDS, decodeCnea } from "../engine/js/audio.js";

test("engine UI sounds use a separate Uxxx namespace",()=>{
  assert.deepEqual(UI_SOUNDS,{
    start:"U001.dat",
    confirm:"U002.dat",
    cancel:"U003.dat"
  });
});


test("engine UI sound payloads are valid and non-truncated", async()=>{
  for (const file of Object.values(UI_SOUNDS)) {
    const data=await readFile(new URL(`../engine/audio/ui/${file}`,import.meta.url));
    const buffer=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
    const decoded=decodeCnea(buffer);
    assert.match(decoded.mimeType,/^audio\/(ogg|mpeg|wav)$/);
    assert.ok(decoded.payload.byteLength>1000,`${file} payload is unexpectedly small`);
  }
});
