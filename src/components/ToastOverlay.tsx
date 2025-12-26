import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

// Small, non-blocking popup used mainly for "no credits" feedback.
export function ToastOverlay() {
  const message = useGameStore((s) => s.toastMessage);
  const nonce = useGameStore((s) => s.toastNonce);
  const showToast = useGameStore((s) => s.showToast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 1800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  if (!message) return null;
  return (
    <div className={`toast ${visible ? 'show' : ''}`} role="status" aria-live="polite">
      <div className="toast-inner">
        <div className="toast-text">{message}</div>
        <button className="toast-close" type="button" onClick={() => showToast('')}>×</button>
      </div>
    </div>
  );
}
