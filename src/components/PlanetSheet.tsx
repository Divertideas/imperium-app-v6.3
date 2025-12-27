import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { EmpireId } from '../store/types';

type PlanetOwner = string;

function isEmpireId(v: unknown): v is EmpireId {
  return v === 'primus' || v === 'xilnah' || v === 'navui' || v === 'tora' || v === 'miradu';
}

function PlanetNodesPanel({
  planetId,
  planetNumber,
}: {
  planetId: string;
  planetNumber?: number;
}) {
  const store = useGameStore();
  const planet = store.planets[planetId];
  const [editMode, setEditMode] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const [notice, setNotice] = useState<string>('');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  // Android (mobile/tablet) can sometimes swallow a quick tap for pointer events
  // on images while still delivering touch events. We handle BOTH and suppress
  // duplicate placement when both fire.
  const lastTouchRef = useRef<number>(0);

  const src = planetNumber ? `/planet-nodes/${planetNumber}.png` : undefined;

  useEffect(() => {
    // When planet number changes, try loading the image again.
    setImgOk(true);
  }, [src]);

  const points = planet?.nodePoints ?? [];
  const active = planet?.nodeActive ?? [];

  const toggleActive = (idx: number) => {
    const currently = Boolean(active[idx]);
    const nextValue = !currently;

    // Activating a node costs 1 credit. Deactivating never refunds.
    if (nextValue) {
      const currentEmpire = store.getCurrentEmpire();
      const owner = store.planets[planetId]?.owner ?? 'free';
      const payEmpire: EmpireId | null = isEmpireId(owner)
        ? owner
        : (currentEmpire ?? null);

      if (!payEmpire) {
        setNotice('No hay un imperio activo para aplicar el coste del nodo.');
        return;
      }

      const credits = store.credits[payEmpire] ?? 0;
      if (credits < 1) {
        setNotice('No hay créditos suficientes para activar este nodo.');
        store.showToast('No tienes créditos suficientes');
        return;
      }
      store.incCredits(payEmpire, -1);
    }

    // Clearing a node never refunds credits.
    setNotice('');

    const next = points.map((_, i) => (i === idx ? nextValue : Boolean(active[i])));
    store.savePlanet(planetId, { nodeActive: next });
  };

  // --- Node placement handlers (Android + desktop)
  // Root cause: on Android a quick tap may not dispatch pointerdown reliably over images,
  // but touchstart is reliable. We support BOTH and dedupe.
  const placePointAtClient = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const imgRect = imgRef.current?.getBoundingClientRect();
    const rect = imgRect ?? wrap.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) return;

    // Avoid duplicates: if close to existing point, ignore.
    const tooClose = points.some((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 0.03;
    });
    if (tooClose) return;

    const nextPoints = [...points, { x, y }];
    const nextActive = [...active, false];
    store.savePlanet(planetId, { nodePoints: nextPoints, nodeActive: nextActive });
  };

  const addPointFromPointer = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!editMode) return;
    const target = ev.target as HTMLElement | null;
    if (target && target.closest && target.closest('.node-dot')) return;
    // If a touch event just fired, ignore the synthetic pointer event to avoid duplicates.
    if (Date.now() - lastTouchRef.current < 600) return;
    ev.preventDefault();
    placePointAtClient(ev.clientX, ev.clientY);
  };

  // Android fix: React's touch handlers may be passive, causing short taps to be ignored.
  // We attach ONE non-passive native touchstart listener for the lifetime of the component,
  // and read the latest state through refs. This avoids a subtle issue on mobile where the
  // listener is re-attached on each render (after adding a node), and the *first tap* after
  // toggling edit mode can be missed, making it feel like a "double tap" is required.
  const pointsRef = React.useRef(points);
  const activeRef = React.useRef(active);
  const editRef = React.useRef(editMode);

  // Toggle edit mode and update the ref synchronously.
  // This fixes an Android quirk where the very first tap after enabling edit mode
  // can read a stale "false" value (making it feel like a double-tap is required).
  const toggleEditMode = () => {
    setEditMode((v) => {
      const nv = !v;
      editRef.current = nv;
      // On Android, if an <input> was focused (keyboard open), the first tap on the image
      // is often consumed just to dismiss the keyboard. Blurring immediately when entering
      // edit mode ensures the very next tap places a node (single-tap behavior).
      if (nv) {
        try {
          const ae = document.activeElement as HTMLElement | null;
          ae?.blur?.();
        } catch {
          // ignore
        }
      }
      return nv;
    });
  };

  // Keep refs in sync *synchronously* on every render so the very first tap
  // after enabling edit mode is not missed on Android.
  pointsRef.current = points;
  activeRef.current = active;
  editRef.current = editMode;

  // Android quirk: a quick tap can be consumed as a scroll/focus gesture.
  // The most reliable approach is to treat a TAP on *touchend* (after we know it wasn't a scroll)
  // using a non-passive listener, while still preventing the browser from stealing the gesture.
  // This fixes the "double tap required" issue seen on some Android phones/tablets.
  const touchStartRef = React.useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const getRect = () => {
      const wrap = wrapRef.current;
      const imgRect = imgRef.current?.getBoundingClientRect();
      return imgRect ?? wrap?.getBoundingClientRect() ?? null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!editRef.current) return;
      lastTouchRef.current = Date.now();
      // Non-passive => preventDefault works. This stops the browser from converting the tap into a scroll
      // and avoids Android's double-tap-to-zoom heuristics from delaying the action.
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;

      const rect = getRect();
      if (!rect) return;
      const nx = (t.clientX - rect.left) / rect.width;
      const ny = (t.clientY - rect.top) / rect.height;

      // Hit-test: if user taps on an existing node, delete it.
      const currentPoints = pointsRef.current;
      const currentActive = activeRef.current;
      const R = 22; // tap radius in px
      let hit = -1;
      for (let i = 0; i < currentPoints.length; i++) {
        const px = currentPoints[i]?.x ?? 0;
        const py = currentPoints[i]?.y ?? 0;
        const hdx = (px - nx) * rect.width;
        const hdy = (py - ny) * rect.height;
        if (hdx * hdx + hdy * hdy <= R * R) {
          hit = i;
          break;
        }
      }

      if (hit >= 0) {
        const nextPoints = currentPoints.filter((_, i) => i !== hit);
        const nextActive = currentActive.filter((_, i) => i !== hit);
        store.savePlanet(planetId, { nodePoints: nextPoints, nodeActive: nextActive });
        return;
      }

      // Otherwise create a new node.
      store.savePlanet(planetId, {
        nodePoints: [...currentPoints, { x: nx, y: ny }],
        nodeActive: [...currentActive, false],
      });
    };

    // We intentionally do NOT use touchend for placement. Android/Chrome may delay
    // the finalization of a "tap" gesture (double-tap heuristics), which makes it
    // feel like a single tap requires two taps. We place/delete immediately on touchstart.

    // Capture so we receive the event before the browser begins interpreting it as a scroll.
    el.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart as any, true);
    };
    // Intentionally attach once; handler reads latest state through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, planetId]);

  const removePoint = (idx: number) => {
    const nextPoints = points.filter((_, i) => i !== idx);
    const nextActive = active.filter((_, i) => i !== idx);
    store.savePlanet(planetId, { nodePoints: nextPoints, nodeActive: nextActive });
  };

  const resetPoints = () => {
    store.savePlanet(planetId, { nodePoints: [], nodeActive: [] });
  };

  return (
    <div className="nodes-panel">
      <div className="row between">
        <div className="nodes-title">Ramificación de nodos</div>
        <div className="row wrap">
          <button className="ghost" type="button" onClick={toggleEditMode} disabled={!planetNumber}>
            {editMode ? 'Terminar edición' : 'Editar nodos'}
          </button>
          {editMode ? (
            <button className="ghost" type="button" onClick={resetPoints}>
              Reiniciar
            </button>
          ) : null}
        </div>
      </div>

      {!planetNumber ? (
        <div className="muted small">Introduce el número del planeta para mostrar la ramificación.</div>
      ) : (
        <div
          className={`nodes-image-wrap ${editMode ? 'editing' : ''}`}
          ref={wrapRef}
          onPointerDown={addPointFromPointer}
          // Critical for Android: prevents double-tap-to-zoom and ensures a single tap
          // is delivered immediately to our handlers.
          style={{ touchAction: editMode ? 'none' : 'pan-y' }}
        >
          {imgOk ? (
            <img
              key={src}
              ref={imgRef}
              src={src}
              alt={`Nodos planeta ${planetNumber}`}
              draggable={false}
              onError={() => setImgOk(false)}
            />
          ) : (
            <div className="muted small">No se ha encontrado la imagen de nodos para el planeta {planetNumber}.</div>
          )}

          {points.map((p, i) => (
            <button
              key={i}
              type="button"
              className={`node-dot ${active[i] ? 'active' : ''}`}
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
              onClick={(e) => {
                e.stopPropagation();
                if (editMode) removePoint(i);
                else toggleActive(i);
              }}
              title={editMode ? 'Quitar nodo' : active[i] ? 'Desactivar nodo' : 'Activar nodo'}
            />
          ))}
        </div>
      )}

      {planetNumber ? (
        <div className="muted small">
          {editMode ? (
            <>
              Pulsa sobre cada círculo blanco del PNG para crear un punto. En modo edición, tocar un punto lo elimina.
              <br />
              Fuera de edición, tocar un punto lo marca como activo/inactivo.
            </>
          ) : (
            'Toca los círculos para marcar nodos activos/inactivos. Si aún no has calibrado este planeta, pulsa “Editar nodos”.'
          )}
        </div>
      ) : null}

      {notice ? <div className="danger small" style={{ marginTop: 8 }}>{notice}</div> : null}
    </div>
  );
}

