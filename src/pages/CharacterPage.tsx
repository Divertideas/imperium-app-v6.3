import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { useGameStore } from '../store/gameStore';
import type { CharacterLevel, CharacterType } from '../store/types';

const TYPES: CharacterType[] = ['General','Espía','Diplomático'];
const LEVELS: CharacterLevel[] = [1,2,3];

function allowedRange(t?: CharacterType): [number, number] | undefined {
  if (!t) return undefined;
  if (t === 'General') return [1, 6];
  if (t === 'Espía') return [7, 12];
  return [13, 18];
}

export default function CharacterPage() {
  const { charId } = useParams();
  const store = useGameStore();
  const ch = charId ? store.characters[charId] : undefined;
  const [msg, setMsg] = useState<string>('');

  if (!charId || !ch) {
    return (
      <div className="page">
        <p>Personaje no encontrado.</p>
        <BackButton />
      </div>
    );
  }

  const range = allowedRange(ch.type);

  const onHire = () => {
    const res = store.hireCharacter(charId);
    setMsg(res.ok ? 'Personaje contratado (se han restado créditos).' : res.reason);
  };

  return (
    <div className="page">
      <div className="card">
        <div className="row between">
          <h2>Ficha de personaje</h2>
          <BackButton />
        </div>

        <div className="grid two">
          <label className="field">
            <span>Tipo</span>
            <select value={ch.type ?? ''} onChange={(e) => store.saveCharacter(charId, { type: (e.target.value || undefined) as any })}>
              <option value="">(sin especificar)</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Nivel</span>
            <select value={ch.level ?? ''} onChange={(e) => store.saveCharacter(charId, { level: (e.target.value ? Number(e.target.value) : undefined) as any })}>
              <option value="">(sin especificar)</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Número</span>
            <input
              type="number"
              value={ch.number ?? ''}
              onChange={(e) => store.saveCharacter(charId, { number: e.target.value === '' ? undefined : Math.floor(Number(e.target.value)) })}
              min={range?.[0] ?? 1}
              max={range?.[1] ?? 18}
            />
            {range ? <small className="muted">Rango válido: {range[0]}–{range[1]}.</small> : <small className="muted">Selecciona un tipo para ver el rango válido.</small>}
          </label>

          <label className="field">
            <span>Coste (manual)</span>
            <input
              type="number"
              value={ch.cost ?? ''}
              onChange={(e) => store.saveCharacter(charId, { cost: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          </label>

          <label className="field span2">
            <span>Nota (manual)</span>
            <input value={ch.note ?? ''} onChange={(e) => store.saveCharacter(charId, { note: e.target.value })} />
          </label>
        </div>

        <div className="row wrap">
          <button className="primary" onClick={onHire}>Contratar (resta créditos)</button>
          <span className="muted small">Si un número ya está contratado, no puede elegirse.</span>
        </div>

        {ch.status === 'used' ? <p className="badge">USADO (disponible para volver a contratar)</p> : null}
        {msg ? <p className="notice">{msg}</p> : null}
      </div>
    </div>
  );
}
