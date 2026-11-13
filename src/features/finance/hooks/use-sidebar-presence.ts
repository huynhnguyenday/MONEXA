'use client';
import { useEffect, useState } from 'react';

export function useSidebarPresence(open: boolean) {
  const [visible, setVisible] = useState(open);
  useEffect(() => {
    if (open) {
      setVisible(true);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(false), 150);
    return () => clearTimeout(timer);
  }, [open]);
  return open || visible;
}
