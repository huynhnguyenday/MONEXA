import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'MONEXA · Tài chính cá nhân', short_name: 'MONEXA', lang: 'vi',
    description: 'Quản lý chi tiêu, công nợ và nhận thông báo nhắc hạn.',
    start_url: '/overview', scope: '/', display: 'standalone',
    background_color: '#dce5f1', theme_color: '#dce5f1',
    icons: [
      { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
