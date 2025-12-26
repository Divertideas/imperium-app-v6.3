import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EMPIRES, useGameStore } from '../store/gameStore';
import type { EmpireId, ShipType } from '../store/types';

const SHIP_TYPES: ShipType[] = ['Fragata','Cañonero','Crucero','Destructor','Nave de apoyo','Nave capital'];

function empireName(id: EmpireId) {
  return EMPIRES.find(e => e.id === id)?.name ?? id;
}

function NumberField(props: { label: string; value?: number; onChange: (v?: number) => void; min?: number; }) {
  const { label, value, onChange, min } = props;
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={min ?? 0}
        value={value ?? ''}
        onChange={(e) => {
          const t = e.target.value;
          onChange(t === '' ? undefined : Number(t));
        }}
      />
    </label>
  );
}

function UpgradeTrack(props: {
  title: string;
  track: { attackNodes: number; defenseNodes: number; attackBonusNote: string; defenseBonusNote: string };
  onChange: (patch: Partial<typeof props.track>) => void;
  onSpendOneCredit: () => boolean;
}) {
  const { title, track, onChange, onSpendOneCredit } = props;
  return (
    <div className="subpanel">
      <h4>{title}</h4>

      <div className="grid two">
        <div className="mini-card">
          <strong>Ataque — nodos</strong>
          <div className="row">
            <button type="button" className="mini" onClick={() => onChange({ attackNodes: Math.max(0, track.attackNodes - 1) })}>−</button>
            <span className="value">{track.attackNodes}</span>
            <button
              type="button"
              className="mini"
              onClick={() => {
                if (!onSpendOneCredit()) return;
                onChange({ attackNodes: track.attackNodes + 1 });
              }}
            >
              +
            </button>
          </div>
        </div>

        <div className="mini-card">
          <strong>Defensa — nodos</strong>
          <div className="row">
            <button type="button" className="mini" onClick={() => onChange({ defenseNodes: Math.max(0, track.defenseNodes - 1) })}>−</button>
            <span className="value">{track.defenseNodes}</span>
            <button
              type="button"
              className="mini"
              onClick={() => {
                if (!onSpendOneCredit()) return;
                onChange({ defenseNodes: track.defenseNodes + 1 });
              }}
            >
              +
            </button>
          </div>
        </div>

        <label className="field">
          <span>Ataque — bonus aplicado (nota)</span>
          <input value={track.attackBonusNote} onChange={(e) => onChange({ attackBonusNote: e.target.value })} />
        </label>

        <label className="field">
          <span>Defensa — bonus aplicado (nota)</span>
          <input value={track.defenseBonusNote} onChange={(e) => onChange({ defenseBonusNote: e.target.value })} />
        </label>
      </div>
    </div>
  );
}

