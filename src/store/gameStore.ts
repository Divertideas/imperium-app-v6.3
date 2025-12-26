import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { CharacterRecord, EmpireId, PlanetRecord, ShipRecord } from './types';

export type EmpireConfig = {
  id: EmpireId;
  name: string;
  natalPlanetNumber: number;
};

export const EMPIRES: EmpireConfig[] = [
  { id: 'primus', name: 'Humanos', natalPlanetNumber: 11 },
  { id: 'xilnah', name: 'Robotiránidos', natalPlanetNumber: 12 },
  { id: 'navui', name: 'Nómadas', natalPlanetNumber: 13 },
  { id: 'tora', name: 'Legión de Hierro', natalPlanetNumber: 14 },
  { id: 'miradu', name: 'Mercaderes', natalPlanetNumber: 15 }
];

// Helper used by UI to display a friendly empire name.
export function empireName(id: EmpireId): string {
  return EMPIRES.find(e => e.id === id)?.name ?? String(id);
}

export type GameSetup = {
  playerEmpireId: EmpireId;
  rivalEmpireIds: EmpireId[];
  planetsToConquer: number; // difficulty
};

export type GameState = {
  setup?: GameSetup;
  turnOrder: EmpireId[];
  currentTurnIndex: number;
  turnNumber: number;
  winnerEmpireId?: EmpireId;

  // End-of-game / status messages
  gameOverMessage?: string;
  eliminatedEmpireId?: EmpireId;

  // Simple global toast popup (non-blocking). Used to explain "no credits" and similar.
  toastMessage?: string;
  toastNonce: number;

  // Global dice (persisted)
  die1?: number;
  die2?: number;

  // Manual credit tracking (per empire)
  credits: Record<EmpireId, number>;

  // Ships, planets, characters stored in catalogs; empires reference by slot arrays.
  ships: Record<string, ShipRecord>;
  planets: Record<string, PlanetRecord>;
  characters: Record<string, CharacterRecord>;

  // Slots: numbers shown on empire natal sheet
  empireFleetSlots: Record<EmpireId, (string | null)[]>;
  empireDestroyedShipIds: Record<EmpireId, string[]>;
  empirePlanetSlots: Record<EmpireId, (string | null)[]>;
  empireCharacterSlots: Record<EmpireId, (string | null)[]>; // only meaningful for player

  // A per-partida catalog for "planet number -> planet record id" to enable autocompletion.
  planetByNumber: Record<number, string>;

  // Actions
  newGame: (setup: GameSetup) => void;
  resetGame: () => void;

  rollDie1: () => number;
  rollDie2: () => number;
  rollBoth: () => { die1: number; die2: number };
  rollDice: () => { die1: number; die2: number };
  setCredits: (empire: EmpireId, value: number) => void;
  incCredits: (empire: EmpireId, delta: number) => void;

  startTurnForCurrentEmpire: () => void;
  endTurn: () => void;
  clearNotice: () => void;

  showToast: (message: string) => void;

  // Ships
  createShipForEmpire: (empire: EmpireId) => string;
  saveShip: (shipId: string, patch: Partial<ShipRecord>) => void;
  buyShip: (shipId: string) => { ok: true } | { ok: false; reason: string };
  markShipPR: (shipId: string, marked: number) => void;
  recoverShipToEmpire: (shipId: string, target: EmpireId) => { ok: true } | { ok: false; reason: string };

  // Planets
  createPlanetForEmpire: (empire: EmpireId) => string;
  createPlanetInSlot: (empire: EmpireId, slotIndex: number) => string;
  savePlanet: (planetId: string, patch: Partial<PlanetRecord>) => void;
  bindPlanetNumber: (planetId: string, number?: number) => void;
  /** If the user entered a planet sheet but never assigned a number, discard it and free the slot. */
  discardPlanetIfUnnumbered: (planetId: string) => void;
  setPlanetDestroyed: (planetId: string, destroyed: boolean) => void;
  conquerPlanetToEmpire: (planetId: string, empire: EmpireId) => { ok: true } | { ok: false; reason: string };

  // Characters
  createCharacter: () => string;
  saveCharacter: (charId: string, patch: Partial<CharacterRecord>) => void;
  hireCharacter: (charId: string) => { ok: true } | { ok: false; reason: string };
  useCharacter: (charId: string) => void;

  // Helpers
  getCurrentEmpire: () => EmpireId | undefined;
};

