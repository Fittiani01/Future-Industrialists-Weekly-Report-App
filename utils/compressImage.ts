export async function compressImage(
  file: File,
  maxWidth = 2048, 
  quality = 0.90
): Promise<File> {
  // 1. Skip SVGs entirely to preserve vector scaling and transparency.
  if (file.type === 'image/svg+xml') {
    return file;
  }

  // Ensure it's an image
  if (!file.type.startsWith("image/")) {
      throw new Error(`File ${file.name} is not a supported image type (${file.type})`);
  }

  // 2. Check for transparency support (PNG, WebP, GIF)
  const supportsTransparency = file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif";
  
  const url = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error(`Failed to load image: ${file.name}. The file may be corrupt.`));
      i.src = url;
    });

    // Calculate scale
    // If the image is smaller than maxWidth, don't upscale it, just keep it.
    let scale = 1;
    if (img.width > maxWidth) {
      scale = maxWidth / img.width;
    }
    
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");

    // Better smoothing for resizing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, w, h);

    const outType = supportsTransparency ? "image/png" : "image/jpeg";
    
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed (compression error)"))),
        outType,
        supportsTransparency ? undefined : quality
      );
    });

    const base = file.name.replace(/\.[^/.]+$/, "");
    const ext = supportsTransparency ? "png" : "jpg";
    const newName = `${base}.${ext}`;
    
    return new File([blob], newName, { type: outType });
  } catch (err) {
      throw err;
  } finally {
    URL.revokeObjectURL(url);
  }
}