import React, { useEffect, useState } from 'react';
import { playTone } from './sound';

export type ToastTone = 'info' | 'good' | 'warn' | 'bad';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const EVENT = 'f1cs:toast';
let counter = 0;

/** Fire a message from anywhere in the UI; the Toaster in App renders it. */
export function toast(message: string, tone: ToastTone = 'info'): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastItem>(EVENT, { detail: { id: ++counter, message, tone } }));
  playTone(tone === 'bad' ? 'alert' : tone === 'good' ? 'success' : 'click');
}

export function Toaster(): React.ReactElement {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastItem>).detail;
      setItems((current) => [...current.slice(-2), detail]);
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== detail.id));
      }, 3200);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`toast toast-${item.tone}`}>
          <span className="toast-mark" aria-hidden>
            {item.tone === 'good' ? '✓' : item.tone === 'bad' ? '!' : item.tone === 'warn' ? '△' : 'i'}
          </span>
          {item.message}
        </div>
      ))}
    </div>
  );
}
