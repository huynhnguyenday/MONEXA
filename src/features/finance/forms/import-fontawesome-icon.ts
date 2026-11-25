import { importIconImage } from './import-icon-image';

// Read a class reference only. Never insert or execute the pasted markup.
export function parseFontAwesomeHtml(html: string) {
  if (html.length > 500) throw new Error('Mã Font Awesome tối đa 500 ký tự.');
  const match = html.match(/^\s*<i\s+class\s*=\s*(["'])([a-z0-9\s-]+)\1\s*>\s*<\/i>\s*$/i);
  if (!match)
    throw new Error('Dán một thẻ <i class="fa-solid fa-gas-pump"></i>, chỉ có thuộc tính class.');
  const classes = match[2].trim().split(/\s+/);
  const solid = classes.includes('fa-solid') || classes.includes('fas');
  const brands = classes.includes('fa-brands') || classes.includes('fab');
  if (solid === brands)
    throw new Error('Hỗ trợ Font Awesome Free Solid/Brands. Với kiểu khác, hãy tải tệp SVG.');
  const names = classes.filter(
    (c) => !['fa-solid', 'fas', 'fa-brands', 'fab', 'fa-classic'].includes(c),
  );
  if (names.length !== 1 || !/^fa-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(names[0]))
    throw new Error('Mã cần có đúng một tên icon, ví dụ fa-gas-pump; bỏ các class trang trí.');
  return { style: solid ? ('solid' as const) : ('brands' as const), name: names[0].slice(3) };
}

export async function importFontAwesomeIcon(html: string) {
  const reference = parseFontAwesomeHtml(html);
  // Load the installed free pack only when this input method is used.
  const pack =
    reference.style === 'solid'
      ? (await import('@fortawesome/free-solid-svg-icons')).fas
      : (await import('@fortawesome/free-brands-svg-icons')).fab;
  const definition = Object.values(pack).find(
    (icon) => icon.iconName === reference.name || icon.icon[2].includes(reference.name),
  );
  if (!definition)
    throw new Error('Icon chưa có trong bộ Free của ứng dụng. Hãy dùng tệp SVG của icon.');
  const [width, height, , , paths] = definition.icon;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${(Array.isArray(paths) ? paths : [paths]).map((d) => `<path fill="#000000" d="${d}"/>`).join('')}</svg>`;
  const image = await importIconImage(
    new File([svg], `${reference.name}.svg`, { type: 'image/svg+xml' }),
  );
  return { image, name: reference.name.replace(/-/g, ' ') };
}
