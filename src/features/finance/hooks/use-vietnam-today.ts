'use client';

import { useEffect, useState } from 'react';
import { localDate } from '../model';

/** Advance chart days at Vietnam midnight even if the finance revision is unchanged. */
export function useVietnamToday() {
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const update = () => setToday(localDate());
    update();
    const timer = setInterval(update, 20_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return today;
}
