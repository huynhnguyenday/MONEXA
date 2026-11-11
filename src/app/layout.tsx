import type { Metadata, Viewport } from 'next';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { config } from '@fortawesome/fontawesome-svg-core';
import './globals.css';
import 'react-datepicker/dist/react-datepicker.css';
import './monexa.css';
import './workspace.css';
import './action-buttons.css';
import './mobile-tabs.css';
config.autoAddCss = false;
export const metadata: Metadata = {
  title: 'MONEXA · Tài chính cá nhân',
  description: 'Quản lý chi tiêu, danh mục và công nợ cá nhân.',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '64x64' },
      { url: '/monexa.webp', type: 'image/webp' },
    ],
    apple: '/apple-touch-icon.png',
  },
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'MONEXA', statusBarStyle: 'default' },
};
export const viewport: Viewport = { themeColor: '#dce5f1', colorScheme: 'light', viewportFit: 'cover' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