const DEFAULT_FLEET_SLOTS = 10;
const DEFAULT_PLANET_SLOTS = 10;
const DEFAULT_CHARACTER_SLOTS = 6;

function emptySlots(n: number) {
  return Array.from({ length: n }, () => null as string | null);
}

function createBlankShip(owner: EmpireId): ShipRecord {
  return {
    id: nanoid(),
    owner,
    number: undefined,
    type: undefined,
    name: '',
    cost: undefined,
    atkBase: undefined,
    defBase: undefined,
    prMax: undefined,
    prMarked: 0,
    level1: { attackNodes: 0, defenseNodes: 0, attackBonusNote: '', defenseBonusNote: '' },
    level2: { attackNodes: 0, defenseNodes: 0, attackBonusNote: '', defenseBonusNote: '' },
    specialUnlocked: false,
    specialNodes: 0,
    specialNote: '',
    destroyed: false
  };
}

function createBlankPlanet(owner: PlanetRecord['owner']): PlanetRecord {
  return {
    id: nanoid(),
    number: undefined,
    owner,
    prod: undefined,
    atk: undefined,
    def: undefined,
    prMax: undefined,
    prMarked: 0,
    abilityText: '',
    nodePoints: [],
    nodeActive: [],
    destroyedPermanently: owner === 'destroyed',
  };
}

function normalizePlanetRecord(p: PlanetRecord): PlanetRecord {
  // Backward/forward safety: ensure arrays exist and lengths match.
  const nodePoints = Array.isArray((p as any).nodePoints) ? (p as any).nodePoints : [];
  const nodeActive = Array.isArray((p as any).nodeActive) ? (p as any).nodeActive : [];
  const fixedActive = nodePoints.map((_: unknown, i: number) => Boolean(nodeActive[i]));
  return { ...p, nodePoints, nodeActive: fixedActive };
}

function createBlankCharacter(): CharacterRecord {
  return {
    id: nanoid(),
    type: undefined,
    level: undefined,
    number: undefined,
    cost: undefined,
    note: '',
    status: 'available'
  };
}

function sumProductionForEmpire(state: GameState, empire: EmpireId): number {
  const slotIds = state.empirePlanetSlots[empire] ?? [];
  let sum = 0;
  for (const pid of slotIds) {
    if (!pid) continue;
    const planet = state.planets[pid];
    if (!planet) continue;
    if (planet.owner !== empire) continue;
    if (planet.destroyedPermanently) continue;
    const p = planet.prod ?? 0;
    sum += p;
  }
  return sum;
}

function countActiveShips(state: GameState, empire: EmpireId): number {
  const slotIds = state.empireFleetSlots[empire] ?? [];
  let n = 0;
  for (const sid of slotIds) {
    if (!sid) continue;
    const ship = state.ships[sid];
    if (!ship) continue;
    if (!ship.destroyed) n++;
  }
  return n;
}

