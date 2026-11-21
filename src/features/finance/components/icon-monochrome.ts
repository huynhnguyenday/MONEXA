const checks = new Map<string, Promise<boolean>>();

// Inspect the saved PNG too, so existing uploads work without changing stored data.
export function isMonochromeIcon(source: string): Promise<boolean> {
  const cached = checks.get(source);
  if (cached) return cached;
  const check = new Promise<boolean>((resolve) => {
    const image = new Image();
    image.onerror = () => resolve(false);
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) return resolve(false);
        context.drawImage(image, 0, 0);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let reference: number[] | undefined;
        for (let i = 0; i < data.length; i += 4) {
          // Ignore nearly transparent antialiasing pixels.
          if (data[i + 3] < 64) continue;
          const rgb = [data[i], data[i + 1], data[i + 2]];
          if (!reference) reference = rgb;
          else if (rgb.some((value, channel) => Math.abs(value - reference![channel]) > 20))
            return resolve(false);
        }
        resolve(Boolean(reference));
      } catch {
        resolve(false);
      }
    };
    image.src = source;
  });
  checks.set(source, check);
  return check;
}
