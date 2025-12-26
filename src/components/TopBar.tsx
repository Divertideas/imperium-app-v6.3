import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EMPIRES, selectEmpireCounts, useGameStore } from '../store/gameStore';
import type { EmpireId } from '../store/types';

function empireName(id: EmpireId) {
  return EMPIRES.find(e => e.id === id)?.name ?? id;
}

export function TopBar() {
  const navigate = useNavigate();
  const state = useGameStore();
  const currentEmpire = state.getCurrentEmpire();
  const credits = currentEmpire ? state.credits[currentEmpire] ?? 0 : 0;
  const counts = currentEmpire ? selectEmpireCounts(state, currentEmpire) : { ships: 0, planets: 0 };

  if (!currentEmpire) return null;

  return (
    <div className="topbar">
      <div className="topbar-left">
        <strong>{empireName(currentEmpire)}</strong>
        <span className="muted">Turno {state.turnNumber}</span>
      </div>

      <div className="topbar-mid">
        <div className="credit-pill">
          <span className="label">Créditos</span>
          <button className="mini" onClick={() => state.incCredits(currentEmpire, -1)} aria-label="restar crédito">−</button>
          <span className="value">{credits}</span>
          <button className="mini" onClick={() => state.incCredits(currentEmpire, +1)} aria-label="sumar crédito">+</button>
        </div>
        <div className="stat-pill">
          <span className="label">Naves</span><span className="value">{counts.ships}</span>
        </div>
        <div className="stat-pill">
          <span className="label">Planetas</span><span className="value">{counts.planets}</span>
        </div>
      </div>

      <div className="topbar-right">
        <button className="ghost" onClick={() => navigate('/')}>Menú</button>
      </div>
    </div>
  );
}
