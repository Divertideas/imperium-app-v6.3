import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EMPIRES, useGameStore } from '../store/gameStore';
import type { EmpireId } from '../store/types';

export default function HomePage() {
  const navigate = useNavigate();
  const newGame = useGameStore(s => s.newGame);
  const resetGame = useGameStore(s => s.resetGame);
  const setup = useGameStore(s => s.setup);

  const [player, setPlayer] = useState<EmpireId>('primus');
  const [rivals, setRivals] = useState<EmpireId[]>(['xilnah']);
  const [planetsToConquer, setPlanetsToConquer] = useState<number>(8);

  const rivalOptions = useMemo(() => EMPIRES.map(e => e.id).filter(id => id !== player), [player]);

  return (
    <div className="page">
      <h1>Imperium — Hoja de registro</h1>
      <p className="muted">
        Esta app es un complemento del librojuego. La mayoría de datos se registran manualmente.
      </p>

      {setup ? (
        <div className="card">
          <h2>Continuar partida</h2>
          <div className="row">
            <button className="primary" onClick={() => navigate('/turn')}>Continuar</button>
            <button className="danger" onClick={() => { if (confirm('¿Borrar la partida guardada?')) resetGame(); }}>Borrar partida</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>Nueva partida</h2>

          <label className="field">
            <span>Tu imperio</span>
            <select value={player} onChange={(e) => {
              const id = e.target.value as EmpireId;
              setPlayer(id);
              setRivals(r => r.filter(x => x !== id));
            }}>
              {EMPIRES.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Imperios rivales (selección libre)</span>
            <div className="chips">
              {rivalOptions.map(id => {
                const e = EMPIRES.find(x => x.id === id)!;
                const on = rivals.includes(id);
                return (
                  <button
                    key={id}
                    className={on ? 'chip on' : 'chip'}
                    onClick={() => {
                      setRivals(prev => on ? prev.filter(x => x !== id) : [...prev, id]);
                    }}
                    type="button"
                  >
                    {e.name}
                  </button>
                );
              })}
            </div>
          </label>

          <label className="field">
            <span>Dificultad (planetas a conquistar)</span>
            <input
              type="number"
              min={1}
              value={planetsToConquer}
              onChange={(e) => setPlanetsToConquer(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
            />
            <small className="muted">La dificultad depende del número de planetas a conquistar, no del nº de imperios.</small>
          </label>

          <div className="row">
            <button
              className="primary"
              onClick={() => {
                newGame({ playerEmpireId: player, rivalEmpireIds: rivals, planetsToConquer });
                navigate('/turn');
              }}
              disabled={rivals.length === 0}
            >
              Empezar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
