
export enum Quality {
  Common = 1,
  Refined = 2,
  Rare = 3
}

export const QualityNames = {
  [Quality.Common]: '普通',
  [Quality.Refined]: '优质',
  [Quality.Rare]: '稀有'
};

export const QualityColors = {
  [Quality.Common]: 'white',
  [Quality.Refined]: '#4ade80',
  [Quality.Rare]: '#facc15'
};

export interface Material {
  id: string;
  quality: Quality;
  name: string;
  price: number;
}

export interface Stat {
  type: 'HP' | 'ATK' | 'DEF' | 'CRIT' | 'LIFESTEAL';
  label: string;
  value: number;
  suffix: string;
}

export type EquipmentType = 'WEAPON' | 'ARMOR';

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  quality: Quality;
  stats: Stat[];
  value: number;
  materialsUsed: Quality[];
}

export interface Player {
  gold: number;
  materials: Material[];
  inventory: Equipment[];
  equippedWeapon: Equipment | null;
  equippedArmor: Equipment | null;
  baseStats: {
    HP: number;
    ATK: number;
    DEF: number;
    CRIT: number;
    LIFESTEAL: number;
  };
}

export interface DungeonState {
  depth: number;
  currentHP: number;
  maxHP: number;
  loot: {
    gold: number;
    materials: Material[];
    inventory: Equipment[];
  };
  log: string[];
  isDead: boolean;
  // 战斗专用状态
  battle?: {
    monsterName: string;
    monsterMaxHP: number;
    monsterHP: number;
    monsterATK: number;
    isFinished: boolean;
    victory: boolean;
  };
}
