
import { Quality, Equipment, EquipmentType, Stat, Material } from '../types';
import { STAT_CONFIG } from '../constants';

export const generateEquipment = (type: EquipmentType, materials: Quality[], isBossDrop: boolean = false): Equipment => {
  const totalValue = materials.reduce((sum, q) => sum + q, 0);
  const id = Math.random().toString(36).substr(2, 9);
  
  // Quality determination
  let resultQuality = Quality.Common;
  if (totalValue >= 7 || (isBossDrop && Math.random() > 0.5)) resultQuality = Quality.Rare;
  else if (totalValue >= 4) resultQuality = Quality.Refined;

  // Number of stats: 1~3 based on total value
  const statCount = Math.min(3, Math.floor(totalValue / 2.5) + 1);
  
  // Stat pool based on type
  const weaponStats: Stat['type'][] = ['ATK', 'CRIT', 'LIFESTEAL'];
  const armorStats: Stat['type'][] = ['HP', 'DEF', 'LIFESTEAL'];
  const pool = type === 'WEAPON' ? weaponStats : armorStats;
  
  const selectedStats: Stat[] = [];
  const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < statCount; i++) {
    const typeKey = shuffledPool[i % shuffledPool.length];
    const config = STAT_CONFIG[typeKey];
    
    // Value scale based on totalValue
    const randomBoost = 0.8 + Math.random() * 0.4; // 80% to 120%
    const finalValue = Math.floor((config.base + config.scale * totalValue) * randomBoost);
    
    selectedStats.push({
      type: typeKey,
      label: config.label,
      value: finalValue,
      suffix: config.suffix
    });
  }

  const namePrefix = resultQuality === Quality.Rare ? '传说' : (resultQuality === Quality.Refined ? '精炼' : '普通的');
  const typeName = type === 'WEAPON' ? '神兵' : '护甲';
  
  // 售价调整：略低于材料购入成本 (普通10, 优质50, 稀有200)
  // 比如 [1,1,1] 成本30，售价约 20-25
  const materialCosts = { [Quality.Common]: 10, [Quality.Refined]: 50, [Quality.Rare]: 200 };
  const totalCost = materials.reduce((sum, q) => sum + materialCosts[q], 0);
  
  // 基础售价为成本的 60% ~ 80%，品质越高溢价越高，但依然略低于直接买材料的成本
  const saleValue = Math.floor(totalCost * (0.6 + resultQuality * 0.1));

  return {
    id,
    name: `${namePrefix}${typeName}`,
    type,
    quality: resultQuality,
    stats: selectedStats,
    value: saleValue,
    materialsUsed: materials
  };
};
