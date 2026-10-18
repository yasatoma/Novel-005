import test from "node:test";
import assert from "node:assert/strict";
import { calculateCharacterPositionOffset, calculateFaceCropPresentation } from "../engine/js/character-crop.js";

test("face crop compensates transparent padding and anchors the face for close-up presentation",()=>{
  const bounds={left:385/2000,top:1026/3000,width:(1614-385+1)/2000,height:(2999-1026+1)/3000};
  const p=calculateFaceCropPresentation(bounds);
  const desktopVisibleTop=p.desktop.imageTopVh+bounds.top*p.desktop.imageHeightVh;
  const desktopVisibleHeight=bounds.height*p.desktop.imageHeightVh;
  const desktopFaceCenter=desktopVisibleTop+desktopVisibleHeight*0.14;
  const mobileVisibleTop=p.mobile.imageTopVh+bounds.top*p.mobile.imageHeightVh;
  const mobileVisibleHeight=bounds.height*p.mobile.imageHeightVh;
  const mobileFaceCenter=mobileVisibleTop+mobileVisibleHeight*0.14;

  assert.ok(Math.abs(desktopVisibleHeight-300)<1e-9);
  assert.ok(Math.abs(desktopFaceCenter-55)<1e-9);
  assert.ok(Math.abs(mobileVisibleHeight-250)<1e-9);
  assert.ok(Math.abs(mobileFaceCenter-55)<1e-9);
});

test("face crop remains stable for images without transparent padding",()=>{
  const p=calculateFaceCropPresentation({top:0,height:1});
  assert.ok(Math.abs(p.desktop.imageHeightVh-300)<1e-9);
  assert.ok(Math.abs(p.desktop.imageTopVh-13)<1e-9);
  assert.ok(Math.abs(p.mobile.imageHeightVh-250)<1e-9);
  assert.ok(Math.abs(p.mobile.imageTopVh-20)<1e-9);
});

test("character position offsets compensate transparent horizontal padding",()=>{
  const bounds={left:0.2,width:0.6};
  assert.ok(Math.abs(calculateCharacterPositionOffset(bounds,"left")+20)<1e-9);
  assert.ok(Math.abs(calculateCharacterPositionOffset(bounds,"center"))<1e-9);
  assert.ok(Math.abs(calculateCharacterPositionOffset(bounds,"right")-20)<1e-9);
});

test("center position compensates asymmetric alpha bounds",()=>{
  const bounds={left:0.1,width:0.6};
  assert.ok(Math.abs(calculateCharacterPositionOffset(bounds,"center")-10)<1e-9);
});