function countOwnedPlanets(state: GameState, empire: EmpireId): number {
  const slotIds = state.empirePlanetSlots[empire] ?? [];
  let n = 0;
  for (const pid of slotIds) {
    if (!pid) continue;
    const planet = state.planets[pid];
    if (!planet) continue;
    // A planet only counts if it has a confirmed number.
    if (planet.number === undefined || planet.number === null) continue;
    if (planet.owner === empire && !planet.destroyedPermanently) n++;
  }
  return n;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      setup: undefined,
      turnOrder: [],
      currentTurnIndex: 0,
      turnNumber: 1,
      winnerEmpireId: undefined,
      toastMessage: undefined,
      toastNonce: 0,
      die1: undefined,
      die2: undefined,
      credits: { primus: 0, xilnah: 0, navui: 0, tora: 0, miradu: 0 },
      ships: {},
      planets: {},
      characters: {},
      empireFleetSlots: { primus: emptySlots(DEFAULT_FLEET_SLOTS), xilnah: emptySlots(DEFAULT_FLEET_SLOTS), navui: emptySlots(DEFAULT_FLEET_SLOTS), tora: emptySlots(DEFAULT_FLEET_SLOTS), miradu: emptySlots(DEFAULT_FLEET_SLOTS) },
      empireDestroyedShipIds: { primus: [], xilnah: [], navui: [], tora: [], miradu: [] },
      empirePlanetSlots: { primus: emptySlots(DEFAULT_PLANET_SLOTS), xilnah: emptySlots(DEFAULT_PLANET_SLOTS), navui: emptySlots(DEFAULT_PLANET_SLOTS), tora: emptySlots(DEFAULT_PLANET_SLOTS), miradu: emptySlots(DEFAULT_PLANET_SLOTS) },
      empireCharacterSlots: { primus: emptySlots(DEFAULT_CHARACTER_SLOTS), xilnah: emptySlots(DEFAULT_CHARACTER_SLOTS), navui: emptySlots(DEFAULT_CHARACTER_SLOTS), tora: emptySlots(DEFAULT_CHARACTER_SLOTS), miradu: emptySlots(DEFAULT_CHARACTER_SLOTS) },
      planetByNumber: {},

      newGame: (setup) => {
        const turnOrder: EmpireId[] = [setup.playerEmpireId, ...setup.rivalEmpireIds];
        // init planets: slot 0 is natal planet placeholder record for each empire.
        const planets: Record<string, PlanetRecord> = {};
        const planetByNumber: Record<number, string> = {};
        const empirePlanetSlots: any = {};
        for (const emp of EMPIRES) {
          const natal = createBlankPlanet(emp.id);
          natal.number = emp.natalPlanetNumber;
          natal.owner = emp.id;
          planets[natal.id] = natal;
          planetByNumber[natal.number] = natal.id;

          const slots = emptySlots(DEFAULT_PLANET_SLOTS);
          slots[0] = natal.id;
          empirePlanetSlots[emp.id] = slots;
        }

        set({
          setup,
          turnOrder,
          currentTurnIndex: 0,
          turnNumber: 1,
          winnerEmpireId: undefined,
          toastMessage: undefined,
          toastNonce: 0,
          die1: undefined,
          die2: undefined,
          gameOverMessage: undefined,
          eliminatedEmpireId: undefined,
          credits: { primus: 0, xilnah: 0, navui: 0, tora: 0, miradu: 0 },
          ships: {},
          planets,
          characters: {},
          empireFleetSlots: { primus: emptySlots(DEFAULT_FLEET_SLOTS), xilnah: emptySlots(DEFAULT_FLEET_SLOTS), navui: emptySlots(DEFAULT_FLEET_SLOTS), tora: emptySlots(DEFAULT_FLEET_SLOTS), miradu: emptySlots(DEFAULT_FLEET_SLOTS) },
          empireDestroyedShipIds: { primus: [], xilnah: [], navui: [], tora: [], miradu: [] },
          empirePlanetSlots,
          empireCharacterSlots: { primus: emptySlots(DEFAULT_CHARACTER_SLOTS), xilnah: emptySlots(DEFAULT_CHARACTER_SLOTS), navui: emptySlots(DEFAULT_CHARACTER_SLOTS), tora: emptySlots(DEFAULT_CHARACTER_SLOTS), miradu: emptySlots(DEFAULT_CHARACTER_SLOTS) },
          planetByNumber
        });

        // apply production at first turn start automatically
        get().startTurnForCurrentEmpire();
      },

      resetGame: () => set({
        setup: undefined,
        turnOrder: [],
        currentTurnIndex: 0,
        turnNumber: 1,
        winnerEmpireId: undefined,
        toastMessage: undefined,
        toastNonce: 0,
        gameOverMessage: undefined,
        eliminatedEmpireId: undefined,
        die1: undefined,
        die2: undefined
      }),

      rollDie1: () => {
        const die1 = Math.floor(Math.random() * 6) + 1;
        set({ die1 });
        return die1;
      },

      rollDie2: () => {
        const die2 = Math.floor(Math.random() * 6) + 1;
        set({ die2 });
        return die2;
      },

      rollBoth: () => {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        set({ die1, die2 });
        return { die1, die2 };
      },

      rollDice: () => get().rollBoth(),

      setCredits: (empire, value) =>
        set((s) => ({ credits: { ...s.credits, [empire]: Math.max(0, Math.floor(value)) } })),

      incCredits: (empire, delta) =>
        set((s) => ({ credits: { ...s.credits, [empire]: Math.max(0, Math.floor((s.credits[empire] ?? 0) + delta)) } })),

      getCurrentEmpire: () => {
        const s = get();
        return s.turnOrder[s.currentTurnIndex];
      },

      startTurnForCurrentEmpire: () => {
        const s = get();
        const empire = s.turnOrder[s.currentTurnIndex];
        if (!empire) return;
        const prod = sumProductionForEmpire(s, empire);
        // Add production to credits automatically at start of each empire's turn.
        set((st) => ({ credits: { ...st.credits, [empire]: (st.credits[empire] ?? 0) + prod } }));
      },

      endTurn: () => {
        const s = get();
        if (s.winnerEmpireId || s.gameOverMessage) return;
        if (s.turnOrder.length === 0) return;

        // Empire that just finished its turn.
        const current = s.turnOrder[s.currentTurnIndex];
        if (!current) return;

        // 1) Elimination: if the empire ends its turn with 0 planets, it is removed from the game.
        const ownedNow = countOwnedPlanets(s, current);
        if (ownedNow <= 0) {
          const remaining = s.turnOrder.filter(e => e !== current);
          const playerId = s.setup?.playerEmpireId;

          // If the eliminated empire is the player, game ends immediately.
          if (playerId && current === playerId) {
            set({
              eliminatedEmpireId: current,
              gameOverMessage: 'Este imperio ha sido eliminado. La partida termina.'
            });
            return;
          }

          // Otherwise, remove empire from turn order and show a message.
          if (remaining.length === 0) {
            set({
              eliminatedEmpireId: current,
              gameOverMessage: 'Este imperio ha sido eliminado.'
            });
            return;
          }

          // If after elimination only the player remains, player wins.
          if (playerId && remaining.length === 1 && remaining[0] === playerId) {
            set({ winnerEmpireId: playerId, gameOverMessage: undefined, eliminatedEmpireId: undefined });
            return;
          }

          // Recompute index safely (keep the same numeric index if possible).
          const oldIndex = s.currentTurnIndex;
          const newTurnOrder = remaining;
          const newIndex = Math.min(oldIndex, newTurnOrder.length - 1);
          set({
            turnOrder: newTurnOrder,
            currentTurnIndex: newIndex,
            eliminatedEmpireId: current,
            gameOverMessage: 'Este imperio ha sido eliminado.'
          });
          // Note: message is shown; user can continue. Next endTurn will proceed.
          return;
        }

        // 2) Victory by planets-to-conquer at end of turn.
        const target = s.setup?.planetsToConquer ?? 0;
        if (target > 0) {
          if (ownedNow >= target) {
            set({ winnerEmpireId: current });
            return;
          }
        }

        // 3) If only one empire remains at any point, it wins.
        if (s.turnOrder.length === 1) {
          set({ winnerEmpireId: s.turnOrder[0] });
          return;
        }

        const nextIndex = (s.currentTurnIndex + 1) % s.turnOrder.length;
        const nextTurnNumber = nextIndex === 0 ? s.turnNumber + 1 : s.turnNumber;
        set({ currentTurnIndex: nextIndex, turnNumber: nextTurnNumber });
        // auto-production for next empire
        setTimeout(() => get().startTurnForCurrentEmpire(), 0);
      },

      clearNotice: () => set({ gameOverMessage: undefined, eliminatedEmpireId: undefined }),

      showToast: (message) =>
        set((s) => ({ toastMessage: message ? message : undefined, toastNonce: (s.toastNonce ?? 0) + 1 })),

      createShipForEmpire: (empire) => {
        const ship = createBlankShip(empire);
        set((s) => ({ ships: { ...s.ships, [ship.id]: ship } }));
        return ship.id;
      },

      saveShip: (shipId, patch) =>
        set((s) => ({ ships: { ...s.ships, [shipId]: { ...s.ships[shipId], ...patch } } })),

      buyShip: (shipId) => {
        const s = get();
        const ship = s.ships[shipId];
        if (!ship) return { ok: false, reason: 'Nave no encontrada.' } as const;
        if (ship.destroyed) return { ok: false, reason: 'Esta nave está destruida. Debes recuperarla antes.' } as const;
        if (!ship.number) return { ok: false, reason: 'Introduce el número de la nave antes de comprarla.' } as const;

        // Already bought (in any fleet slot)
        for (const slots of Object.values(s.empireFleetSlots)) {
          if (slots?.includes(shipId)) return { ok: false, reason: 'Esta nave ya está asignada a una flota.' } as const;
        }

        // Ensure ship number is globally unique ONLY among ships that are already in play
        // (i.e. assigned to a fleet slot or in a destroyed list). Draft/empty sheets must not block numbers.
        const lockedShipIds = new Set<string>();
        for (const slots of Object.values(s.empireFleetSlots)) {
          for (const id of slots ?? []) {
            if (id) lockedShipIds.add(id);
          }
        }
        for (const ids of Object.values(s.empireDestroyedShipIds)) {
          for (const id of ids ?? []) lockedShipIds.add(id);
        }

        const conflict = Object.values(s.ships).find(
          (other) =>
            other.id !== shipId &&
            other.number === ship.number &&
            (lockedShipIds.has(other.id) || other.destroyed)
        );
        if (conflict) return { ok: false, reason: 'Ese número de nave ya existe en la partida (asignada o destruida).' } as const;
        const cost = ship.cost ?? 0;
        if ((s.credits[ship.owner] ?? 0) < cost) return { ok: false, reason: 'No hay créditos suficientes.' } as const;

        // Put ship in first free fleet slot of owner.
        const slots = [...(s.empireFleetSlots[ship.owner] ?? [])];
        const idx = slots.findIndex((x) => x === null);
        if (idx === -1) return { ok: false, reason: 'No hay huecos libres en la flota.' } as const;

        slots[idx] = shipId;
        set((st) => ({
          empireFleetSlots: { ...st.empireFleetSlots, [ship.owner]: slots },
          credits: { ...st.credits, [ship.owner]: (st.credits[ship.owner] ?? 0) - cost }
        }));
        return { ok: true } as const;
      },

      markShipPR: (shipId, marked) => {
        const s = get();
        const ship = s.ships[shipId];
        if (!ship) return;
        const prMax = ship.prMax ?? 0;
        const clamped = Math.max(0, Math.min(prMax, marked));
        const destroyed = prMax > 0 && clamped >= prMax;
        set((st) => ({
          ships: {
            ...st.ships,
            [shipId]: { ...ship, prMarked: clamped, destroyed }
          }
        }));

        if (destroyed) {
          // Remove from fleet slots and add to destroyed list
          const owner = ship.owner;
          const slots = [...(s.empireFleetSlots[owner] ?? [])].map((x) => (x === shipId ? null : x));
          const destroyedIds = Array.from(new Set([...(s.empireDestroyedShipIds[owner] ?? []), shipId]));
          set((st) => ({
            empireFleetSlots: { ...st.empireFleetSlots, [owner]: slots },
            empireDestroyedShipIds: { ...st.empireDestroyedShipIds, [owner]: destroyedIds }
          }));
        }
      },

      recoverShipToEmpire: (shipId, target) => {
        const s = get();
        const ship = s.ships[shipId];
        if (!ship) return { ok: false, reason: 'Nave no encontrada.' } as const;

        const targetSlots = [...(s.empireFleetSlots[target] ?? [])];
        const idx = targetSlots.findIndex((x) => x === null);
        if (idx === -1) return { ok: false, reason: 'El imperio elegido no tiene huecos libres en su flota.' } as const;

        // Remove from old destroyed list
        const oldOwner = ship.owner;
        const oldDestroyed = (s.empireDestroyedShipIds[oldOwner] ?? []).filter((id) => id !== shipId);

        targetSlots[idx] = shipId;

        set((st) => ({
          ships: { ...st.ships, [shipId]: { ...ship, owner: target, destroyed: false, prMarked: 0 } },
          empireDestroyedShipIds: { ...st.empireDestroyedShipIds, [oldOwner]: oldDestroyed },
          empireFleetSlots: { ...st.empireFleetSlots, [target]: targetSlots }
        }));

        return { ok: true } as const;
      },

      createPlanetForEmpire: (empire) => {
        const planet = createBlankPlanet(empire);
        set((s) => ({ planets: { ...s.planets, [planet.id]: planet } }));
        return planet.id;
      },

      createPlanetInSlot: (empire, slotIndex) => {
        const s = get();
        const slots = [...(s.empirePlanetSlots[empire] ?? [])];
        // If slot already occupied, just return it.
        const existing = slots[slotIndex];
        if (existing) return existing;
        const planet = createBlankPlanet(empire);
        slots[slotIndex] = planet.id;
        set((st) => ({
          planets: { ...st.planets, [planet.id]: planet },
          empirePlanetSlots: { ...st.empirePlanetSlots, [empire]: slots }
        }));
        return planet.id;
      },

      savePlanet: (planetId, patch) =>
        set((s) => {
          const current = s.planets[planetId];
          if (!current) return {} as any;
          const merged: any = { ...current, ...patch };
          return { planets: { ...s.planets, [planetId]: normalizePlanetRecord(merged) } };
        }),

      bindPlanetNumber: (planetId, number) => {
        const s = get();
        const planet = s.planets[planetId];
        if (!planet) return;

        const prevNumber = planet.number;

        // Allow clearing the number (frees it globally)
        if (number === undefined || number === null || Number.isNaN(Number(number))) {
          if (prevNumber !== undefined) {
            const nextMap = { ...s.planetByNumber };
            delete nextMap[prevNumber];
            set((st) => ({
              planets: { ...st.planets, [planetId]: { ...planet, number: undefined } },
              planetByNumber: nextMap
            }));
          }
          return;
        }

        const nextNumber = Number(number);

        // Enforce global uniqueness of planet numbers across the whole partida.
        // If the number already belongs to another planet (including permanently destroyed), do nothing.
        const existingId = s.planetByNumber[nextNumber];
        if (existingId && existingId !== planetId) return;

        // When editing, we must free the previous number; otherwise prefixes like "2" get stuck.
        const nextMap = { ...s.planetByNumber };
        if (prevNumber !== undefined && prevNumber !== nextNumber) {
          delete nextMap[prevNumber];
        }
        nextMap[nextNumber] = planetId;

        set((st) => ({
          planets: { ...st.planets, [planetId]: { ...planet, number: nextNumber } },
          planetByNumber: nextMap
        }));
      },

      discardPlanetIfUnnumbered: (planetId) => {
        const s = get();
        const planet = s.planets[planetId];
        if (!planet) return;
        // Only discard "placeholders" that never got a confirmed number.
        if (planet.number !== undefined && planet.number !== null) return;

        // Remove from any empire slot that references it.
        const nextEmpirePlanetSlots = { ...s.empirePlanetSlots };
        for (const emp of EMPIRES) {
          const prevSlots = [...(nextEmpirePlanetSlots[emp.id] ?? [])];
          nextEmpirePlanetSlots[emp.id] = prevSlots.map((x) => (x === planetId ? null : x));
        }

        // Ensure global catalog doesn't hold anything (defensive)
        const nextMap = { ...s.planetByNumber };
        if (planet.number !== undefined) delete nextMap[planet.number];

        const nextPlanets = { ...s.planets };
        delete nextPlanets[planetId];

        set(() => ({
          empirePlanetSlots: nextEmpirePlanetSlots,
          planetByNumber: nextMap,
          planets: nextPlanets
        }));
      },

      setPlanetDestroyed: (planetId, destroyed) => {
        const s = get();
        const planet = s.planets[planetId];
        if (!planet) return;
        if (!destroyed) {
          set((st) => ({
            planets: { ...st.planets, [planetId]: { ...planet, destroyedPermanently: false } }
          }));
          return;
        }

        // If a planet is permanently destroyed, it no longer occupies a slot in any empire sheet.
        const nextEmpirePlanetSlots = { ...s.empirePlanetSlots };
        for (const emp of EMPIRES) {
          const prevSlots = [...(nextEmpirePlanetSlots[emp.id] ?? [])];
          nextEmpirePlanetSlots[emp.id] = prevSlots.map((x) => (x === planetId ? null : x));
        }

        set(() => ({
          empirePlanetSlots: nextEmpirePlanetSlots,
          planets: { ...s.planets, [planetId]: { ...planet, destroyedPermanently: true, owner: 'destroyed' } }
        }));
      },

      conquerPlanetToEmpire: (planetId, empire) => {
        const s = get();
        const planet = s.planets[planetId];
        if (!planet) return { ok: false, reason: 'Planeta no encontrado.' } as const;
        if (planet.destroyedPermanently || planet.owner === 'destroyed') return { ok: false, reason: 'Este planeta está destruido y no puede conquistarse.' } as const;

        // Safety: avoid duplicating the same planet in the same empire slots.
        // This can happen if the user clicks "Planeta conquistado" twice or if the planet is already owned by the empire.
        const alreadyInSlots = (s.empirePlanetSlots[empire] ?? []).some((x) => x === planetId);
        if (alreadyInSlots) {
          // Ensure owner is correct, but don't add a second reference.
          if (planet.owner !== empire) {
            set((st) => ({ planets: { ...st.planets, [planetId]: { ...planet, owner: empire } } }));
          }
          return { ok: true } as const;
        }

        // Prevent having two different planet records with the same planet number inside one empire.
        // (Planet numbers are unique in the game.)
        const n = planet.number;
        if (typeof n === 'number') {
          const dupInEmpire = (s.empirePlanetSlots[empire] ?? []).some((pid) => {
            if (!pid) return false;
            const p = s.planets[pid];
            return !!p && p.number === n && pid !== planetId;
          });
          if (dupInEmpire) {
            return { ok: false, reason: `Ese planeta (${n}) ya está registrado en este imperio.` } as const;
          }
        }

        // Safety: prevent having two different planet records with the same visible number in one empire.
        if (planet.number != null) {
          const hasSameNumber = (s.empirePlanetSlots[empire] ?? []).some((pid) => {
            if (!pid) return false;
            const p = s.planets[pid];
            return p?.number === planet.number;
          });
          if (hasSameNumber) {
            return { ok: false, reason: `Este imperio ya tiene el planeta ${planet.number}.` } as const;
          }
        }

        const slots = [...(s.empirePlanetSlots[empire] ?? [])];
        // Normally slot 0 is the natal world, but if an empire loses it, slot 0 becomes available again.
        // So we fill the first available slot, prioritizing slot 0 if it is empty.
        const idx = slots[0] === null ? 0 : slots.findIndex((x, i) => i !== 0 && x === null);
        if (idx === -1) return { ok: false, reason: 'No puedes conquistar más planetas (sin huecos libres).' } as const;

        // Remove planet from previous owner's slots if needed
        const prevOwner = planet.owner;
        if (prevOwner !== 'free' && prevOwner !== empire) {
          const prevSlots = [...(s.empirePlanetSlots[prevOwner] ?? [])].map((x) => (x === planetId ? null : x));
          set((st) => ({ empirePlanetSlots: { ...st.empirePlanetSlots, [prevOwner]: prevSlots } }));
        }

        slots[idx] = planetId;
        set((st) => ({
          empirePlanetSlots: { ...st.empirePlanetSlots, [empire]: slots },
          planets: { ...st.planets, [planetId]: { ...planet, owner: empire } }
        }));

        return { ok: true } as const;
      },

      createCharacter: () => {
        const ch = createBlankCharacter();
        set((s) => ({ characters: { ...s.characters, [ch.id]: ch } }));
        return ch.id;
      },

      saveCharacter: (charId, patch) =>
        set((s) => ({ characters: { ...s.characters, [charId]: { ...s.characters[charId], ...patch } } })),

      hireCharacter: (charId) => {
        const s = get();
        const setup = s.setup;
        if (!setup) return { ok: false, reason: 'Partida no inicializada.' } as const;
        const player = setup.playerEmpireId;
        const ch = s.characters[charId];
        if (!ch) return { ok: false, reason: 'Personaje no encontrado.' } as const;

        const num = ch.number;
        if (!num) return { ok: false, reason: 'Introduce el número del personaje.' } as const;

        // Ensure uniqueness: a character number can only be hired by ONE empire at a time.
        // We check the *slots* (hired characters) rather than the whole store.
        for (const [empireId, slotArr] of Object.entries(s.empireCharacterSlots)) {
          for (const cid of slotArr ?? []) {
            if (!cid) continue;
            if (cid === charId) continue;
            const other = s.characters[cid];
            if (other?.number === num) {
              return { ok: false, reason: 'Ese número de personaje ya está contratado.' } as const;
            }
          }
        }

        const cost = ch.cost ?? 0;
        if ((s.credits[player] ?? 0) < cost) return { ok: false, reason: 'No hay créditos suficientes.' } as const;

        const slots = [...(s.empireCharacterSlots[player] ?? [])];
        const idx = slots.findIndex((x) => x === null);
        if (idx === -1) return { ok: false, reason: 'No hay huecos libres de personajes.' } as const;

        slots[idx] = charId;

        set((st) => ({
          empireCharacterSlots: { ...st.empireCharacterSlots, [player]: slots },
          credits: { ...st.credits, [player]: (st.credits[player] ?? 0) - cost }
        }));

        return { ok: true } as const;
      },

      useCharacter: (charId) => {
        const s = get();
        const setup = s.setup;
        if (!setup) return;
        const player = setup.playerEmpireId;
        const slots = [...(s.empireCharacterSlots[player] ?? [])].map((x) => (x === charId ? null : x));
        const ch = s.characters[charId];
        if (!ch) return;
        set((st) => ({
          empireCharacterSlots: { ...st.empireCharacterSlots, [player]: slots },
          characters: { ...st.characters, [charId]: { ...ch, status: 'used' } }
        }));
      }
    }),
    { name: 'imperium-hoja-registro-v2' }
  )
);

export function selectEmpireCounts(state: GameState, empire: EmpireId) {
  return {
    ships: countActiveShips(state, empire),
    planets: countOwnedPlanets(state, empire)
  };
}
