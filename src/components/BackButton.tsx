import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Back button that returns to the previous screen when possible.
 * Falls back to /turn if the history stack is empty.
 */
export function BackButton(props: { fallback?: string; label?: string; beforeBack?: () => void }) {
  const navigate = useNavigate();
  const fallback = props.fallback ?? '/turn';
  const label = props.label ?? 'Volver';

  return (
    <button
      className="ghost"
      type="button"
      onClick={() => {
        props.beforeBack?.();
        if (window.history.length > 1) navigate(-1);
        else navigate(fallback);
      }}
    >
      {label}
    </button>
  );
}
