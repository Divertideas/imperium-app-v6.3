import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, empireName } from '../store/gameStore';

export default function VictoryPage() {
  const navigate = useNavigate();
  const winner = useGameStore(s => s.winnerEmpireId);
  const reset = useGameStore(s => s.resetGame);

  if (!winner) return null;

  return (
    <div className="page">
      <div className="card">
        <h2>Victoria</h2>
        <p><strong>Este Imperio gana la partida:</strong> {empireName(winner)}</p>
        <div className="row wrap">
          <button className="primary" onClick={() => { reset(); navigate('/'); }}>
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