export function ShipSheet(props: {
  shipId: string;
  mode?: 'full' | 'combat' | 'inline';
}) {
  const { shipId, mode = 'full' } = props;
  const compact = mode === 'combat' || mode === 'inline';
  const navigate = useNavigate();
  const store = useGameStore();
  const ship = store.ships[shipId];
  const [msg, setMsg] = useState<string>('');
  const [recoverTo, setRecoverTo] = useState<EmpireId>('primus');

  const isInAnyFleetSlot = useMemo(() => {
    for (const emp of EMPIRES) {
      if ((store.empireFleetSlots[emp.id] ?? []).includes(shipId)) return true;
    }
    return false;
  }, [shipId, store.empireFleetSlots]);

  if (!ship) return null;

  const spendOneCredit = () => {
    const emp = ship.owner;
    const c = store.credits[emp] ?? 0;
    if (c < 1) {
      setMsg('No hay créditos suficientes para activar un nodo.');
      store.showToast('No tienes créditos suficientes');
      return false;
    }
    store.incCredits(emp, -1);
    setMsg('');
    return true;
  };

  const onBuy = () => {
    const res = store.buyShip(shipId);
    setMsg(res.ok ? 'Nave comprada y asignada a la flota.' : res.reason);
  };

  const onRecover = () => {
    const res = store.recoverShipToEmpire(shipId, recoverTo);
    setMsg(res.ok ? `Nave recuperada para ${empireName(recoverTo)}.` : res.reason);
  };

  return (
    <div className={compact ? 'sheet' : ''}>
      <div className="row between">
        <h3 className="sheet-title">Nave #{ship.number ?? '—'} {ship.type ? `(${ship.type})` : ''}</h3>
        {compact ? (
          <button className="ghost" type="button" onClick={() => navigate(`/ship/${shipId}`)}>
            Abrir ficha
          </button>
        ) : null}
      </div>

      <div className="grid two">
        <NumberField label="Número de nave" value={ship.number} onChange={(v) => store.saveShip(shipId, { number: v })} min={0} />

        <label className="field">
          <span>Tipo de nave</span>
          <select value={ship.type ?? ''} onChange={(e) => store.saveShip(shipId, { type: (e.target.value || undefined) as any })}>
            <option value="">(sin especificar)</option>
            {SHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <NumberField label="Coste (manual)" value={ship.cost} onChange={(v) => store.saveShip(shipId, { cost: v })} min={0} />

        <label className="field">
          <span>Nota (opcional)</span>
          <input value={ship.name ?? ''} onChange={(e) => store.saveShip(shipId, { name: e.target.value })} />
        </label>

        <NumberField label="Ataque base" value={ship.atkBase} onChange={(v) => store.saveShip(shipId, { atkBase: v })} min={0} />
        <NumberField label="Defensa base" value={ship.defBase} onChange={(v) => store.saveShip(shipId, { defBase: v })} min={0} />

        <NumberField label="PR máximos" value={ship.prMax} onChange={(v) => store.saveShip(shipId, { prMax: v })} min={0} />
        <label className="field">
          <span>PR marcados</span>
          <input
            type="number"
            min={0}
            value={ship.prMarked}
            onChange={(e) => store.markShipPR(shipId, Math.floor(Number(e.target.value) || 0))}
          />
          <small className="muted">Si PR marcados = PR máximos, la nave pasa a “Destruida”.</small>
        </label>
      </div>

      <UpgradeTrack
        title="Nivel 1"
        track={ship.level1}
        onChange={(patch) => store.saveShip(shipId, { level1: { ...ship.level1, ...patch } })}
        onSpendOneCredit={spendOneCredit}
      />

      <UpgradeTrack
        title="Nivel 2"
        track={ship.level2}
        onChange={(patch) => store.saveShip(shipId, { level2: { ...ship.level2, ...patch } })}
        onSpendOneCredit={spendOneCredit}
      />

      <div className="subpanel">
        <h4>Habilidad especial</h4>
        <label className="row">
          <input
            type="checkbox"
            checked={ship.specialUnlocked}
            onChange={(e) => store.saveShip(shipId, { specialUnlocked: e.target.checked })}
          />
          <span>Desbloqueada</span>
        </label>

        <label className="field">
          <span>Nodos activos (coste en nodos)</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="ghost" type="button" onClick={() => store.saveShip(shipId, { specialNodes: Math.max(0, (ship.specialNodes ?? 0) - 1) })}>−</button>
            <input
              type="number"
              value={ship.specialNodes ?? 0}
              onChange={(e) => {
                const next = e.target.value === '' ? 0 : Math.max(0, Math.floor(Number(e.target.value)));
                const prev = ship.specialNodes ?? 0;
                const diff = next - prev;
                if (diff > 0) {
                  const emp = ship.owner;
                  const credits = store.credits[emp] ?? 0;
                  if (credits < diff) {
                    setMsg('No hay créditos suficientes para activar tantos nodos.');
                    return;
                  }
                  store.incCredits(emp, -diff);
                  setMsg('');
                }
                store.saveShip(shipId, { specialNodes: next });
              }}
              style={{ maxWidth: 120 }}
            />
            <button className="ghost" type="button" onClick={() => {
              if (!spendOneCredit()) return;
              store.saveShip(shipId, { specialNodes: (ship.specialNodes ?? 0) + 1 });
            }}>+</button>
          </div>
          <small className="muted">Manual: indica cuántos nodos se han activado para poder usar esta habilidad.</small>
        </label>
        <label className="field">
          <span>Nota / efecto (manual)</span>
          <input value={ship.specialNote} onChange={(e) => store.saveShip(shipId, { specialNote: e.target.value })} />
        </label>
      </div>

      {mode === 'full' ? (
        <>
          {!isInAnyFleetSlot && !ship.destroyed ? (
            <div className="row wrap">
              <button className="primary" onClick={onBuy}>Comprar nave (resta créditos)</button>
              <span className="muted small">Solo se puede comprar si hay créditos suficientes y hueco en la flota.</span>
            </div>
          ) : null}

          {ship.destroyed ? (
            <div className="subpanel">
              <h4>Recuperar nave</h4>
              <p className="muted small">Esta nave está marcada como destruida. Puedes recuperarla y adjudicarla a un imperio (si tiene hueco libre).</p>
              <div className="row wrap">
                <select value={recoverTo} onChange={(e) => setRecoverTo(e.target.value as EmpireId)}>
                  {EMPIRES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <button className="primary" onClick={onRecover}>Recuperar nave para imperio…</button>
              </div>
            </div>
          ) : null}

          {msg ? <p className="notice">{msg}</p> : null}
        </>
      ) : null}
    </div>
  );
}
