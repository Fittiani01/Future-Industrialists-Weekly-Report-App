export async function compressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.75
): Promise<File> {
  // 1. Skip SVGs entirely to preserve vector scaling and transparency.
  if (file.type === 'image/svg+xml') {
    return file;
  }

  if (!file.type.startsWith("image/")) throw new Error("Not an image");

  // 2. Check for transparency support (PNG, WebP, GIF)
  // If the source is transparent, we must output PNG to keep it transparent.
  // Converting transparent WebP/GIF to JPEG creates black backgrounds.
  const supportsTransparency = file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif";
  
  const url = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });

    const scale = Math.min(1, maxWidth / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");

    ctx.drawImage(img, 0, 0, w, h);

    // If original supported transparency, output PNG. Otherwise JPEG.
    const outType = supportsTransparency ? "image/png" : "image/jpeg";
    
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
        outType,
        supportsTransparency ? undefined : quality
      );
    });

    const base = file.name.replace(/\.[^/.]+$/, "");
    const ext = supportsTransparency ? "png" : "jpg";
    const newName = `${base}.${ext}`;
    
    return new File([blob], newName, { type: outType });
  } finally {
    URL.revokeObjectURL(url);
  }
}