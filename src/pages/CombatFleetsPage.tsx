import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { DiceD6 } from '../components/DiceD6';
import { ShipSheet } from '../components/ShipSheet';
import { EMPIRES, useGameStore } from '../store/gameStore';
import type { EmpireId } from '../store/types';

function empireName(id: EmpireId) {
  return EMPIRES.find(e => e.id === id)?.name ?? id;
}

function shipPower(ship: any) {
  const cost = ship.cost ?? 0;
  if (cost > 0) return cost;
  const a = ship.atkBase ?? 0;
  const d = ship.defBase ?? 0;
  return a + d;
}

export default function CombatFleetsPage() {
  const navigate = useNavigate();
  const store = useGameStore();
  const setup = store.setup;
  const current = store.getCurrentEmpire();

  const [myA, setMyA] = useState<string | ''>('');
  const [myB, setMyB] = useState<string | ''>('');
  const [targetEmpire, setTargetEmpire] = useState<EmpireId>('xilnah');
  const [theirA, setTheirA] = useState<string | ''>('');
  const [theirB, setTheirB] = useState<string | ''>('');
  const [spaceField, setSpaceField] = useState<number | ''>('');
  const [msg, setMsg] = useState<string>('');

  // Player-only: characters can be used in combat, then are consumed when leaving this combat screen.
  const [charPick, setCharPick] = useState<string>('');
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const usedCharRef = useRef<string[]>([]);
  useEffect(() => { usedCharRef.current = selectedCharIds; }, [selectedCharIds]);

  if (!setup || !current) return null;
  const player = setup.playerEmpireId;
  const isPlayerTurn = current === player;

  const hiredPlayerCharacters = useMemo(() => {
    return (store.empireCharacterSlots[player] ?? []).filter(Boolean) as string[];
  }, [player, store.empireCharacterSlots]);

  // Consume selected characters when leaving this combat screen.
  useEffect(() => {
    return () => {
      if (!isPlayerTurn) return;
      const ids = usedCharRef.current;
      if (!ids || ids.length === 0) return;
      for (const cid of ids) store.useCharacter(cid);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayerTurn]);

  const playerShips = useMemo(() => {
    const ids = (store.empireFleetSlots[player] ?? []).filter(Boolean) as string[];
    return ids.map(id => store.ships[id]).filter(s => s && !s.destroyed).map(s => s.id);
  }, [player, store.empireFleetSlots, store.ships]);

  const targetOptions = useMemo(() => {
    const ids = setup.rivalEmpireIds;
    return ids;
  }, [setup]);

  const targetShipsSorted = useMemo(() => {
    const ids = (store.empireFleetSlots[targetEmpire] ?? []).filter(Boolean) as string[];
    return ids
      .map(id => store.ships[id])
      .filter(s => s && !s.destroyed)
      .sort((a, b) => shipPower(b) - shipPower(a))
      .map(s => s.id);
  }, [targetEmpire, store.empireFleetSlots, store.ships]);

  const isShipDefeated = (id: string | '') => {
    if (!id) return true;
    const sh = store.ships[id];
    return !sh || sh.destroyed;
  };

  const playerSelected = [myA, myB].filter(Boolean) as string[];
  const targetSelected = [theirA, theirB].filter(Boolean) as string[];

  // La condición de fin se basa en las naves SELECCIONADAS para este combate.
  // Si una parte ha seleccionado 1 o 2 naves, se considera derrotada cuando TODAS esas naves están destruidas.
  const playerDefeated = playerSelected.length > 0 && playerSelected.every((id) => isShipDefeated(id));
  const targetDefeated = targetSelected.length > 0 && targetSelected.every((id) => isShipDefeated(id));

  const showFinished = playerDefeated || targetDefeated;
  const winner = playerDefeated && targetDefeated
    ? 'Empate (ambas partes sin naves activas)'
    : playerDefeated
      ? empireName(targetEmpire)
      : empireName(player);

  return (
    <div className="page">
      <div className="card">
        <div className="row between">
          <h2>Combate entre flotas</h2>
          <BackButton />
        </div>

        {!isPlayerTurn ? (
          <div className="notice">
            Este combate solo está disponible en el turno del jugador humano.
            <div className="row" style={{ marginTop: 8 }}><BackButton /></div>
          </div>
        ) : (
          <>
            <DiceD6 />

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
                        const label = ch ? `#${ch.number ?? '—'} ${ch.type ?? ''} N${ch.level ?? ''}`.trim() : cid;
                        return <option key={cid} value={cid}>{label}</option>;
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
                    <button className="ghost" onClick={() => setSelectedCharIds([])} title="Quitar selección (no consume personajes)">Limpiar</button>
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

        <div className="subpanel">
          <h4>Campo espacial (recordatorio)</h4>
          <label className="field">
            <span>Número de campo espacial</span>
            <input type="number" value={spaceField} onChange={(e) => setSpaceField(e.target.value === '' ? '' : Math.floor(Number(e.target.value)))} />
            <small className="muted">Consulta los efectos en el librojuego.</small>
          </label>
        </div>

        <div className="subpanel">
          <h4>Selecciona naves del jugador</h4>
          <div className="grid two">
            <label className="field">
              <span>Nave 1</span>
              <select value={myA} onChange={(e) => {
                const v = e.target.value;
                setMyA(v);
                if (v && v === myB) setMyB('');
              }}>
                <option value="">(sin nave)</option>
                {playerShips.map(id => {
                  const sh = store.ships[id];
                  return <option key={id} value={id}>#{sh.number ?? '—'} {sh.type ? `(${sh.type})` : ''}</option>;
                })}
              </select>
            </label>
            <label className="field">
              <span>Nave 2</span>
              <select value={myB} onChange={(e) => {
                const v = e.target.value;
                if (v && v === myA) return;
                setMyB(v);
              }} disabled={playerShips.length < 2}>
                <option value="">(sin nave)</option>
                {playerShips.filter(id => id !== myA).map(id => {
                  const sh = store.ships[id];
                  return <option key={id} value={id}>#{sh.number ?? '—'} {sh.type ? `(${sh.type})` : ''}</option>;
                })}
              </select>
            </label>
          </div>
          <div className="row wrap">
            {myA ? <button className="ghost" onClick={() => navigate(`/ship/${myA}`)}>Ver ficha nave 1</button> : null}
            {myB ? <button className="ghost" onClick={() => navigate(`/ship/${myB}`)}>Ver ficha nave 2</button> : null}
          </div>
        </div>

        <div className="subpanel">
          <h4>Fichas del jugador (en esta pantalla)</h4>
          <div className="grid two">
            <div>
              {myA ? <ShipSheet shipId={myA} mode="inline" /> : <div className="muted small">Selecciona Nave 1.</div>}
            </div>
            <div>
              {myB ? <ShipSheet shipId={myB} mode="inline" /> : <div className="muted small">Selecciona Nave 2 (opcional).</div>}
            </div>
          </div>
        </div>

        

        <div className="subpanel">
          <h4>Imperio atacado</h4>
          <label className="field">
            <span>Selecciona imperio</span>
            <select value={targetEmpire} onChange={(e) => { setTargetEmpire(e.target.value as EmpireId); setTheirA(''); setTheirB(''); }}>
              {targetOptions.map(id => <option key={id} value={id}>{empireName(id)}</option>)}
            </select>
          </label>

          <div className="grid two">
            <label className="field">
              <span>Nave rival 1 (ordenadas por potencia)</span>
              <select value={theirA} onChange={(e) => {
                const v = e.target.value;
                setTheirA(v);
                if (v && v === theirB) setTheirB('');
              }}>
                <option value="">(sin nave)</option>
                {targetShipsSorted.map(id => {
                  const sh = store.ships[id];
                  return <option key={id} value={id}>#{sh.number ?? '—'} {sh.type ? `(${sh.type})` : ''}</option>;
                })}
              </select>
            </label>
            <label className="field">
              <span>Nave rival 2</span>
              <select value={theirB} onChange={(e) => {
                const v = e.target.value;
                if (v && v === theirA) return;
                setTheirB(v);
              }} disabled={targetShipsSorted.length < 2}>
                <option value="">(sin nave)</option>
                {targetShipsSorted.filter(id => id !== theirA).map(id => {
                  const sh = store.ships[id];
                  return <option key={id} value={id}>#{sh.number ?? '—'} {sh.type ? `(${sh.type})` : ''}</option>;
                })}
              </select>
            </label>
          </div>

          <div className="row wrap">
            {theirA ? <button className="ghost" onClick={() => navigate(`/ship/${theirA}`)}>Ver ficha nave rival 1</button> : null}
            {theirB ? <button className="ghost" onClick={() => navigate(`/ship/${theirB}`)}>Ver ficha nave rival 2</button> : null}
          </div>
        </div>

        <div className="subpanel">
          <h4>Fichas del rival (en esta pantalla)</h4>
          <div className="grid two">
            <div>
              {theirA ? <ShipSheet shipId={theirA} mode="inline" /> : <div className="muted small">Selecciona Nave rival 1.</div>}
            </div>
            <div>
              {theirB ? <ShipSheet shipId={theirB} mode="inline" /> : <div className="muted small">Selecciona Nave rival 2 (opcional).</div>}
            </div>
          </div>
        </div>

        {showFinished ? (
          <div className="subpanel">
            <h4>Combate finalizado</h4>
            <p><strong>Gana:</strong> {winner}</p>
            <div className="row">
              <BackButton />
            </div>
          </div>
        ) : null}

            {msg ? <p className="notice">{msg}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