export function PlanetSheet(props: { planetId: string; mode?: 'full' | 'inline' }) {
  const { planetId, mode = 'full' } = props;
  const store = useGameStore();
  const planet = store.planets[planetId];
  const [msg, setMsg] = useState<string>('');
  // We keep a draft string so typing "2" never reserves/validates numbers until the user explicitly confirms.
  const [draftNumber, setDraftNumber] = useState<string>('');

  if (!planet) return null;

  useEffect(() => {
    setDraftNumber(planet.number === undefined || planet.number === null ? '' : String(planet.number));
  }, [planet.number]);

  const bindNumber = (num?: number) => {
    if (!num) {
      store.savePlanet(planetId, { number: undefined });
      return;
    }
    // Planet numbers must be unique for the whole partida.
    const existingId = store.planetByNumber[num];
    if (existingId && existingId !== planetId) {
      const existing = store.planets[existingId];
      if (existing?.destroyedPermanently || existing?.owner === 'destroyed') {
        setMsg('Este planeta está destruido permanentemente y su número no puede volver a usarse en la partida.');
      } else {
        setMsg('Ese número de planeta ya está registrado en la partida.');
      }
      return;
    }
    setMsg('');
    store.bindPlanetNumber(planetId, num);
  };

  const toggleDestroyed = () => {
    if (!planet.destroyedPermanently) {
      const ok = confirm('Este planeta quedará destruido permanentemente y no podrá volver a usarse en la partida. ¿Confirmar?');
      if (!ok) return;
      store.setPlanetDestroyed(planetId, true);
      setMsg('Planeta marcado como DESTRUIDO permanentemente.');
    }
  };

  return (
    <div className="planet-sheet">
      {mode === 'inline' ? (
        <div className="row between">
          <h3>Planeta</h3>
          <a className="ghost" href={`#/planet/${planetId}`}>Abrir ficha</a>
        </div>
      ) : null}

      <div className="grid two">
        <div className="field">
          <span>Número de planeta</span>
          <div className="row gap">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={draftNumber}
              onChange={(e) => setDraftNumber(e.target.value)}
              placeholder="1–66"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const cleaned = draftNumber.replace(/[^0-9]/g, '').trim();
                  const num = cleaned === '' ? undefined : Number(cleaned);
                  bindNumber(Number.isFinite(num as number) ? (num as number) : undefined);
                }
              }}
            />
            <button
              type="button"
              className="btn"
              onClick={() => {
                const cleaned = draftNumber.replace(/[^0-9]/g, '').trim();
                const num = cleaned === '' ? undefined : Number(cleaned);
                bindNumber(Number.isFinite(num as number) ? (num as number) : undefined);
              }}
            >
              Guardar
            </button>
          </div>
          <small className="muted">Pulsa “Guardar” (o Enter) para confirmar el número. Así no se bloquean números parciales mientras escribes.</small>
        </div>

        <label className="field">
          <span>Propietario</span>
          <input value={planet.owner as PlanetOwner} readOnly />
          <small className="muted">Se gestiona mediante “Planeta conquistado” en combate planetario.</small>
        </label>

        <label className="field">
          <span>Producción (actual)</span>
          <input
            type="number"
            value={planet.prod ?? ''}
            onChange={(e) => store.savePlanet(planetId, { prod: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </label>

        <label className="field">
          <span>Ataque (actual)</span>
          <input
            type="number"
            value={planet.atk ?? ''}
            onChange={(e) => store.savePlanet(planetId, { atk: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </label>

        <label className="field">
          <span>Defensa (actual)</span>
          <input
            type="number"
            value={planet.def ?? ''}
            onChange={(e) => store.savePlanet(planetId, { def: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </label>

        <label className="field">
          <span>PR máximos</span>
          <input
            type="number"
            value={planet.prMax ?? ''}
            onChange={(e) => store.savePlanet(planetId, { prMax: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </label>

        <label className="field">
          <span>PR marcados</span>
          <input
            type="number"
            value={planet.prMarked ?? 0}
            onChange={(e) => store.savePlanet(planetId, { prMarked: Math.floor(Number(e.target.value) || 0) })}
          />
        </label>
      </div>

      <div className="subpanel">
        <h4>Habilidad especial (texto)</h4>
        <textarea
          value={planet.abilityText ?? ''}
          onChange={(e) => store.savePlanet(planetId, { abilityText: e.target.value })}
          rows={3}
        />
      </div>

      <PlanetNodesPanel planetId={planetId} planetNumber={planet.number} />

      <div className="subpanel">
        <h4>Planeta destruido</h4>
        <div className="row between">
          <div>
            <strong>Estado:</strong>{' '}
            {planet.destroyedPermanently ? 'DESTRUIDO (permanente)' : 'Operativo'}
          </div>
          {!planet.destroyedPermanently ? (
            <button className="danger" onClick={toggleDestroyed}>Marcar como destruido</button>
          ) : null}
        </div>
        <p className="muted small">Si se destruye permanentemente, ningún imperio podrá conquistarlo.</p>
      </div>

      {msg ? <p className="notice">{msg}</p> : null}
    </div>
  );
}
