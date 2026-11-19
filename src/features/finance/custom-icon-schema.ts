import { z } from 'zod';

// Uploaded SVG/PNG is rasterized by the client; only bounded PNG images enter snapshots.
export const iconImageSchema = z
  .string()
  .max(44000)
  .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/)
  .refine((value) => {
    try {
      const encoded = value.slice('data:image/png;base64,'.length);
      const raw = typeof atob === 'function' ? atob(encoded) : '';
      if (
        raw.length < 33 ||
        raw.length > 32768 ||
        raw.slice(0, 8) !== '\x89PNG\r\n\x1a\n' ||
        raw.slice(12, 16) !== 'IHDR'
      )
        return false;
      const integer = (offset: number) =>
        [0, 1, 2, 3].reduce((sum, i) => sum * 256 + raw.charCodeAt(offset + i), 0);
      const width = integer(16),
        height = integer(20);
      return (
        width > 0 && height > 0 && width <= 128 && height <= 128 && raw.slice(-8, -4) === 'IEND'
      );
    } catch {
      return false;
    }
  }, 'Ảnh icon phải là PNG hợp lệ tối đa 128×128, 32 KB.');

export const customIconSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/),
  userId: z.literal('personal').default('personal'),
  name: z.string().trim().min(1).max(50),
  image: iconImageSchema,
});
export type CustomIcon = z.infer<typeof customIconSchema>;
