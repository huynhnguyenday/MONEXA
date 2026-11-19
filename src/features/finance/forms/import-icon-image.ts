export async function importIconImage(file: File): Promise<string> {
  if (file.size > 1048576 || !/\.(svg|png)$/i.test(file.name))
    throw new Error('Chọn SVG hoặc PNG tối đa 1 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = bytes.length >= 8 && bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10';
  let blob: Blob;
  if (png) blob = new Blob([bytes], { type: 'image/png' });
  else {
    const text = new TextDecoder().decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('SVG không hỗ trợ DTD hoặc entity.');
    const document = new DOMParser().parseFromString(text, 'image/svg+xml');
    if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg')
      throw new Error('Tệp không phải SVG/PNG hợp lệ.');
    // Restrict imported SVG to vector artwork. Reject scripts, event handlers, URLs and foreign content.
    const allowed = new Set([
      'svg',
      'g',
      'path',
      'rect',
      'circle',
      'ellipse',
      'line',
      'polyline',
      'polygon',
      'title',
      'desc',
      'defs',
      'clippath',
      'mask',
    ]);
    for (const node of [
      document.documentElement,
      ...document.documentElement.querySelectorAll('*'),
    ]) {
      if (!allowed.has(node.localName.toLowerCase()))
        throw new Error('SVG chỉ hỗ trợ hình vector, không hỗ trợ script hoặc nội dung nhúng.');
      for (const attr of node.attributes)
        if (
          /^on|href|src/i.test(attr.name) ||
          (/url\s*\(|javascript:|https?:|data:/i.test(attr.value) && attr.name !== 'xmlns')
        )
          throw new Error('SVG có liên kết hoặc nội dung không được hỗ trợ.');
    }
    blob = new Blob([new XMLSerializer().serializeToString(document.documentElement)], {
      type: 'image/svg+xml',
    });
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Không đọc được ảnh icon.'));
      img.src = url;
    });
    if (
      !img.naturalWidth ||
      !img.naturalHeight ||
      img.naturalWidth > 8192 ||
      img.naturalHeight > 8192
    )
      throw new Error('Kích thước ảnh không hợp lệ.');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
    const scale = 120 / Math.max(img.naturalWidth, img.naturalHeight);
    const width = img.naturalWidth * scale,
      height = img.naturalHeight * scale;
    context.drawImage(img, (128 - width) / 2, (128 - height) / 2, width, height);
    const image = canvas.toDataURL('image/png');
    if (image.length > 44000) throw new Error('Ảnh quá phức tạp; hãy dùng icon đơn giản hơn.');
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}
