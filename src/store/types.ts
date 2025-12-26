export type EmpireId = 'primus' | 'xilnah' | 'navui' | 'tora' | 'miradu';

export type ShipType =
  | 'Fragata'
  | 'Cañonero'
  | 'Crucero'
  | 'Destructor'
  | 'Nave de apoyo'
  | 'Nave capital';

export type CharacterType = 'General' | 'Espía' | 'Diplomático';
export type CharacterLevel = 1 | 2 | 3;

export type ShipUpgradeTrack = {
  attackNodes: number;
  defenseNodes: number;
  attackBonusNote: string;
  defenseBonusNote: string;
};

export type ShipRecord = {
  id: string; // internal id
  owner: EmpireId;
  number?: number; // ship number as written by player
  type?: ShipType;
  name?: string; // optional note
  cost?: number;
  atkBase?: number;
  defBase?: number;
  prMax?: number;
  prMarked: number; // how many PR marked (0..prMax)
  level1: ShipUpgradeTrack;
  level2: ShipUpgradeTrack;
  specialUnlocked: boolean;
  /** Number of nodes (cost) activated for the special ability. Manual +/- by player. */
  specialNodes: number;
  specialNote: string;
  destroyed: boolean;
};

export type PlanetNodePoint = {
  /** Normalized (0..1) coordinates relative to the nodes image box */
  x: number;
  y: number;
};

export type PlanetRecord = {
  id: string;
  number?: number;
  owner: EmpireId | 'free' | 'destroyed';
  prod?: number;
  atk?: number;
  def?: number;
  prMax?: number;
  prMarked: number;
  abilityText: string;
  /** Calibration points for the white node circles overlay (stored per planet number). */
  nodePoints: PlanetNodePoint[];
  /** Active/inactive state for each node point. */
  nodeActive: boolean[];
  destroyedPermanently: boolean;
};

export type CharacterRecord = {
  id: string;
  type?: CharacterType;
  level?: CharacterLevel;
  number?: number;
  cost?: number;
  note?: string;
  status: 'available' | 'used';
};
