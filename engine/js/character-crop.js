export function calculateFaceCropPresentation(bounds, desktopVisibleVh = 220, mobileVisibleVh = 180) {
  const top = Number(bounds?.top ?? 0);
  const height = Number(bounds?.height ?? 1);
  const safeHeight = Number.isFinite(height) && height > 0 ? Math.min(1, height) : 1;
  const safeTop = Number.isFinite(top) ? Math.max(0, Math.min(1 - safeHeight, top)) : 0;
  const build = (visibleVh, visibleTopVh) => {
    const imageHeightVh = visibleVh / safeHeight;
    const imageTopVh = visibleTopVh - safeTop * imageHeightVh;
    return { imageHeightVh, imageTopVh };
  };
  return {
    desktop: build(desktopVisibleVh, 2),
    mobile: build(mobileVisibleVh, 4)
  };
}

export function measureAlphaBounds(image, sampleSize = 256, threshold = 8) {
  if (!image?.naturalWidth || !image?.naturalHeight || typeof document === "undefined") return null;
  const scale = Math.min(1, sampleSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] <= threshold) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return {
    left: minX / width,
    top: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height
  };
}
