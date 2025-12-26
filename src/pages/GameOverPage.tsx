import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, empireName } from '../store/gameStore';

export default function GameOverPage() {
  const navigate = useNavigate();
  const msg = useGameStore((s) => s.gameOverMessage);
  const eliminated = useGameStore((s) => s.eliminatedEmpireId);
  const setup = useGameStore((s) => s.setup);
  const resetGame = useGameStore((s) => s.resetGame);
  const clearNotice = useGameStore((s) => s.clearNotice);
  const startTurn = useGameStore((s) => s.startTurnForCurrentEmpire);

  const playerId = setup?.playerEmpireId;
  const playerEliminated = Boolean(playerId && eliminated && eliminated === playerId);

  return (
    <div className="page">
      <h1>
        {playerEliminated
          ? 'Partida terminada'
          : eliminated
            ? `Imperio eliminado: ${empireName(eliminated)}`
            : 'Aviso'}
      </h1>
      <div className="card">
        <p style={{ marginTop: 0 }}>{msg ?? '—'}</p>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          {playerEliminated ? (
            <button
              className="primary"
              onClick={() => {
                resetGame();
                navigate('/', { replace: true });
              }}
            >
              Volver al menú
            </button>
          ) : (
            <button
              className="primary"
              onClick={() => {
                clearNotice();
                // Start production for the current empire (which is now the next valid empire)
                startTurn();
                navigate('/turn', { replace: true });
              }}
            >
              Continuar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
