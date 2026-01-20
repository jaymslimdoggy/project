
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Player, Material, Quality, Equipment, EquipmentType, QualityColors, QualityNames, DungeonState, Stat } from './types';
import { MATERIALS, INITIAL_GOLD } from './constants';
import { generateEquipment } from './services/gameLogic';

interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'heal';
  x: number;
  y: number;
}

const App: React.FC = () => {
  const initialPlayerState: Player = {
    gold: INITIAL_GOLD,
    materials: [],
    inventory: [],
    equippedWeapon: null,
    equippedArmor: null,
    baseStats: {
      HP: 100,
      ATK: 20,
      DEF: 10,
      CRIT: 5,
      LIFESTEAL: 0
    }
  };

  const [player, setPlayer] = useState<Player>(initialPlayerState);
  const [activeTab, setActiveTab] = useState<'FORGE' | 'SHOP' | 'BAG' | 'DUNGEON'>('FORGE');
  const [forgeSlots, setForgeSlots] = useState<(Material | null)[]>([null, null, null]);
  const [forgeType, setForgeType] = useState<EquipmentType>('WEAPON');
  const [showResult, setShowResult] = useState<Equipment | null>(null);
  const [isForging, setIsForging] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const floatingIdCounter = useRef(0);
  const [dungeon, setDungeon] = useState<DungeonState & { currentEvent?: string; isProcessing?: boolean } | null>(null);

  useEffect(() => {
    const savedData = localStorage.getItem('shingbing_forge_save');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setPlayer(parsed);
      } catch (e) {
        console.error("存档解析失败:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('shingbing_forge_save', JSON.stringify(player));
  }, [player]);

  const resetGame = () => {
    if (window.confirm("确定要删除所有进度重新开始吗？")) {
      localStorage.removeItem('shingbing_forge_save');
      setPlayer(initialPlayerState);
      window.location.reload();
    }
  };

  const totalStats = useMemo(() => {
    const stats = { ...player.baseStats };
    const applyItemStats = (item: Equipment | null) => {
      if (!item) return;
      item.stats.forEach((s: Stat) => {
        if (s.type in stats) {
          (stats as any)[s.type] += s.value;
        }
      });
    };
    applyItemStats(player.equippedWeapon);
    applyItemStats(player.equippedArmor);
    return stats;
  }, [player]);

  const addFloatingText = (text: string, type: 'damage' | 'heal', isPlayer: boolean) => {
    const id = ++floatingIdCounter.current;
    const x = isPlayer ? -40 : 40;
    const newText: FloatingText = { id, text, type, x, y: -20 };
    setFloatingTexts(prev => [...prev, newText]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1000);
  };

  const buyMaterial = (mat: Material) => {
    if (player.gold >= mat.price) {
      setPlayer(prev => ({
        ...prev,
        gold: prev.gold - mat.price,
        materials: [...prev.materials, { ...mat, id: Math.random().toString() }]
      }));
    } else {
      alert('金币不足！');
    }
  };

  const getSupplies = () => {
    setPlayer(prev => ({ ...prev, gold: prev.gold + 500 }));
  };

  const addToForge = (mat: Material, index: number) => {
    const newSlots = [...forgeSlots];
    newSlots[index] = mat;
    setForgeSlots(newSlots);
    setPlayer(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.id !== mat.id)
    }));
  };

  const removeFromForge = (index: number) => {
    const mat = forgeSlots[index];
    if (!mat) return;
    const newSlots = [...forgeSlots];
    newSlots[index] = null;
    setForgeSlots(newSlots);
    setPlayer(prev => ({
      ...prev,
      materials: [...prev.materials, mat]
    }));
  };

  const handleForge = () => {
    const activeMaterials = forgeSlots.filter((s): s is Material => s !== null);
    if (activeMaterials.length === 0) return;
    setIsForging(true);
    setTimeout(() => {
      const qualities = activeMaterials.map(m => m.quality);
      const result = generateEquipment(forgeType, qualities);
      setShowResult(result);
      setPlayer(prev => ({ ...prev, inventory: [...prev.inventory, result] }));
      setForgeSlots([null, null, null]);
      setIsForging(false);
    }, 800);
  };

  const sellItem = (item: Equipment) => {
    if (player.equippedWeapon?.id === item.id || player.equippedArmor?.id === item.id) {
      alert('无法出售已装备的物品！');
      return;
    }
    setPlayer(prev => ({
      ...prev,
      gold: prev.gold + item.value,
      inventory: prev.inventory.filter(i => i.id !== item.id),
    }));
  };

  const equipItem = (item: Equipment) => {
    setPlayer(prev => {
      if (item.type === 'WEAPON') return { ...prev, equippedWeapon: item };
      return { ...prev, equippedArmor: item };
    });
  };

  const startDungeon = () => {
    setDungeon({
      depth: 0,
      currentHP: totalStats.HP,
      maxHP: totalStats.HP,
      loot: { gold: 0, materials: [], inventory: [] },
      log: ["你步入了深渊遗迹..."],
      isDead: false,
      currentEvent: '准备出发'
    });
  };

  const addLog = (msg: string) => {
    setDungeon(prev => prev ? ({ ...prev, log: [msg, ...prev.log].slice(0, 30) }) : null);
  };

  const proceedDungeon = () => {
    if (!dungeon || dungeon.isDead || dungeon.isProcessing || dungeon.battle) return;
    setDungeon(prev => prev ? ({ ...prev, isProcessing: true }) : null);
    
    setTimeout(() => {
      const nextDepth = (dungeon?.depth || 0) + 1;
      const isBossStage = nextDepth % 10 === 0;
      const depthBoost = nextDepth;

      if (isBossStage) {
        const monsterMaxHP = 150 + depthBoost * 35;
        setDungeon(prev => prev ? ({
          ...prev, depth: nextDepth, currentEvent: '首领房间', isProcessing: false,
          battle: {
            monsterName: `【BOSS】毁灭领主 Lv.${depthBoost}`,
            monsterMaxHP, monsterHP: monsterMaxHP, monsterATK: 15 + Math.floor(depthBoost * 5),
            isFinished: false, victory: false
          }
        }) : null);
        addLog(`[警告] 第${nextDepth}步，首领房间！`);
        return;
      }

      const eventRoll = Math.random();
      if (eventRoll < 0.5) {
        const monsterMaxHP = 40 + depthBoost * 20;
        setDungeon(prev => prev ? ({
          ...prev, depth: nextDepth, currentEvent: '遭遇怪物', isProcessing: false,
          battle: {
            monsterName: `守卫者 Lv.${depthBoost}`,
            monsterMaxHP, monsterHP: monsterMaxHP, monsterATK: 8 + Math.floor(depthBoost * 3.5),
            isFinished: false, victory: false
          }
        }) : null);
        addLog(`[第${nextDepth}步] 遭遇怪物！`);
      } 
      else if (eventRoll < 0.9) {
        const foundRoll = Math.random();
        const foundGold = Math.floor(Math.random() * 15 * depthBoost);
        let matIndex = 0;
        if (foundRoll > 0.98) matIndex = 2;
        else if (foundRoll > 0.7) matIndex = 1;
        const newMat = { ...MATERIALS[matIndex], id: Math.random().toString() };
        setDungeon(prev => prev ? ({
          ...prev, depth: nextDepth, currentEvent: '搜刮废墟', isProcessing: false,
          loot: { ...prev.loot, gold: prev.loot.gold + foundGold, materials: [...prev.loot.materials, newMat] }
        }) : null);
        addLog(`[第${nextDepth}步] 获得了 ${foundGold} 金币和 ${newMat.name}。`);
      } 
      else {
        const heal = Math.floor(totalStats.HP * 0.4);
        setDungeon(prev => prev ? ({ 
          ...prev, depth: nextDepth, currentHP: Math.min(prev.maxHP, prev.currentHP + heal), 
          currentEvent: '休整营地', isProcessing: false 
        }) : null);
        addLog(`[第${nextDepth}步] 回复了 ${heal} 生命值。`);
      }
    }, 400);
  };

  const startBattle = async () => {
    if (!dungeon || !dungeon.battle || dungeon.battle.isFinished) return;
    let mHP = dungeon.battle.monsterHP;
    let pHP = dungeon.currentHP;
    const mATK = dungeon.battle.monsterATK;
    const pATK = totalStats.ATK;
    const pCRIT = totalStats.CRIT;
    const pDEF = totalStats.DEF;
    const pLIFESTEAL = totalStats.LIFESTEAL;

    while (mHP > 0 && pHP > 0) {
      const isCrit = Math.random() * 100 < pCRIT;
      const pDmg = Math.floor(pATK * (isCrit ? 1.5 : 1));
      const heal = Math.floor(pDmg * (pLIFESTEAL / 100));
      mHP = Math.max(0, mHP - pDmg);
      pHP = Math.min(dungeon.maxHP, pHP + heal);
      
      addFloatingText(`-${pDmg}${isCrit ? '!' : ''}`, 'damage', false);
      if (heal > 0) addFloatingText(`+${heal}`, 'heal', true);
      
      setDungeon(prev => prev ? ({
        ...prev, currentHP: pHP,
        battle: prev.battle ? { ...prev.battle, monsterHP: mHP } : undefined
      }) : null);
      if (mHP <= 0) break;
      await new Promise(r => setTimeout(r, 400));

      const mDmg = Math.max(1, mATK - pDEF);
      pHP = Math.max(0, pHP - mDmg);
      addFloatingText(`-${mDmg}`, 'damage', true);
      
      setDungeon(prev => prev ? ({ ...prev, currentHP: pHP }) : null);
      if (pHP <= 0) break;
      await new Promise(r => setTimeout(r, 400));
    }

    const victory = mHP <= 0;
    if (victory) {
      const isBoss = dungeon.depth % 10 === 0;
      let newItem = null;
      let newMat = null;
      if (isBoss) {
        newItem = generateEquipment(Math.random() > 0.5 ? 'WEAPON' : 'ARMOR', [Quality.Rare, Quality.Refined, Quality.Refined], true);
        newMat = { ...MATERIALS[2], id: Math.random().toString() };
      } else if (Math.random() > 0.7) {
        newItem = generateEquipment(Math.random() > 0.5 ? 'WEAPON' : 'ARMOR', [Quality.Common, Quality.Refined, Quality.Common]);
      }
      setDungeon(prev => {
        if (!prev) return null;
        const nextLoot = { ...prev.loot };
        if (newItem) nextLoot.inventory = [...nextLoot.inventory, newItem];
        if (newMat) nextLoot.materials = [...nextLoot.materials, newMat];
        return { ...prev, isDead: false, battle: prev.battle ? { ...prev.battle, isFinished: true, victory: true } : undefined, loot: nextLoot };
      });
      addLog(`[胜利] 战斗结束。`);
    } else {
      setDungeon(prev => prev ? ({ ...prev, isDead: true, battle: prev.battle ? { ...prev.battle, isFinished: true, victory: false } : undefined }) : null);
      addLog(`[战败] 你倒在了血泊中。`);
    }
  };

  const closeBattle = () => setDungeon(prev => prev ? ({ ...prev, battle: undefined }) : null);

  const withdraw = () => {
    if (!dungeon) return;
    setPlayer(prev => ({
      ...prev, gold: prev.gold + dungeon.loot.gold,
      materials: [...prev.materials, ...dungeon.loot.materials],
      inventory: [...prev.inventory, ...dungeon.loot.inventory]
    }));
    setDungeon(null);
    setActiveTab('BAG');
  };

  const handleDeath = () => {
    setPlayer(prev => ({
      ...prev, equippedWeapon: null, equippedArmor: null,
      inventory: prev.inventory.filter(item => item.id !== prev.equippedWeapon?.id && item.id !== prev.equippedArmor?.id)
    }));
    setDungeon(null);
    setActiveTab('FORGE');
  };

  const bossProgress = dungeon ? (dungeon.depth % 10 === 0 && dungeon.depth !== 0 ? 100 : (dungeon.depth % 10) * 10) : 0;
  const stepsToBoss = dungeon ? 10 - (dungeon.depth % 10) : 10;

  return (
    <div className="min-h-screen max-w-4xl mx-auto flex flex-col p-4 md:p-6 pb-28 relative overflow-hidden h-screen">
      {showResult && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-zinc-800 border-2 border-yellow-500 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(234,179,8,0.3)] text-center animate-bounce-short">
            <h2 className="text-2xl font-black mb-2 text-zinc-100 italic tracking-widest uppercase">锻造成功！</h2>
            <div className={`text-3xl font-black mb-6 quality-${showResult.quality}`}>{showResult.name}</div>
            <div className="bg-zinc-900 rounded-2xl p-6 mb-8 border border-zinc-700">
              <div className="space-y-3">
                {showResult.stats.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-zinc-300">
                    <span className="text-zinc-500 font-bold">{s.label}</span>
                    <span className="text-xl font-black text-green-400">+{s.value}{s.suffix}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setShowResult(null)} className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-black rounded-xl transition shadow-lg tracking-widest uppercase">收进行囊</button>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-6 bg-zinc-800 p-4 rounded-xl border border-zinc-700 shadow-lg shrink-0 z-10">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-yellow-500 tracking-wider">神兵锻造录</h1>
          <div className="flex gap-2 mt-1">
             <button onClick={getSupplies} className="text-[10px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-2 py-0.5 rounded border border-zinc-600 transition">调试金币</button>
             <button onClick={resetGame} className="text-[10px] bg-red-900/30 hover:bg-red-900/50 text-red-400 px-2 py-0.5 rounded border border-red-900/30 transition">重置存档</button>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center text-yellow-400 text-xl font-bold justify-end"><i className="fas fa-coins mr-2"></i>{player.gold}</div>
          <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Gold</div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 shrink-0 z-10">
        {Object.entries(totalStats).map(([key, val]) => (
          <div key={key} className="stat-card p-2 rounded-lg border border-zinc-800 text-center">
            <div className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-tighter">{key === 'HP' ? '生命' : key === 'ATK' ? '攻击' : key === 'DEF' ? '防御' : key === 'CRIT' ? '暴击' : '吸血'}</div>
            <div className="text-base font-bold text-zinc-200">{val}{(key === 'CRIT' || key === 'LIFESTEAL') ? '%' : ''}</div>
          </div>
        ))}
      </div>

      <main className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
        {activeTab === 'FORGE' && (
          <div className="space-y-6 animate-fadeIn overflow-y-auto h-full pb-4 scrollbar-thin">
            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 text-center relative overflow-hidden shrink-0">
              {isForging && (
                <div className="absolute inset-0 bg-zinc-900/60 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
                   <i className="fas fa-hammer text-6xl text-orange-500 animate-bounce mb-4"></i>
                   <div className="text-xl font-black text-white tracking-widest animate-pulse">精雕细琢中...</div>
                </div>
              )}
              <h2 className="text-xl mb-4 font-bold flex items-center justify-center"><i className="fas fa-fire-alt mr-2 text-orange-500"></i> 铁匠铺</h2>
              <div className="flex justify-center gap-4 mb-8">
                <button onClick={() => setForgeType('WEAPON')} className={`px-6 py-2 rounded-full border transition ${forgeType === 'WEAPON' ? 'bg-orange-600 border-orange-400 text-white' : 'border-zinc-600 text-zinc-400'}`}>锻造武器</button>
                <button onClick={() => setForgeType('ARMOR')} className={`px-6 py-2 rounded-full border transition ${forgeType === 'ARMOR' ? 'bg-blue-600 border-blue-400 text-white' : 'border-zinc-600 text-zinc-400'}`}>锻造防具</button>
              </div>
              <div className="flex justify-center items-center gap-4 mb-8">
                {forgeSlots.map((slot, i) => (
                  <div key={i} onClick={() => removeFromForge(i)} className={`forge-slot cursor-pointer hover:scale-105 ${slot ? 'filled bg-quality-' + slot.quality : ''}`}>
                    {slot ? <div className="text-center text-[10px] p-1 leading-tight font-bold">{slot.name}</div> : <i className="fas fa-plus text-zinc-700"></i>}
                  </div>
                ))}
              </div>
              <button disabled={forgeSlots.every(s => s === null) || isForging} onClick={handleForge} className={`w-full max-w-xs py-4 text-white font-black rounded-xl shadow-xl active:scale-95 transition tracking-widest ${isForging ? 'bg-zinc-700 opacity-50' : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500'}`}>
                {isForging ? '锻造中...' : '开始锻造'}
              </button>
            </div>
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 flex-1 min-h-0">
              <h3 className="text-sm font-bold text-zinc-500 mb-3 uppercase tracking-widest flex items-center"><i className="fas fa-gem mr-2"></i>材料库</h3>
              <div className="flex flex-wrap gap-3 overflow-y-auto max-h-48 scrollbar-thin p-1">
                {player.materials.length === 0 && <div className="text-zinc-600 text-sm py-4 italic w-full text-center">暂无可用材料</div>}
                {player.materials.map(mat => (
                  <button key={mat.id} onClick={() => { const emptyIndex = forgeSlots.findIndex(s => s === null); if (emptyIndex !== -1) addToForge(mat, emptyIndex); }} className={`p-2 rounded-lg border border-zinc-600 bg-zinc-900 text-xs quality-${mat.quality} font-bold hover:bg-zinc-700 transition`}>{mat.name}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SHOP' && (
          <div className="space-y-6 animate-fadeIn overflow-y-auto h-full pb-4 scrollbar-thin">
            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700">
              <h2 className="text-xl mb-4 font-bold flex items-center"><i className="fas fa-store mr-2 text-green-500"></i> 材料商人</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MATERIALS.map(mat => (
                  <div key={mat.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-700 flex flex-col items-center shadow-inner">
                    <div className={`text-3xl mb-3 quality-${mat.quality}`}><i className="fas fa-gem"></i></div>
                    <div className={`font-bold mb-1 quality-${mat.quality}`}>{mat.name}</div>
                    <button onClick={() => buyMaterial(mat)} className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-yellow-400 font-bold rounded-lg mt-4 transition">购买 {mat.price}G</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700">
              <h3 className="text-lg font-bold mb-4 text-zinc-400">装备回收</h3>
              <div className="grid grid-cols-1 gap-4">
                {player.inventory.map(item => {
                  const isEquipped = player.equippedWeapon?.id === item.id || player.equippedArmor?.id === item.id;
                  return (
                    <div key={item.id} className={`bg-zinc-900 p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center transition ${isEquipped ? 'border-blue-500/50' : 'border-zinc-800 hover:border-zinc-600'}`}>
                      <div>
                        <div className={`font-bold text-lg quality-${item.quality}`}>{item.name} {isEquipped && <span className="text-[10px] bg-blue-600 px-1.5 py-0.5 rounded ml-1 font-bold shadow-sm">已装备</span>}</div>
                        <div className="flex flex-wrap gap-x-3 mt-1">
                          {item.stats.map((s, i) => <span key={i} className="text-xs text-zinc-500">{s.label}: <span className="text-zinc-300 font-bold">+{s.value}{s.suffix}</span></span>)}
                        </div>
                      </div>
                      <button onClick={() => sellItem(item)} disabled={isEquipped} className={`px-6 py-2 rounded-lg font-bold text-sm transition ${isEquipped ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-red-900/40 text-red-300 border border-red-800/50 hover:bg-red-800/60'}`}>卖出 {item.value}G</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'BAG' && (
          <div className="space-y-6 animate-fadeIn overflow-y-auto h-full pb-4 scrollbar-thin">
            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700">
              <h2 className="text-xl mb-4 font-bold flex items-center"><i className="fas fa-shield-halved mr-2 text-blue-500"></i> 武装状态</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[player.equippedWeapon, player.equippedArmor].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 min-h-[120px] shadow-inner">
                    <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">{idx === 0 ? '主手武器' : '身体防具'}</h4>
                    {item ? (
                      <div>
                        <div className={`font-bold text-lg quality-${item.quality}`}>{item.name}</div>
                        <div className="mt-2 space-y-1">
                          {item.stats.map((s, i) => <div key={i} className="text-xs text-zinc-300 flex justify-between"><span>{s.label}</span><span className="text-green-400 font-bold">+{s.value}{s.suffix}</span></div>)}
                        </div>
                      </div>
                    ) : <div className="text-zinc-700 text-sm italic">未装备</div>}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700">
              <h2 className="text-xl mb-4 font-bold text-zinc-400 flex items-center"><i className="fas fa-box-open mr-2 text-zinc-500"></i> 行囊存货</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {player.inventory.map(item => {
                  const isEquipped = player.equippedWeapon?.id === item.id || player.equippedArmor?.id === item.id;
                  return (
                    <div key={item.id} className={`bg-zinc-900 p-4 rounded-xl border flex flex-col hover:border-zinc-500 transition shadow-sm ${isEquipped ? 'border-blue-900/50' : 'border-zinc-800'}`}>
                      <div className={`font-bold mb-3 quality-${item.quality}`}>{item.name}</div>
                      <div className="flex-1 text-xs text-zinc-400 space-y-1.5">
                        {item.stats.map((s, i) => <div key={i} className="flex justify-between border-b border-zinc-800/50 pb-1"><span>{s.label}</span><span className="text-zinc-200">+{s.value}{s.suffix}</span></div>)}
                      </div>
                      <button onClick={() => equipItem(item)} disabled={isEquipped} className={`w-full py-2 mt-4 rounded-lg font-bold text-sm transition ${isEquipped ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-700 hover:bg-blue-600 text-white shadow-md shadow-blue-900/20'}`}>{isEquipped ? '装备中' : '穿戴装备'}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'DUNGEON' && (
          <div className="h-full flex flex-col relative overflow-hidden min-h-0">
            {!dungeon ? (
              <div className="bg-zinc-800 p-10 rounded-2xl border border-zinc-700 text-center flex flex-col items-center justify-center shadow-lg animate-fadeIn my-auto shrink-0">
                <i className="fas fa-skull text-6xl text-red-600 mb-8 animate-pulse"></i>
                <h2 className="text-3xl font-black mb-4 italic tracking-widest text-zinc-100 uppercase">深渊遗迹</h2>
                <p className="text-zinc-400 mb-8 max-w-sm leading-relaxed border-l-2 border-red-900 pl-4 text-left">
                  BOSS 位于每 10 层深处。死亡后穿戴的装备将损毁。
                  <br/>
                  <span className="text-red-500 font-bold mt-2 block italic text-xs">警告：一旦任务失败，身上的武装将支离破碎。</span>
                </p>
                <button onClick={startDungeon} className="px-16 py-5 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white font-black rounded-2xl shadow-xl transition transform hover:scale-105 active:scale-95 uppercase tracking-widest">开启远征</button>
              </div>
            ) : (
              <div className="flex flex-col h-full gap-4 pb-2 min-h-0 overflow-hidden">
                <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 shadow-sm shrink-0">
                  <div className="flex justify-between text-[11px] font-black mb-1.5 text-zinc-400 tracking-widest uppercase">
                    <span>深度: {dungeon.depth} 层</span>
                    <span className="text-yellow-500">BOSS 距离: {stepsToBoss === 0 ? '!!!' : `${stepsToBoss} 步`}</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-700 relative shadow-inner">
                    <div className="h-full bg-gradient-to-r from-orange-600 to-yellow-500 transition-all duration-500" style={{ width: `${bossProgress}%` }}></div>
                    <div className="absolute top-0 right-0 h-full w-1 bg-red-600 animate-pulse"></div>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 overflow-hidden">
                  <div className="md:col-span-2 flex flex-col gap-4 min-h-0 overflow-hidden">
                    <div className="bg-zinc-800 p-5 rounded-2xl border border-zinc-700 relative overflow-hidden flex flex-col shadow-lg flex-[1.4] min-h-0">
                      {dungeon.battle && (
                        <div className="absolute inset-0 bg-zinc-950/98 z-50 p-6 flex flex-col items-center justify-center animate-fadeIn">
                          <h3 className={`text-2xl font-black mb-6 uppercase tracking-widest ${dungeon.depth % 10 === 0 ? 'text-yellow-500' : 'text-red-600'}`}>
                            {dungeon.depth % 10 === 0 ? '--- 领主大厅 ---' : '--- 遭遇遭遇 ---'}
                          </h3>
                          
                          <div className="w-full flex justify-around items-center mb-8 relative h-32 shrink-0">
                            <div className="absolute inset-0 pointer-events-none z-[60]">
                              {floatingTexts.map(ft => (
                                <div key={ft.id} className={`absolute font-black text-2xl transition-all duration-1000 transform -translate-y-12 opacity-0 animate-floatingText ${ft.type === 'damage' ? 'text-red-500' : 'text-green-500'}`} style={{ left: `calc(50% + ${ft.x}px)`, top: '40%' }}>
                                  {ft.text}
                                </div>
                              ))}
                            </div>

                            <div className="text-center">
                              <div className="text-5xl text-blue-400 mb-4 drop-shadow-lg"><i className="fas fa-user-shield"></i></div>
                              <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden mx-auto shadow-inner">
                                <div className="h-full bg-blue-500" style={{ width: `${(dungeon.currentHP/dungeon.maxHP)*100}%` }}></div>
                              </div>
                            </div>
                            
                            <div className="text-3xl text-zinc-700 font-black italic opacity-30">VS</div>
                            
                            <div className="text-center">
                              <div className={`text-5xl mb-4 drop-shadow-lg ${dungeon.depth % 10 === 0 ? 'text-yellow-500 animate-pulse' : 'text-red-600'}`}><i className={`fas ${dungeon.depth % 10 === 0 ? 'fa-dragon' : 'fa-skull'}`}></i></div>
                              <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden mx-auto shadow-inner">
                                <div className="h-full bg-red-600" style={{ width: `${(dungeon.battle.monsterHP/dungeon.battle.monsterMaxHP)*100}%` }}></div>
                              </div>
                            </div>
                          </div>

                          {!dungeon.battle.isFinished ? (
                            <button onClick={startBattle} className="px-16 py-4 bg-orange-700 text-white font-black rounded-2xl hover:bg-orange-600 shadow-2xl tracking-widest transition transform active:scale-95 uppercase">进入战斗</button>
                          ) : (
                            <div className="text-center scale-110 animate-bounce-short">
                              <div className={`text-5xl font-black mb-6 italic ${dungeon.battle.victory ? 'text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.6)]'}`}>
                                {dungeon.battle.victory ? '胜利!' : '阵亡!'}
                              </div>
                              {dungeon.battle.victory ? (
                                 <button onClick={closeBattle} className="px-14 py-4 bg-zinc-700 text-white font-black rounded-xl hover:bg-zinc-600 tracking-wider shadow-lg transition">收割清场</button>
                              ) : (
                                 <button onClick={handleDeath} className="px-14 py-4 bg-red-900 text-white font-black rounded-xl border border-red-700 shadow-lg transition hover:bg-red-800">遗憾而终</button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mb-4 relative z-10 shrink-0">
                        <div className="flex justify-between items-end mb-2">
                          <h2 className={`text-xl font-black ${dungeon.depth % 10 === 0 ? 'text-red-500 animate-pulse' : 'text-zinc-100'}`}>{dungeon.currentEvent}</h2>
                          <span className="text-sm font-mono text-zinc-400 font-bold">{dungeon.currentHP} / {dungeon.maxHP} HP</span>
                        </div>
                        <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-700 shadow-inner">
                          <div className="h-full bg-red-600 transition-all duration-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]" style={{ width: `${(dungeon.currentHP/dungeon.maxHP)*100}%` }}></div>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col items-center justify-center space-y-4 relative z-10 min-h-0">
                        {!dungeon.isDead ? (
                          <>
                            <button onClick={proceedDungeon} disabled={dungeon.isProcessing || !!dungeon.battle} className={`w-full max-w-xs py-10 text-xl font-black rounded-2xl shadow-xl transition-all transform active:scale-95 border-b-8 flex flex-col items-center justify-center ${dungeon.isProcessing ? 'bg-zinc-700 border-zinc-900 opacity-50' : 'bg-red-800 border-red-950 hover:bg-red-700'}`}>
                              <i className={`fas ${dungeon.isProcessing ? 'fa-spinner fa-spin' : 'fa-shoe-prints'} mb-2`}></i>
                              {dungeon.isProcessing ? '搜索路径...' : '继续前进'}
                            </button>
                            <button onClick={withdraw} disabled={dungeon.isProcessing || !!dungeon.battle} className="w-full max-w-xs py-3 bg-zinc-900 border border-yellow-800/50 text-yellow-600 font-bold rounded-xl hover:bg-zinc-800 transition tracking-widest disabled:opacity-30">见好就收 (保留收获)</button>
                          </>
                        ) : (
                          <div className="text-center w-full relative z-20 flex flex-col items-center py-4 bg-zinc-900/90 rounded-2xl p-6 border border-red-900/50">
                             <div className="text-5xl font-black text-red-600 mb-4 italic drop-shadow-lg">开拓受阻</div>
                             <p className="text-zinc-500 mb-6 max-w-xs mx-auto text-sm leading-relaxed shrink-0">
                               黑暗吞噬了一切。身上穿戴的装备已在漫长的厮杀中化为齑粉。
                             </p>
                            <button onClick={handleDeath} className="w-full max-w-xs py-6 bg-red-950 border border-red-800 text-red-100 font-black rounded-2xl hover:bg-red-900 transition tracking-widest shadow-2xl animate-pulse uppercase">
                              <i className="fas fa-door-open mr-2"></i> 忍辱负重返回
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-black/80 p-5 rounded-2xl border border-zinc-800 flex-1 flex flex-col shadow-inner min-h-0">
                      <h4 className="text-[12px] text-zinc-500 uppercase font-black mb-4 tracking-widest flex items-center shrink-0">
                        <span className="w-2.5 h-2.5 bg-red-800 rounded-full mr-3 animate-pulse"></span> 实时汇报
                      </h4>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin text-xs">
                        {dungeon.log.map((l, i) => (
                          <div key={i} className={`leading-relaxed ${i === 0 ? 'text-zinc-100 font-bold border-l-2 border-yellow-600 pl-4 py-1.5 bg-zinc-700/30' : 'text-zinc-500 pl-4'}`}>{l}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-800 p-5 rounded-2xl border border-zinc-700 flex flex-col h-full shadow-lg min-h-0 overflow-hidden">
                    <h3 className="text-sm font-black mb-4 border-b border-zinc-700 pb-3 flex items-center text-zinc-200 shrink-0 uppercase tracking-widest">
                      <i className="fas fa-box-open mr-2 text-yellow-500"></i> 本轮收获
                    </h3>
                    <div className="space-y-5 flex-1 overflow-y-auto pr-1 scrollbar-thin">
                      <div className="flex justify-between items-center p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 shadow-inner shrink-0">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase">金币</span>
                        <span className="text-yellow-500 font-black text-lg tracking-tighter">{dungeon.loot.gold} G</span>
                      </div>
                      
                      <div className="shrink-0">
                        <div className="text-[10px] text-zinc-500 font-black mb-2.5 flex justify-between items-center px-1 uppercase tracking-wider">
                          <span>稀有矿石</span>
                          <span className="bg-zinc-700 px-1.5 py-0.5 rounded text-[9px]">{dungeon.loot.materials.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {dungeon.loot.materials.map((m, i) => (
                            <div key={i} className={`text-[9px] px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 quality-${m.quality} font-bold`}>{m.name.split('矿')[0]}矿</div>
                          ))}
                          {dungeon.loot.materials.length === 0 && <span className="text-[9px] text-zinc-700 italic">空空如也</span>}
                        </div>
                      </div>

                      <div className="flex-1 min-h-0 flex flex-col">
                        <div className="text-[10px] text-zinc-500 font-black mb-2.5 flex justify-between items-center px-1 uppercase tracking-wider">
                          <span>遗失的神兵</span>
                          <span className="bg-zinc-700 px-1.5 py-0.5 rounded text-[9px]">{dungeon.loot.inventory.length}</span>
                        </div>
                        <div className="space-y-2 overflow-y-auto pr-1">
                          {dungeon.loot.inventory.map((item, i) => (
                            <div key={i} className={`text-[10px] p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 quality-${item.quality} flex justify-between items-center font-bold shadow-sm`}>
                              <span className="truncate mr-2">{item.name}</span>
                              <span className="text-[9px] opacity-40 shrink-0 uppercase">{item.type === 'WEAPON' ? '武' : '甲'}</span>
                            </div>
                          ))}
                          {dungeon.loot.inventory.length === 0 && <div className="text-[10px] text-zinc-700 italic text-center py-4">无新掉落</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 px-2 py-2 rounded-[2rem] shadow-2xl flex gap-1 z-[100] w-[92%] max-w-md shrink-0">
        <button onClick={() => setActiveTab('FORGE')} className={`flex-1 py-3 rounded-2xl transition-all flex flex-col items-center ${activeTab === 'FORGE' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-800'}`}>
          <i className="fas fa-hammer text-lg mb-1"></i><span className="text-[10px] font-black tracking-widest">锻造</span>
        </button>
        <button onClick={() => setActiveTab('DUNGEON')} className={`flex-1 py-3 rounded-2xl transition-all flex flex-col items-center ${activeTab === 'DUNGEON' ? 'bg-red-700 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-800'}`}>
          <i className="fas fa-skull text-lg mb-1"></i><span className="text-[10px] font-black tracking-widest">远征</span>
        </button>
        <button onClick={() => setActiveTab('SHOP')} className={`flex-1 py-3 rounded-2xl transition-all flex flex-col items-center ${activeTab === 'SHOP' ? 'bg-green-700 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-800'}`}>
          <i className="fas fa-shopping-bag text-lg mb-1"></i><span className="text-[10px] font-black tracking-widest">交易</span>
        </button>
        <button onClick={() => setActiveTab('BAG')} className={`flex-1 py-3 rounded-2xl transition-all flex flex-col items-center ${activeTab === 'BAG' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-800'}`}>
          <i className="fas fa-archive text-lg mb-1"></i><span className="text-[10px] font-black tracking-widest">行囊</span>
        </button>
      </nav>

      <style>{`
        @keyframes floatingText {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-90px); opacity: 0; }
        }
        .animate-floatingText {
          animation: floatingText 1.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        body {
          overflow: hidden;
          touch-action: manipulation;
        }
      `}</style>
    </div>
  );
};

export default App;
