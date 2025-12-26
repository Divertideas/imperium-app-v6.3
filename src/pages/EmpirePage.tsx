import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DiceD6 } from '../components/DiceD6';
import { EMPIRES, useGameStore } from '../store/gameStore';
import type { EmpireId } from '../store/types';

function empireName(id: EmpireId) {
  return EMPIRES.find(e => e.id === id)?.name ?? id;
}

export default function EmpirePage() {
  const navigate = useNavigate();
  const s = useGameStore();
  const current = s.getCurrentEmpire();
  const setup = s.setup;

  if (!current || !setup) return null;

  const isPlayer = setup.playerEmpireId === current;

  const fleetSlots = s.empireFleetSlots[current] ?? [];
  const destroyedShipIds = s.empireDestroyedShipIds[current] ?? [];
  const planetSlots = s.empirePlanetSlots[current] ?? [];
  const characterSlots = s.empireCharacterSlots[setup.playerEmpireId] ?? [];

  const openOrCreateShip = (slotIndex: number) => {
    const shipId = fleetSlots[slotIndex];
    if (shipId) return navigate(`/ship/${shipId}`);
    const newId = s.createShipForEmpire(current);
    navigate(`/ship/${newId}`);
  };

  const openOrCreatePlanet = (slotIndex: number) => {
    const planetId = planetSlots[slotIndex];
    if (planetId) return navigate(`/planet/${planetId}`);
    const newId = s.createPlanetInSlot(current, slotIndex);
    navigate(`/planet/${newId}`);
  };

  const openOrCreateCharacter = (slotIndex: number) => {
    const charId = characterSlots[slotIndex];
    if (charId) return navigate(`/character/${charId}`);
    const newId = s.createCharacter();
    navigate(`/character/${newId}`);
  };

  return (
    <div className="page">
      <div className="sheet">
        <div className="sheet-header">
          <h2>{empireName(current)} — Mundo natal</h2>
          <DiceD6 />
        </div>

        <div className="sheet-grid">
          <section className="panel">
            <h3>Planetas conquistados</h3>
            <div className="grid slots">
              {planetSlots.map((pid, idx) => (
                <button
                  key={idx}
                  className={pid ? 'slot filled' : 'slot'}
                  onClick={() => pid ? navigate(`/planet/${pid}`) : openOrCreatePlanet(idx)}
                  type="button"
                >
                  {pid ? (s.planets[pid]?.number ?? '—') : '+'}
                </button>
              ))}
            </div>
            <p className="muted small">La primera casilla es el planeta natal.</p>
          </section>

          <section className="panel">
            <h3>Flota estelar</h3>
            <div className="grid slots">
              {fleetSlots.map((sid, idx) => (
                <button
                  key={idx}
                  className={sid ? 'slot filled' : 'slot'}
                  onClick={() => openOrCreateShip(idx)}
                  type="button"
                >
                  {sid ? (s.ships[sid]?.number ?? '—') : '+'}
                </button>
              ))}
            </div>

            <div className="subpanel">
              <h4>Naves destruidas</h4>
              {destroyedShipIds.length === 0 ? (
                <p className="muted small">No hay naves destruidas.</p>
              ) : (
                <div className="list">
                  {destroyedShipIds.map(id => {
                    const ship = s.ships[id];
                    if (!ship) return null;
                    return (
                      <button key={id} className="listitem" onClick={() => navigate(`/ship/${id}`)} type="button">
                        #{ship.number ?? '—'} {ship.type ? `(${ship.type})` : ''} — DESTRUIDA
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {isPlayer ? (
            <section className="panel">
              <h3>Personajes (solo jugador)</h3>
              <div className="grid slots">
                {characterSlots.map((cid, idx) => (
                  <button
                    key={idx}
                    className={cid ? 'slot filled' : 'slot'}
                    onClick={() => openOrCreateCharacter(idx)}
                    type="button"
                  >
                    {cid ? (s.characters[cid]?.number ?? '—') : '+'}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="panel">
              <h3>Personajes</h3>
              <p className="muted">Los imperios IA no usan personajes.</p>
            </section>
          )}

          <section className="panel">
            <h3>Acciones</h3>
            <div className="row wrap">
              <button className="primary" onClick={() => navigate('/combat/planetary')}>Combate planetario</button>
              <button className="primary" onClick={() => navigate('/combat/fleets')} disabled={!isPlayer}>Combate entre flotas</button>
              <button className="ghost" onClick={() => s.endTurn()}>Fin del turno</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
