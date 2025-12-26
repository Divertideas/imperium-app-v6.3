import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiceD6 } from '../components/DiceD6';
import { ShipSheet } from '../components/ShipSheet';
import { PlanetSheet } from '../components/PlanetSheet';
import { EMPIRES, useGameStore } from '../store/gameStore';
import type { EmpireId } from '../store/types';

function empireName(id: EmpireId) {
  return EMPIRES.find(e => e.id === id)?.name ?? id;
}

export default function CombatPlanetaryPage() {
  const navigate = useNavigate();
  const store = useGameStore();
  const current = store.getCurrentEmpire();
  const setup = store.setup;
  const player = setup?.playerEmpireId;
  const isPlayerTurn = Boolean(player && current === player);

  const [shipA, setShipA] = useState<string | ''>('');
  const [shipB, setShipB] = useState<string | ''>('');
  const [planetNumberInput, setPlanetNumberInput] = useState<string>('');
  const [planetId, setPlanetId] = useState<string | ''>('');
  const [msg, setMsg] = useState<string>('');

  // Player-only: characters that can be used in this combat.
  const [charPick, setCharPick] = useState<string>('');
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const usedCharRef = useRef<string[]>([]);
  useEffect(() => { usedCharRef.current = selectedCharIds; }, [selectedCharIds]);

  const hiredPlayerCharacters = useMemo(() => {
    if (!player) return [] as string[];
    return (store.empireCharacterSlots[player] ?? []).filter(Boolean) as string[];
  }, [player, store.empireCharacterSlots]);

  // When leaving the combat page (any navigation), consume the characters used in this combat.
  useEffect(() => {
    return () => {
      if (!isPlayerTurn) return;
      const ids = usedCharRef.current;
      if (!ids || ids.length === 0) return;
      for (const cid of ids) store.useCharacter(cid);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayerTurn]);

  const availableShips = useMemo(() => {
    if (!current) return [];
    const ids = (store.empireFleetSlots[current] ?? []).filter(Boolean) as string[];
    return ids
      .map(id => store.ships[id])
      .filter(s => s && !s.destroyed)
      .map(s => s.id);
  }, [current, store.empireFleetSlots, store.ships]);

  const resolvePlanet = (num: number) => {
    const existing = store.planetByNumber[num];
    if (existing) {
      setPlanetId(existing);
      setMsg('');
      return;
    }
    // create a free planet record in catalog for this number
    const pid = store.createPlanetForEmpire(current!);
    store.savePlanet(pid, { owner: 'free' });
    store.bindPlanetNumber(pid, num);
    setPlanetId(pid);
    setMsg('Planeta libre: introduce sus estadísticas.');
  };

  const onConquer = () => {
    if (!current) return;
    if (!planetId) { setMsg('Introduce el número de planeta.'); return; }
    const res = store.conquerPlanetToEmpire(planetId, current);
    setMsg(res.ok ? `Planeta conquistado por ${empireName(current)}.` : res.reason);
  };

  if (!current) {
    return (
      <div className="page">
        <p>No hay imperio activo.</p>
        <button className="ghost" onClick={() => navigate('/turn')}>Volver</button>
      </div>
    );
  }

  const planet = planetId ? store.planets[planetId] : undefined;
  const planetDestroyed = Boolean(planet?.destroyedPermanently) || planet?.owner === 'destroyed';

  return (
    <div className="page">
      <div className="card">
        <div className="row between">
          <h2>Combate planetario</h2>
          <button className="ghost" onClick={() => navigate('/turn')}>Volver</button>
        </div>

        <DiceD6 />

        {isPlayerTurn ? (
          <div className="subpanel">
            <h4>Personajes (solo jugador)</h4>
            <div className="grid two">
              <label className="field">
                <span>Selecciona personaje contratado</span>
                <select value={charPick} onChange={(e) => setCharPick(e.target.value)}>
                  <option value="">(ninguno)</option>
                  {hiredPlayerCharacters
                    .filter((cid) => !selectedCharIds.includes(cid))
                    .map((cid) => {
                      const ch = store.characters[cid];
                      const label = ch
                        ? `#${ch.number ?? '—'} ${ch.type ?? ''} N${ch.level ?? ''}`.trim()
                        : cid;
                      return (
                        <option key={cid} value={cid}>{label}</option>
                      );
                    })}
                </select>
              </label>

              <div className="field">
                <span>&nbsp;</span>
                <button
                  className="primary"
                  disabled={!charPick}
                  onClick={() => {
                    if (!charPick) return;
                    if (selectedCharIds.includes(charPick)) return;
                    setSelectedCharIds((prev) => [...prev, charPick]);
                    setCharPick('');
                  }}
                >
                  Usar en combate
                </button>
              </div>
            </div>

            {selectedCharIds.length > 0 ? (
              <div className="mini-card">
                <div className="row between">
                  <strong>Usados en este combate (se liberan al salir)</strong>
                  <button
                    className="ghost"
                    onClick={() => setSelectedCharIds([])}
                    title="Quitar selección (no consume personajes)"
                  >
                    Limpiar
                  </button>
                </div>
                <ul className="list">
                  {selectedCharIds.map((cid) => {
                    const ch = store.characters[cid];
                    return (
                      <li key={cid} className="row between">
                        <span>{ch ? `#${ch.number ?? '—'} ${ch.type ?? ''} N${ch.level ?? ''}` : cid}</span>
                        <button className="ghost" onClick={() => setSelectedCharIds((p) => p.filter((x) => x !== cid))}>Quitar</button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="muted small">Selecciona personajes y pulsa “Usar en combate”. Se eliminarán de tu ficha al salir de esta pantalla.</p>
            )}
          </div>
        ) : null}

        <div className="subpanel">
          <h4>Selecciona naves atacantes (imperio activo)</h4>
          <div className="grid two">
            <label className="field">
              <span>Nave 1</span>
              <select value={shipA} onChange={(e) => {
                const v = e.target.value;
                setShipA(v);
                if (v && v === shipB) setShipB('');
              }}>
                <option value="">(sin nave)</option>
                {availableShips.map(id => {
                  const sh = store.ships[id];
                  return <option key={id} value={id}>#{sh.number ?? '—'} {sh.type ? `(${sh.type})` : ''}</option>;
                })}
              </select>
            </label>

            <label className="field">
              <span>Nave 2</span>
              <select value={shipB} onChange={(e) => {
                const v = e.target.value;
                if (v && v === shipA) return;
                setShipB(v);
              }} disabled={availableShips.length < 2}>
                <option value="">(sin nave)</option>
                {availableShips.filter(id => id !== shipA).map(id => {
                  const sh = store.ships[id];
                  return <option key={id} value={id}>#{sh.number ?? '—'} {sh.type ? `(${sh.type})` : ''}</option>;
                })}
              </select>
            </label>
          </div>
        </div>

        <div className="grid two">
          <div>
            {shipA ? <ShipSheet shipId={shipA} mode="inline" /> : <div className="muted small">Selecciona Nave 1 para mostrar su ficha.</div>}
          </div>
          <div>
            {shipB ? <ShipSheet shipId={shipB} mode="inline" /> : <div className="muted small">Selecciona Nave 2 (opcional) para mostrar su ficha.</div>}
          </div>
        </div>

        <div className="subpanel">
          <h4>Planeta objetivo</h4>
          <label className="field">
            <span>Número de planeta</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="1-66"
              value={planetNumberInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                const clipped = raw.slice(0, 2);
                setPlanetNumberInput(clipped);
              }}
              onBlur={() => {
                if (!planetNumberInput) return;
                const num = Math.max(1, Math.min(66, parseInt(planetNumberInput, 10)));
                resolvePlanet(num);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
          </label>

          {planet ? (
            <div className="mini-card">
              <div className="row between">
                <strong>Planeta #{planet.number ?? '—'}</strong>
                <span className="muted small">Propietario: {planet.owner}</span>
              </div>
            </div>
          ) : (
            <p className="muted small">Introduce el número de planeta.</p>
          )}

          <div className="row wrap">
            <button className="primary" onClick={onConquer} disabled={!planetId || planetDestroyed}>
              Planeta conquistado
            </button>
            {planetDestroyed ? <span className="danger small">Planeta destruido: no se puede conquistar.</span> : null}
            <span className="muted small">La resolución del combate es manual; este botón solo cambia propietario si hay hueco.</span>
          </div>
        </div>

        {planetId ? (
          <div className="subpanel">
            <h4>Ficha del planeta objetivo</h4>
            <PlanetSheet planetId={planetId} mode="inline" />
          </div>
        ) : null}

        {msg ? <p className="notice">{msg}</p> : null}
      </div>
    </div>
  );
}
