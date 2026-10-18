import test from "node:test";
import assert from "node:assert/strict";
import { calculateFaceCropPresentation } from "../engine/js/character-crop.js";

test("face crop compensates transparent padding and anchors the face near the upper third",()=>{
  const bounds={left:385/2000,top:1026/3000,width:(1614-385+1)/2000,height:(2999-1026+1)/3000};
  const p=calculateFaceCropPresentation(bounds);
  const desktopVisibleTop=p.desktop.imageTopVh+bounds.top*p.desktop.imageHeightVh;
  const desktopVisibleHeight=bounds.height*p.desktop.imageHeightVh;
  const desktopFaceCenter=desktopVisibleTop+desktopVisibleHeight*0.14;
  const mobileVisibleTop=p.mobile.imageTopVh+bounds.top*p.mobile.imageHeightVh;
  const mobileVisibleHeight=bounds.height*p.mobile.imageHeightVh;
  const mobileFaceCenter=mobileVisibleTop+mobileVisibleHeight*0.14;

  assert.ok(Math.abs(desktopVisibleHeight-170)<1e-9);
  assert.ok(Math.abs(desktopFaceCenter-34)<1e-9);
  assert.ok(Math.abs(mobileVisibleHeight-155)<1e-9);
  assert.ok(Math.abs(mobileFaceCenter-30)<1e-9);
});

test("face crop remains stable for images without transparent padding",()=>{
  const p=calculateFaceCropPresentation({top:0,height:1});
  assert.ok(Math.abs(p.desktop.imageHeightVh-170)<1e-9);
  assert.ok(Math.abs(p.desktop.imageTopVh-10.2)<1e-9);
  assert.ok(Math.abs(p.mobile.imageHeightVh-155)<1e-9);
  assert.ok(Math.abs(p.mobile.imageTopVh-8.3)<1e-9);
});
