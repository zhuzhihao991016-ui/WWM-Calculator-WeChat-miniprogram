import { createStoreBindings } from 'mobx-miniprogram-bindings';
const { createCalculator } = require('../../utils/calculator');
const { getGameData, getLocalGameData } = require('../../utils/cloudData');
const app = getApp()
const { calcStore } = require('../../store/calcStore');

const localGameData = getLocalGameData();
let Schools = localGameData.schools;
let equipmentAffixList = localGameData.equipmentAffixList;
let setMap = localGameData.setMap;
let bonusList = localGameData.bonusList;
let bonusMap = localGameData.bonusMap;
let skills = localGameData.skills;

const PANEL_FIELD_NAMES = {
  physicalMinAttack:   '最小外功攻击',
  physicalMaxAttack:   '最大外功攻击',
  physicalPenetration: '外功穿透',
  physicalBonus:       '外功伤害加成',
  mingjinMin:          '最小鸣金攻击',
  mingjinMax:          '最大鸣金攻击',
  mingjinPen:          '鸣金穿透',
  qiansiMin:           '最小牵丝攻击',
  qiansiMax:           '最大牵丝攻击',
  qiansiPen:           '牵丝穿透',
  lieshiMin:           '最小裂石攻击',
  lieshiMax:           '最大裂石攻击',
  lieshiPen:           '裂石穿透',
  pozhuMin:            '最小破竹攻击',
  pozhuMax:            '最大破竹攻击',
  pozhuPen:            '破竹穿透',
  elementBonus:        '属攻伤害加成',
  precisionRate:       '精准率',
  insightRate:         '会心率',
  directInsightRate:   '直接会心率',
  perfectRate:         '会意率',
  directPerfectRate:   '直接会意率',
  insightDamageBonus:  '会心伤害加成',
  perfectDamageBonus:  '会意伤害加成',
  damageIncrease:      '总增伤',
  allMartialBonus:     '全武学增伤',
  bossBonus:           '首领增伤',
  singleControlBonus:  '单体控制增伤',
  singleBurstBonus:    '单体爆发增伤',
  groupDamageBonus:    '群体伤害增伤',
  groupAbnormalBonus:  '群体异常增伤',
  noteValue1:          '定音技1',
  noteValue2:          '定音技2',
  noteValue3:          '定音技3',
  martialBoostValue1:  '武学增效1',
  martialBoostValue2:  '武学增效2',
};

function buildTuneSkillMap(currentSchool) {
  const map = {
    // 穿透类，固定映射
    '外功穿透': 'physicalPenetration',
    '鸣金穿透': 'mingjinPen',
    '牵丝穿透': 'qiansiPen',
    '裂石穿透': 'lieshiPen',
    '破竹穿透': 'pozhuPen',
  };

  // 从 currentSchool.notes 动态建立 noteValue 映射
  // notes[0] → noteValue1, notes[1] → noteValue2, notes[2] → noteValue3
  const noteFields = ['noteValue1', 'noteValue2', 'noteValue3'];
  const notes = (currentSchool && currentSchool.notes) || [];
  notes.forEach((noteName, idx) => {
    if (noteName && noteName !== 'N/A') {
      map[noteName] = noteFields[idx];
    }
  });

  return map;
}

const AFFIX_GROUPS = [
  {
    label: '基础属性',
    key: 'base',
    items: ['N/A', '劲', '敏', '势', '大外', '小外', '精准率', '会心率', '会意率']
  },
  {
    label: '属攻类',
    key: 'elemental',
    items: ['N/A', '最小鸣金', '最大鸣金', '最小裂石', '最大裂石', '最小牵丝', '最大牵丝', '最小破竹', '最大破竹']
  },
  {
    label: '增伤类',
    key: 'damage',
    items: ['N/A', '全部武学增效', '武学增效1', '武学增效2', '首领增伤', '单体爆发', '单体控制', '群体异常', '群体伤害']
  }
];

const SLOTS = [
  { key: 'leftWeapon', name: '左武器', hasBase: true },
  { key: 'rightWeapon', name: '右武器', hasBase: true },
  { key: 'ring', name: '环', hasBase: true },
  { key: 'pendant', name: '佩', hasBase: true },
  { key: 'hat', name: '冠胄', hasBase: false },
  { key: 'chest', name: '胸甲', hasBase: false },
  { key: 'leg', name: '胫甲', hasBase: false },
  { key: 'wrist', name: '腕甲', hasBase: false }
];

const SLOT_NAME_MAP = {
  leftWeapon: '左武器',
  rightWeapon: '右武器',
  ring: '环',
  pendant: '佩',
  hat: '冠胄',
  chest: '胸甲',
  leg: '胫甲',
  wrist: '腕甲'
};

const QUALITY_NAME_MAP = {
  gold: '金色',
  purple: '紫色'
};

const DEFAULT_EQUIPMENT_LEVEL = 91;
const ARMOR_SLOTS = ['hat', 'chest', 'leg', 'wrist'];
const BASE_SLOTS = ['leftWeapon', 'rightWeapon', 'ring', 'pendant'];

const OCR_IGNORED_ATTR_KEYWORDS = [
  '气血最大值',
  '气血',
  '最大气血',
  '外功防御',
  '内功防御',
  '防御',
];

const OCR_IGNORED_ATTR_EXACT_NAMES = [
  '体',
  '御'
];

function isArmorSlot(slot) {
  return ARMOR_SLOTS.includes(slot);
}

function isBaseSlot(slot) {
  return BASE_SLOTS.includes(slot);
}

function isSameTuneSkillSlotGroup(prevSlot, nextSlot) {
  return (isBaseSlot(prevSlot) && isBaseSlot(nextSlot))
    || (isArmorSlot(prevSlot) && isArmorSlot(nextSlot));
}

// 游戏内定音技名称 → 项目内部定音技名称
const OCR_TUNE_SKILL_NAME_MAP = {
  '无名剑法·蓄力技增伤': '剑蓄力增伤',
  '积矩九剑·流血增伤': '流血增伤',
  '九重春色·武学技增伤': '伞武学增伤',
  '九重春色·特殊技增伤': '伞特殊增伤',
  '嗟夫刀法·蓄力技增伤': '陌刀蓄力增伤',
  '斩雪刀法·轻重击派生技增伤': '横刀派生技增伤',
  '十方破阵·蓄力技增伤': '陌刀蓄力技增伤',
  '粟子游尘·鼠鼠增伤': '鼠鼠增伤',
  '泥犁三垢·强效轻击增伤': '强效轻击增伤',
  '醉梦游春·武学技增伤': '伞武学增伤',
};

// 前四件装备（武器/环/佩）专属定音技
const WEAPON_TUNE_SKILLS = [
  { name: 'N/A' },
  { name: '外功穿透', value: 0 },
  { name: '鸣金穿透', value: 0 },
  { name: '裂石穿透', value: 0 },
  { name: '牵丝穿透', value: 0 },
  { name: '破竹穿透', value: 0 },
];

// 词条名 → form 字段名映射
const AFFIX_TO_FORM = {
  // 外功攻击
  '小外':     'physicalMinAttack',
  '大外':     'physicalMaxAttack',
  '外功穿透': 'physicalPenetration',
  '外功伤害加成': 'physicalBonus',

  // 鸣金
  '最小鸣金': 'mingjinMin',
  '最大鸣金': 'mingjinMax',
  '鸣金穿透': 'mingjinPen',

  // 牵丝
  '最小牵丝': 'qiansiMin',
  '最大牵丝': 'qiansiMax',
  '牵丝穿透': 'qiansiPen',

  // 裂石
  '最小裂石': 'lieshiMin',
  '最大裂石': 'lieshiMax',
  '裂石穿透': 'lieshiPen',

  // 破竹
  '最小破竹': 'pozhuMin',
  '最大破竹': 'pozhuMax',
  '破竹穿透': 'pozhuPen',

  // 属性加成
  '属攻伤害加成': 'elementBonus',

  // 命中与会心
  '精准率':   'precisionRate',
  '会心率':   'insightRate',
  '直接会心率': 'directInsightRate',
  '会意率':   'perfectRate',
  '直接会意率': 'directPerfectRate',

  // 伤害加成
  '会心伤害加成': 'insightDamageBonus',
  '会意伤害加成': 'perfectDamageBonus',
  '总增伤': 'damageIncrease',

  // 武学加成
  '全部武学增效':   'allMartialBonus',
  '首领增伤':     'bossBonus',
  '单体控制':     'singleControlBonus',
  '单体爆发':     'singleBurstBonus',
  '群体伤害':     'groupDamageBonus',
  '群体异常':     'groupAbnormalBonus',

  // 定音技
  '定音1':    'noteValue1',
  '定音2':    'noteValue2',
  '定音3':    'noteValue3',

  // 武学增效
  '武学增效1': 'martialBoostValue1',
  '武学增效2': 'martialBoostValue2',
};

/**
 * 将一组装备的词条叠加到 baseForm 上，返回新的 overrideForm
 * 不修改原 baseForm
 */
function applyComboToForm(combo, baseForm, tuneSkillMap) {
  const result = {};
  for (const key of Object.keys(baseForm)) {
    result[key] = parseFloat(baseForm[key]) || 0;
  }

  for (const equip of combo) {

    // ── 0. 基础属性（baseAttrs）─────────────────────────────────
    // 修复：使用完整的 AFFIX_TO_FORM 映射，覆盖所有可能的 baseAttrs 字段名
    if (equip.baseAttrs) {
      Object.entries(equip.baseAttrs).forEach(([attrName, attrVal]) => {
        const v = parseFloat(attrVal) || 0;
        // baseAttrs 的名称与 resolveAffix 中的 case 名一致（如 '最小外功'、'最大外功'）
        // 这里直接枚举所有已知 baseAttrs 名称，确保与 doCalibration 对称
        const baseAttrMap = {
          '最小外功': 'physicalMinAttack',
          '最大外功': 'physicalMaxAttack',
          '小外':     'physicalMinAttack',
          '大外':     'physicalMaxAttack',
          // 理论上 baseAttrs 只有外功/属攻基础值，但防御性地全量覆盖
          '最小鸣金': 'mingjinMin',
          '最大鸣金': 'mingjinMax',
          '最小裂石': 'lieshiMin',
          '最大裂石': 'lieshiMax',
          '最小牵丝': 'qiansiMin',
          '最大牵丝': 'qiansiMax',
          '最小破竹': 'pozhuMin',
          '最大破竹': 'pozhuMax',
        };
        const formKey = baseAttrMap[attrName];
        if (formKey && formKey in result) {
          result[formKey] = (result[formKey] || 0) + v;
        }
      });
    }

    // ── 1. 定音技能（tuneSkill）──────────────────────────────────
    const tune = equip.tuneSkill;
    if (tune && tune.name && tune.name !== 'N/A') {
      const tuneKey = tuneSkillMap[tune.name];
      if (tuneKey && tuneKey in result) {
        result[tuneKey] = (result[tuneKey] || 0) + (parseFloat(tune.value) || 0);
      } else if (tuneKey === undefined) {
      }
    }

    // ── 2. 装备词条（affixes）────────────────────────────────────
    for (const affix of (equip.affixes || [])) {
      if (affix.isNA) continue;

      // 修复核心：isPercent 词条存储的是小数（如0.064），
      // 必须先还原为百分数单位（6.4），与 doCalibration 的 rawVal 保持一致
      // 这样后续所有系数运算的基准单位才相同
      const rawValue = affix.isPercent
        ? (parseFloat(affix.value) || 0) * 100   // 0.064 → 6.4，与校准时的 rawVal 完全一致
        : (parseFloat(affix.value) || 0);

      // ── 劲/敏/势 特殊转换（与 resolveAffix 完全镜像）──────────
      if (affix.name === '劲') {
        result['physicalMaxAttack'] = (result['physicalMaxAttack'] || 0) + rawValue * 1.36;
        result['physicalMinAttack'] = (result['physicalMinAttack'] || 0) + rawValue * 0.225;
        continue;
      }

      if (affix.name === '敏') {
        // 修复：字段名从 precisionRate 改为 insightRate，系数从 0.078 改为 0.076
        result['physicalMinAttack'] = (result['physicalMinAttack'] || 0) + rawValue * 0.9;
        result['insightRate']       = (result['insightRate']       || 0) + rawValue * 0.076 * 0.77;
        continue;
      }

      if (affix.name === '势') {
        // 修复：字段名从 insightRate 改为 perfectRate
        result['physicalMaxAttack'] = (result['physicalMaxAttack'] || 0) + rawValue * 0.9;
        result['perfectRate']       = (result['perfectRate']       || 0) + rawValue * 0.038 * 0.77;
        continue;
      }

      // ── 精准率/会心率/会意率 带系数转换（与 resolveAffix 完全镜像）─
      // 修复：这三个词条不能走普通映射路径（直接加值），
      // 必须与 resolveAffix 一样乘以对应系数
      if (affix.name === '精准率') {
        result['precisionRate'] = (result['precisionRate'] || 0) + rawValue * 0.9;
        continue;
      }
      if (affix.name === '会心率') {
        result['insightRate'] = (result['insightRate'] || 0) + rawValue * 0.77;
        continue;
      }
      if (affix.name === '会意率') {
        result['perfectRate'] = (result['perfectRate'] || 0) + rawValue * 0.77;
        continue;
      }

      // ── 普通词条映射（直接加值，无系数换算）─────────────────────
      const formKey = AFFIX_TO_FORM[affix.name];
      if (!formKey) continue;
      if (!(formKey in result)) continue;

      // 普通词条到这里 rawValue 已经是正确单位了（isPercent 的已经 *100），直接加
      result[formKey] = (result[formKey] || 0) + rawValue;
    }
  }

  const finalForm = {};
  for (const key of Object.keys(result)) {
    finalForm[key] = result[key] === 0 ? '' : String(result[key]);
  }
  return finalForm;
}

function normalizeScoreForm(form) {
  const result = {};
  Object.keys(form || {}).forEach(key => {
    const n = parseFloat(form[key]);
    if (isNaN(n) || n === 0) {
      result[key] = '';
    } else {
      result[key] = String(Math.round((n + Number.EPSILON) * 10000) / 10000);
    }
  });
  return result;
}

function cleanDisplayNumber(num, digits = 4) {
  const n = parseFloat(num);
  if (isNaN(n)) return '0';
  const factor = Math.pow(10, digits);
  const rounded = Math.round((n + Number.EPSILON) * factor) / factor;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function formatAffixDisplayValue(affix) {
  if (!affix || affix.isNA) return 'N/A';
  const value = parseFloat(affix.value) || 0;
  return affix.isPercent
    ? `${cleanDisplayNumber(value * 100, 4)}%`
    : cleanDisplayNumber(value, 4);
}

function normalizeEquipmentAffixDisplay(equipment) {
  return {
    ...equipment,
    affixes: (equipment.affixes || []).map(affix => ({
      ...affix,
      displayValue: formatAffixDisplayValue(affix),
    })),
  };
}

function createEquipmentScoreContext(snapshot, basePanel) {
  if (!snapshot || !basePanel || Object.keys(basePanel).length === 0) return null;
  if (!snapshot.currentAxis || !snapshot.currentAxis.axisName) return null;
  if (!snapshot.currentSchool || !snapshot.currentSchool.schoolName) return null;

  const tuneSkillMap = buildTuneSkillMap(snapshot.currentSchool);
  const baseForm = normalizeScoreForm(basePanel);
  const calcContext = {
    form: baseForm,
    currentSchool: snapshot.currentSchool,
    currentTarget: snapshot.currentTarget,
    currentSkill: snapshot.currentSkill,
    currentAxis: snapshot.currentAxis,
    selectedSet: snapshot.selectedSet,
    selectedMentalities: snapshot.selectedMentalities,
    selectedTiangong: snapshot.selectedTiangong,
    selectedFood: snapshot.selectedFood,
    setMap,
    bonusMap,
    skills,
  };
  const calc = createCalculator(calcContext);
  const baseDps = calc.calculateDpsWithForm(baseForm);
  if (!baseDps || baseDps <= 0) return null;

  return { baseForm, baseDps, calcContext, tuneSkillMap };
}

function normalizeCalcSnapshot(snapshot) {
  if (snapshot && snapshot.context) {
    return {
      selectedMentalities: snapshot.context.selectedMentalities || [],
      selectedTiangong: snapshot.context.selectedTiangong || '',
      selectedFood: snapshot.context.selectedFood || '',
      currentAxis: snapshot.context.currentAxis || null,
      currentSchool: snapshot.context.currentSchool || {},
      currentTarget: snapshot.context.currentTarget || {},
      selectedSet: snapshot.context.selectedSet || '',
      currentSkill: snapshot.context.currentSkill || null,
    };
  }
  return snapshot || null;
}

function calculateDpsForAffixes(scoreContext, equipment, affixes) {
  const scoreEquip = {
    slot: equipment.slot,
    affixes: affixes || [],
    baseAttrs: {},
    tuneSkill: null,
  };
  const rawForm = applyComboToForm([scoreEquip], scoreContext.baseForm, scoreContext.tuneSkillMap);
  const overrideForm = normalizeScoreForm(rawForm);
  const calc = createCalculator({ ...scoreContext.calcContext, form: overrideForm });
  return calc.calculateDpsWithForm(overrideForm) || scoreContext.baseDps;
}

function formatEquipmentScore(score) {
  const n = parseFloat(score);
  if (!n || n <= 0) return '0.00';
  return n.toFixed(2);
}

function stripEquipmentScoreFields(equipment) {
  const {
    score,
    scoreText,
    projectedDps,
    projectedDpsText,
    scoreReady,
    affixNames,
    slotName,
    qualityName,
    _index,
    ...cleanEquipment
  } = equipment || {};
  cleanEquipment.affixes = (cleanEquipment.affixes || []).map((affix) => {
    const {
      score,
      scoreText,
      displayValue,
      _scoreIndex,
      ...cleanAffix
    } = affix || {};
    return cleanAffix;
  });
  return cleanEquipment;
}

function scoreEquipment(equipment, scoreContext) {
  const affixes = (equipment.affixes || []).map((affix, index) => ({ ...affix, _scoreIndex: index }));
  const activeAffixes = affixes.filter(affix => !affix.isNA);
  if (!scoreContext || activeAffixes.length === 0) {
    return {
      score: 0,
      scoreText: scoreContext ? '0.00' : '--',
      projectedDps: scoreContext ? scoreContext.baseDps : 0,
      projectedDpsText: scoreContext ? scoreContext.baseDps.toFixed(2) : '--',
      affixes: affixes.map(affix => ({ ...affix, score: 0, scoreText: scoreContext ? '0.00' : '--' })),
    };
  }

  const fullDps = calculateDpsForAffixes(scoreContext, equipment, activeAffixes);
  const equipmentScore = Math.max(0, fullDps - scoreContext.baseDps);

  const rawAffixScores = activeAffixes.map((affix) => {
    const withoutAffixes = activeAffixes.filter(item => item._scoreIndex !== affix._scoreIndex);
    const dpsWithout = calculateDpsForAffixes(scoreContext, equipment, withoutAffixes);
    return {
      index: affix._scoreIndex,
      rawScore: Math.max(0, fullDps - dpsWithout),
    };
  });
  const rawTotal = rawAffixScores.reduce((sum, item) => sum + item.rawScore, 0);
  const scoreMap = {};
  rawAffixScores.forEach(item => {
    scoreMap[item.index] = rawTotal > 0
      ? equipmentScore * item.rawScore / rawTotal
      : equipmentScore / activeAffixes.length;
  });

  return {
    score: equipmentScore,
    scoreText: formatEquipmentScore(equipmentScore),
    projectedDps: fullDps,
    projectedDpsText: fullDps > 0 ? fullDps.toFixed(2) : '--',
    affixes: affixes.map(affix => {
      const score = affix.isNA ? 0 : (scoreMap[affix._scoreIndex] || 0);
      return {
        ...affix,
        score,
        scoreText: scoreContext ? formatEquipmentScore(score) : '--',
      };
    }),
  };
}

function validateScoreOrder(scoredList) {
  const list = (scoredList || [])
    .filter(item => item.scoreReady)
    .map(item => ({
      name: item.name,
      score: parseFloat(item.score) || 0,
      projectedDps: parseFloat(item.projectedDps) || 0,
    }));
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i];
      const b = list[j];
      if (a.score > b.score && a.projectedDps < b.projectedDps) {
        return { passed: false, message: `${a.name} > ${b.name}` };
      }
      if (b.score > a.score && b.projectedDps < a.projectedDps) {
        return { passed: false, message: `${b.name} > ${a.name}` };
      }
    }
  }
  return { passed: true, message: list.length ? `已验证 ${list.length} 件装备` : '暂无可验证装备' };
}

/**
 * 将一件装备的所有词条叠加到 form 上，返回新 form
 * @param {object} equipment - 装备对象，含 affixes 数组
 * @param {object} form      - 当前基础 form
 * @param {object} currentSchool
 * @param {function} buildOverrideForm - 来自 calculator
 */
function applyEquipmentToForm(equipment, form, currentSchool, buildOverrideForm) {
  let f = Object.assign({}, form);
  const affixes = equipment.affixes || [];
  for (const affix of affixes) {
    if (!affix || affix.name === 'N/A' || affix.isNA) continue;
    // 构造与 buildOverrideForm 兼容的 affix 结构
    const affixDef = {
      name:    affix.name,
      max:     parseFloat(affix.value) || 0,   // 用实际填写值而非满值
      convert: parseFloat(affix.value) * (affix.convert / affix.max || 1) || 0,
    };
    const result = buildOverrideForm(affixDef, f, currentSchool);
    if (result) f = result;
  }
  return f;
}

/**
 * 将装备库按部位分组，返回 { slotKey: [equip, ...] }
 */
function groupEquipmentBySlot(equipmentList) {
  const map = {};
  for (const equip of equipmentList) {
    const key = equip.slot;
    if (!map[key]) map[key] = [];
    map[key].push(equip);
  }
  return map;
}

/**
 * 生成所有部位组合的笛卡尔积
 * @param {Array[]} groups - 每个部位的装备数组列表，顺序固定
 * @returns {Array[]} - 每个元素是一套装备（长度等于部位数）
 */
function cartesianProduct(groups) {
  return groups.reduce((acc, group) => {
    const result = [];
    for (const existing of acc) {
      for (const item of group) {
        result.push([...existing, item]);
      }
    }
    return result;
  }, [[]]);
}

/**
 * 分批异步执行，避免阻塞主线程
 * @param {Array}    tasks      - 任务数组
 * @param {number}   batchSize  - 每批数量
 * @param {function} processor  - (task) => result
 * @param {function} onProgress - (done, total) => void
 * @returns {Promise<Array>}
 */
function runInBatches(tasks, batchSize, processor, onProgress) {
  return new Promise(resolve => {
    const results = [];
    let index = 0;

    function nextBatch() {
      const end = Math.min(index + batchSize, tasks.length);
      while (index < end) {
        results.push(processor(tasks[index]));
        index++;
      }
      onProgress && onProgress(index, tasks.length);

      if (index < tasks.length) {
        setTimeout(nextBatch, 0);  // 让出主线程
      } else {
        resolve(results);
      }
    }
    nextBatch();
  });
}

Page({
  data: {
    slots: SLOTS,
    affixList: equipmentAffixList,
    displayAffixList: [],
    newEquipmentSlotName: '左武器',
    tuneSkills: [],
    ocrLoading: false,
    ocrRawText: '',
    ocrParsedResult: null,
    showOcrPreviewDialog: false,   
    
    showAddDialog: false,
    showAffixDialog: false,
    showTuneDialog: false,
    showCalibrationDialog: false,

    filteredList: [],
    filterRow1: [
      { key: 'leftWeapon', name: '左武器' },
      { key: 'rightWeapon', name: '右武器' },
      { key: 'hat', name: '冠胄' },
      { key: 'chest', name: '胸甲' },
    ],
    filterRow2: [
      { key: 'ring', name: '环' },
      { key: 'pendant', name: '佩' },
      { key: 'leg', name: '胫甲' },
      { key: 'wrist', name: '腕甲' },
    ],
    filterSlot: 'all',
    
    newEquipment: {
      name: '',
      slot: 'leftWeapon',
      quality: 'gold',
      level: DEFAULT_EQUIPMENT_LEVEL,
      baseAttrs: {},
      affixes: [],
      tuneSkill: null
    },

    qualityOptions: ['紫色', '金色'],
    levelOptions: [81, 86, 91],

    showAffixPicker: false,
    currentTuneSkills: [],
    tuneNeedValue: false,

    affixPickerGroupIndex: 0,
    affixPickerItems: [],
    affixPickerStep: 'pick',   // 'pick' = 选词条列表，'input' = 填数值
    tempAffix: {},
    affixPickerGroups: AFFIX_GROUPS,

    showDetailDialog: false,
    detailEquipment: null,
    basePanelDisplay: [],
    scoreStatusText: '',
    flowStatus: {
      hasSession: false,
      hasBasePanel: false,
      hasFullSlots: false,
      sessionText: '未完成面板计算',
      basePanelText: '未校准基础面板',
      slotText: '装备候选未满 8 部位'
    },

    isEditing: false,
    editingIndex: -1,

    calibrationEquipments: {}, // 校准用的8件装备

    panelCollapsed: false,

    traverseDebugPayload: null,
  },

  noop() {
    // 阻止事件冒泡，不需要任何逻辑
  },

  onLoad() {
    this.loadData();
    this._storeBindings = createStoreBindings(this, {
      store: app.equipmentStore,
      fields: [
        'form',
        'currentTarget',
        'equipmentList',
        'selectedEquipment',
        'basePanel',
        'currentSchool',
        'calcContextSnapshot'
      ],
      actions: [
        'addEquipment',
        'removeEquipment',
        'clearAllEquipment',
        'selectEquipment',
        'setBasePanel',
        'setCurrentSchool'
      ]
    });
    getGameData().then(gameData => {
      this.applyGameData(gameData);
      this.loadCurrentSchool();
      this.updateFilteredList();
    });
  },

  onShow() {
    this.updateFilteredList();
  },

  applyGameData(gameData) {
    Schools = gameData.schools || Schools;
    equipmentAffixList = gameData.equipmentAffixList || equipmentAffixList;
    setMap = gameData.setMap || setMap;
    bonusList = gameData.bonusList || bonusList;
    bonusMap = gameData.bonusMap || bonusMap;
    skills = gameData.skills || skills;

    this.setData({
      affixList: equipmentAffixList,
    });
  },

    onUnload() {
      if (this._storeBindings) {
        this._storeBindings.destroyStoreBindings();
    }
  },

  loadData() {
    const saved = wx.getStorageSync('equipmentData');
    if (saved) {
      if (saved.equipmentList) {
        app.equipmentStore.equipmentList = saved.equipmentList;
      }
      if (saved.basePanel) {
        app.equipmentStore.setBasePanel(saved.basePanel);
        this.setData({ basePanelDisplay: this.buildBasePanelDisplay(saved.basePanel) });
      }
    }
  },

  loadCurrentSchool() {
    const calcData = wx.getStorageSync('calcStore');
    if (calcData?.currentSchool) {
      const school = Schools.find(s => s.schoolName === calcData.currentSchool);
      app.equipmentStore.setCurrentSchool(school);
      this.setData({
        displayAffixList: this.buildAffixList(school)
      });
    } else {
      this.setData({
        displayAffixList: this.buildAffixList(null)
      });
    }
  },

  openAffixPickerDialog() {
    if (this.data.newEquipment.affixes.length >= 5) {
      wx.showToast({ title: '最多添加5条词条', icon: 'none' });
      return;
    }
    this.setData({
      showAffixPicker: true,
      affixPickerGroupIndex: 0,
      affixPickerItems: this.buildAffixPickerItems(0),
    });
  },
  
  
  closeAffixPicker() {
    this.setData({ showAffixPicker: false });
  },
  
  

  onAffixGroupTab(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      affixPickerGroupIndex: index,
      affixPickerItems: this.buildAffixPickerItems(index),
    });
  },

  buildAffixPickerItems(groupIndex) {
    const group = AFFIX_GROUPS[groupIndex];
    const currentSchool = this.data.currentSchool || {};
    const boost1Name = currentSchool.martialBoost1Name || '武学增效1';
    const boost2Name = currentSchool.martialBoost2Name || '武学增效2';
  
    return group.items.map(name => {
      // 名称映射：将通用名替换为流派专属名
      let displayName = name;
      if (name === '武学增效1') displayName = boost1Name;
      if (name === '武学增效2') displayName = boost2Name;
  
      // 查原始数据时仍用原始 name 查，因为 equipmentAffixList 里存的是通用名
      const found = equipmentAffixList.find(a => a.name === name);
      return found
        ? {
            name:        found.name,       // 存储/计算仍用原始 key
            displayName: displayName,      // 展示用流派专属名
            max:         found.max,
            isPercent:   found.isPercent,
            isNA:        found.max === 0,
          }
        : {
            name:        name,
            displayName: displayName,
            max:         0,
            isPercent:   false,
            isNA:        true,
          };
    });
  },
  
  
  onAffixPickerSelect(e) {
    const affixName = e.currentTarget.dataset.name;
    const affixObj = equipmentAffixList.find(a => a.name === affixName);
    if (!affixObj) return;
  
    if (affixObj.name === 'N/A') {
      // N/A 直接写入，不需要填数值
      const affixes = [...this.data.newEquipment.affixes];
      affixes.push({
        name: 'N/A',
        value: 0,
        max: 0,
        isPercent: false,
        isNA: true,
      });
      this.setData({
        'newEquipment.affixes': affixes,
        showAffixPicker: false,
      });
      return;
    }
  
    // 非 N/A：进入数值输入子面板
    this.setData({
      affixPickerStep: 'input',
      tempAffix: {
        name:      affixObj.name,
        max:       affixObj.max,
        convert:   affixObj.convert,
        isPercent: affixObj.isPercent,
        isNA:      false,
        value:     affixObj.max,  // 默认满值
      },
    });
  },

  // 数值输入
onInputAffixValue(e) {
  this.setData({ 'tempAffix.value': e.detail.value });
},

// 返回词条列表
onAffixPickerBack() {
  this.setData({ affixPickerStep: 'pick' });
},

confirmAddAffix() {
  const { tempAffix } = this.data;
  if (!tempAffix.name) return;
  const val = parseFloat(tempAffix.value);
  if (isNaN(val) || val <= 0) {
    wx.showToast({ title: '请输入有效数值', icon: 'none' });
    return;
  }
  if (val > tempAffix.max) {
    wx.showToast({ title: `数值不能超过满值 ${tempAffix.max}`, icon: 'none' });
    return;
  }
  const affixes = [...this.data.newEquipment.affixes];
  affixes.push({
    name:      tempAffix.name,
    value:     tempAffix.isPercent ? val / 100 : val,
    max:       tempAffix.max,
    convert:   tempAffix.convert,
    isPercent: tempAffix.isPercent,
    isNA:      false,
  });
  affixes[affixes.length - 1].displayValue = formatAffixDisplayValue(affixes[affixes.length - 1]);
  this.setData({
    'newEquipment.affixes': affixes,
    showAffixPicker: false,
    affixPickerStep: 'pick',
    tempAffix: {},
  });
},

  buildAffixList(school) {
    return equipmentAffixList.map(a => {
      if (a.name === '武学增效1') {
        return { 
          ...a, 
          name: school?.martialBoost1Name ?? '武学增效1',
          originalName: '武学增效1'  // 保留原始key用于计算
        };
      }
      if (a.name === '武学增效2') {
        return { 
          ...a, 
          name: school?.martialBoost2Name ?? '武学增效2',
          originalName: '武学增效2'
        };
      }
      return { ...a, originalName: a.name };
    });
  },

  buildTuneSkills(school, slot) {
    const isWeaponSlot = ['leftWeapon', 'rightWeapon', 'ring', 'pendant'].includes(slot);
  
    if (isWeaponSlot) {
      return WEAPON_TUNE_SKILLS.map(s => ({ ...s, name: String(s.name) }));
    }
  
    const currentSchool = school || app.equipmentStore.currentSchool;
  
    if (!currentSchool) return [{ name: 'N/A' }];
  
    const list = currentSchool.notes
      ?.filter(n => n && n !== 'N/A')
      .map(n => ({ name: String(n) })) || [];
  
    return [{ name: 'N/A' }, ...list];
  },

  saveData() {
    wx.setStorageSync('equipmentData', {
      equipmentList: app.equipmentStore.equipmentList,
      basePanel: app.equipmentStore.basePanel,
      rawPanel: app.equipmentStore.rawPanel,
    });
  },

  // 筛选器
  onFilterTap(e) {
    const slot = e.currentTarget.dataset.slot;
    const next = this.data.filterSlot === slot ? 'all' : slot;
    this.setData({ filterSlot: next });
    this.updateFilteredList();
  },

  updateFilteredList() {
    const { filterSlot } = this.data;
    const session = calcStore.getCalcSession && calcStore.getCalcSession();
    const snapshot = normalizeCalcSnapshot(
      this.data.calcContextSnapshot
      || app.equipmentStore.calcContextSnapshot
      || session
    );
    const basePanel = this.data.basePanel || app.equipmentStore.basePanel || session?.panelInput;
    const scoreContext = createEquipmentScoreContext(snapshot, basePanel);
    const list = app.equipmentStore.equipmentList.map(eq => {
      const displayEquip = normalizeEquipmentAffixDisplay(eq);
      return {
      ...displayEquip,
      ...scoreEquipment(displayEquip, scoreContext),
      scoreReady: !!scoreContext,
      slotName: SLOT_NAME_MAP[eq.slot] ?? eq.slot,
      qualityName: QUALITY_NAME_MAP[eq.quality] ?? eq.quality,
      affixNames: (eq.affixes ?? [])
        .filter(a => !a.isNA)
        .map(a => a.name)
        .slice(0, 5)
        .join(' | ')
    };
    });
    const validation = validateScoreOrder(list);
    this.setData({
      filteredList: filterSlot === 'all'
        ? list
        : list.filter(eq => eq.slot === filterSlot),
      scoreStatusText: scoreContext
        ? validation.message
        : '请先在计算器计算并校准基础面板',
      flowStatus: this.buildFlowStatus(snapshot, basePanel, list)
    });
  },

  buildFlowStatus(snapshot, basePanel, list) {
    const hasSession = !!(snapshot && snapshot.currentAxis && snapshot.currentAxis.axisName);
    const hasBasePanel = !!(basePanel && Object.keys(basePanel).length > 0);
    const filledSlotCount = new Set((list || []).map(eq => eq.slot).filter(Boolean)).size;
    const hasFullSlots = filledSlotCount >= SLOTS.length;
    const schoolName = snapshot?.currentSchool?.schoolName || '';
    const axisName = snapshot?.currentAxis?.axisName || '';

    return {
      hasSession,
      hasBasePanel,
      hasFullSlots,
      sessionText: hasSession ? `已计算：${schoolName} / ${axisName}` : '未完成面板计算',
      basePanelText: hasBasePanel ? '已校准基础面板' : '未校准基础面板',
      slotText: hasFullSlots ? '8 个部位均有候选' : `已有 ${filledSlotCount}/${SLOTS.length} 个部位候选`
    };
  },

  // 获取筛选后的装备列表
  getFilteredEquipment() {
    const { filterSlot, equipmentList } = this.data;
    if (filterSlot === 'all') return equipmentList;
    return equipmentList.filter(e => e.slot === filterSlot);
  },

  // 打开添加装备对话框
  openAddDialog() {
    const defaultSlot = 'leftWeapon';
    const defaultQuality = 'gold';
    const defaultLevel = DEFAULT_EQUIPMENT_LEVEL;
    const attrs = this.calculateBaseAttack(defaultSlot, defaultQuality, defaultLevel);
    const currentSchool = app.equipmentStore.currentSchool;
    const levelIndex = this.data.levelOptions.indexOf(defaultLevel);

    const allList = app.equipmentStore.equipmentList || [];
    const slotCount = allList.filter(eq => eq.slot === defaultSlot).length;
    const defaultName = `默认${SLOT_NAME_MAP[defaultSlot]}${slotCount + 1}`;
  
    this.setData({
      showAddDialog: true,
      newEquipmentSlotName: '左武器',
      selectedAffixNames: {},
      currentTuneSkills: this.buildTuneSkills(currentSchool, defaultSlot),
      qualityIndex: 1,
      levelIndex: levelIndex >= 0 ? levelIndex : 1,
      slotIndex: 0,
      newEquipment: {
        name: defaultName,
        slot: defaultSlot,
        quality: defaultQuality,
        level: defaultLevel,
        baseAttrs: attrs,
        affixes: [],
        tuneSkill: null,
        tuneSkillValue: 0,
      }
    });
  },

  async testEquipmentOcr() {
    try {
      const chooseRes = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      })
  
      const filePath = chooseRes.tempFiles[0].tempFilePath
  
      wx.showLoading({
        title: '上传中...',
        mask: true
      })
  
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `equipment-ocr/${Date.now()}.jpg`,
        filePath
      })
  
      wx.showLoading({
        title: '识别中...',
        mask: true
      })
  
      const res = await wx.cloud.callFunction({
        name: 'equipmentOcr',
        data: {
          fileID: uploadRes.fileID
        }
      })
  
      wx.hideLoading()
  
      wx.showModal({
        title: 'OCR识别结果',
        content: res.result?.rawText || res.result?.message || '无识别结果',
        showCancel: false
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '识别失败',
        icon: 'none'
      })
    }
  },

  // 选择游戏截图并识别装备
async handleOcrAddEquipment() {
  try {
    this.setData({ ocrLoading: true })
    const chooseRes = await wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed']
    })

    const file = chooseRes.tempFiles?.[0]
    if (!file || !file.tempFilePath) {
      wx.showToast({ title: '未选择图片', icon: 'none' })
      return
    }

    // 腾讯云 OCR 对图片体积有限制，这里前端先做一道保护
    const sizeMB = file.size / 1024 / 1024
    if (sizeMB > 5) {
      wx.showToast({ title: '图片过大，请裁剪后重试', icon: 'none' })
      return
    }

    wx.showLoading({ title: '识别中...', mask: true })

    const cloudPath = `equipment-ocr/${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`

    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath: file.tempFilePath
    })

    const ocrRes = await wx.cloud.callFunction({
      name: 'equipmentOcr',
      data: {
        fileID: uploadRes.fileID
      }
    })

    wx.hideLoading()

    const result = ocrRes.result || {}

    if (result.code !== 0) {
      wx.showToast({
        title: result.message || '识别失败',
        icon: 'none'
      })
      return
    }

    const rawText = result.rawText || ''
    const parsed = this.parseEquipmentOcrResult(result)

    if (!parsed) {
      this.setData({
        ocrRawText: rawText,
        ocrParsedResult: null,
        showOcrPreviewDialog: true
      })
      wx.showToast({ title: '未能解析装备，请手动核对', icon: 'none' })
      return
    }

    this.fillOcrEquipmentToDialog(parsed, rawText)
  } catch (err) {
    wx.hideLoading()
    wx.showToast({ title: 'OCR 添加失败', icon: 'none' })
  } finally {
    this.setData({ ocrLoading: false })
  }
},

parseEquipmentOcrResult(ocrResult) {
  const rawText = ocrResult.rawText || ''
  const mergedLines = this.mergeOcrLinesByPosition(ocrResult.lines || [])

  if (mergedLines.length) {
    return this.parseEquipmentOcrText(mergedLines.join('\n'))
  }

  return this.parseEquipmentOcrText(rawText)
},

mergeOcrLinesByPosition(ocrLines) {
  if (!Array.isArray(ocrLines) || !ocrLines.length) return []

  const items = ocrLines
    .map(item => {
      const polygon = item.polygon || item.Polygon || []
      const xs = polygon.map(p => p.X || p.x || 0)
      const ys = polygon.map(p => p.Y || p.y || 0)

      if (!xs.length || !ys.length) {
        return null
      }

      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const centerY = (minY + maxY) / 2

      return {
        text: this.cleanOcrLine(item.text || item.DetectedText || ''),
        minX,
        maxX,
        minY,
        maxY,
        centerY
      }
    })
    .filter(item => item && item.text)

  items.sort((a, b) => {
    if (Math.abs(a.centerY - b.centerY) > 12) {
      return a.centerY - b.centerY
    }
    return a.minX - b.minX
  })

  const rows = []

  items.forEach(item => {
    const row = rows.find(r => Math.abs(r.centerY - item.centerY) <= 14)

    if (row) {
      row.items.push(item)
      row.centerY = row.items.reduce((sum, x) => sum + x.centerY, 0) / row.items.length
    } else {
      rows.push({
        centerY: item.centerY,
        items: [item]
      })
    }
  })

  return rows.map(row => {
    row.items.sort((a, b) => a.minX - b.minX)

    return row.items
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  })
},

cleanOcrLine(line) {
  return String(line || '')
    .replace(/[：]/g, ':')
    .replace(/[·•]/g, '.')
    .replace(/[＋+]/g, '')
    .replace(/[％]/g, '%')
    .replace(/\s+/g, '')
    .trim()
},

parseEquipmentOcrText(rawText) {
  if (!rawText) return null

  const text = rawText
    .replace(/[：]/g, ':')
    .replace(/[·•]/g, '.')
    .replace(/[＋+]/g, '')
    .replace(/[％]/g, '%')

  const lines = text
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  const slot = this.guessSlotFromOcr(lines)
  const level = this.guessLevelFromOcr(lines)
  const name = this.guessEquipmentNameFromOcr(lines, slot)

  const parsedBaseAttrs = this.parseBaseAttrsFromOcr(lines, slot)
  const quality = this.guessQualityFromOcr(lines, slot, level, parsedBaseAttrs)

  const finalSlot = slot || 'leftWeapon'
  const finalLevel = level || 86
  const finalQuality = quality || 'gold'

  // 防具基础属性不参与毕业度，直接忽略
  const baseAttrs = isArmorSlot(finalSlot) ? {} : parsedBaseAttrs

  const tune = this.parseTuneSkillFromOcr(lines, finalSlot)

  const affixes = this.parseAffixesFromOcr(lines, {
    slot: finalSlot,
    tuneSkillName: tune ? tune.name : null
  })

  if (!slot && affixes.length === 0 && !tune && !Object.keys(baseAttrs).length) {
    return null
  }

  const fallbackBaseAttrs = isBaseSlot(finalSlot)
    ? this.calculateBaseAttack(finalSlot, finalQuality, finalLevel)
    : {}

  return {
    name: name || `识别${SLOT_NAME_MAP[finalSlot] || '装备'}${Date.now().toString().slice(-4)}`,
    slot: finalSlot,
    quality: finalQuality,
    level: finalLevel,
    baseAttrs: Object.keys(baseAttrs).length ? baseAttrs : fallbackBaseAttrs,
    affixes,
    tuneSkill: tune ? tune.name : null,
    tuneSkillValue: tune ? String(tune.value || '') : '',
  }
},

guessSlotFromOcr(lines) {
  const allText = lines.join(' ').replace(/\s/g, '')

  const slotRules = [
    {
      key: 'leftWeapon',
      names: ['左武器', '主武器', '武器.陌刀', '武器陌刀', '陌刀', '武器']
    },
    {
      key: 'rightWeapon',
      names: ['右武器', '副武器']
    },
    {
      key: 'ring',
      names: ['环', '戒指', '指环']
    },
    {
      key: 'pendant',
      names: ['佩', '玉佩', '挂饰']
    },
    {
      key: 'hat',
      names: ['冠胄', '头盔', '帽', '冠']
    },
    {
      key: 'chest',
      names: ['胸甲', '衣甲', '衣', '甲']
    },
    {
      key: 'leg',
      names: ['胫甲', '腿甲', '护腿', '腿']
    },
    {
      key: 'wrist',
      names: ['腕甲', '护腕', '腕']
    }
  ]

  // 优先匹配更具体的防具/饰品/左右武器
  for (const rule of slotRules) {
    if (rule.names.some(name => allText.includes(name))) {
      return rule.key
    }
  }

  return null
},

guessQualityFromOcr(lines, slot, level, baseAttrs) {
  const allText = lines.join(' ')

  // OCR 如果真的识别出了颜色文字，就直接用
  if (allText.includes('紫色') || allText.includes('紫品')) {
    return 'purple'
  }

  if (allText.includes('金色') || allText.includes('金品')) {
    return 'gold'
  }

  // 防具品阶不影响毕业度，也无法从基础属性反推，统一默认金色
  if (!slot || isArmorSlot(slot)) {
    return 'gold'
  }

  // 武器/环/佩：用基础属性反推品阶
  const inferred = this.inferQualityByBaseAttrs(slot, level || 86, baseAttrs || {})
  if (inferred) return inferred

  return 'gold'
},

inferQualityByBaseAttrs(slot, level, baseAttrs) {
  if (!isBaseSlot(slot)) return null
  if (!baseAttrs || Object.keys(baseAttrs).length === 0) return null

  const qualityList = ['gold', 'purple']

  for (const quality of qualityList) {
    const expected = this.calculateBaseAttack(slot, quality, level)
    if (this.isSameBaseAttrs(baseAttrs, expected)) {
      return quality
    }
  }

  return null
},

isSameBaseAttrs(actual, expected) {
  if (!actual || !expected) return false

  const expectedKeys = Object.keys(expected)
  if (!expectedKeys.length) return false

  return expectedKeys.every(key => {
    const actualValue = Number(actual[key])
    const expectedValue = Number(expected[key])

    if (isNaN(actualValue) || isNaN(expectedValue)) return false

    // OCR 可能识别成 41.0、41，允许 0.6 的误差
    return Math.abs(actualValue - expectedValue) <= 0.6
  })
},

guessLevelFromOcr(lines) {
  const allText = lines.join(' ')

  const levelMatch = allText.match(/(\d{2,3})\s*阶/)
  if (levelMatch) {
    return Number(levelMatch[1])
  }

  if (/91/.test(allText)) return 91
  if (/86/.test(allText)) return 86
  if (/81/.test(allText)) return 81

  return 86
},

guessEquipmentNameFromOcr(lines, slot) {
  const badKeywords = [
    '装备中',
    '装备等阶',
    '装备',
    '造诣',
    '气血',
    '外功攻击',
    '外功防御',
    '武器',
    '陌刀',
    '胸甲',
    '冠胄',
    '胫甲',
    '腕甲',
    '属性',
    '词条',
    '穿戴',
    '绑定',
    '推荐',
    '荐',
    '外功',
    '鸣金',
    '牵丝',
    '裂石',
    '破竹',
    '会心',
    '会意',
    '精准',
    '增伤',
    '增效',
    '穿透',
    '最小',
    '最大'
  ]

  const candidate = lines.find(line => {
    const clean = line.replace(/\s/g, '')

    if (clean.length < 2) return false
    if (/^[A-Za-z]$/.test(clean)) return false
    if (/^\d+(\.\d+)?%?$/.test(clean)) return false
    if (/\d+阶/.test(clean)) return false
    if (/\d+\s*[~～-]\s*\d+/.test(clean)) return false
    if (badKeywords.some(k => clean.includes(k))) return false

    return true
  })

  if (candidate) return candidate.replace(/\s/g, '')

  return `识别${SLOT_NAME_MAP[slot] || '装备'}`
},

parseBaseAttrsFromOcr(lines, slot) {
  const result = {}

  // 防具的气血、防御等基础属性不参与毕业度，直接忽略
  if (!slot || isArmorSlot(slot)) {
    return result
  }

  const mergedText = lines.join(' ')

  // 武器：外功攻击 46~106
  const outerAttackMatch = mergedText.match(/外功攻击\s*(\d+(\.\d+)?)\s*[~～-]\s*(\d+(\.\d+)?)/)

  if (outerAttackMatch) {
    result['最小外功'] = Number(outerAttackMatch[1])
    result['最大外功'] = Number(outerAttackMatch[3])
    return result
  }

  // 环/佩：可能只有单个外功攻击数值
  const baseLine = lines.find(line => {
    const clean = this.normalizeOcrText(line)

    if (!clean.includes('外功')) return false
    if (clean.includes('最小') || clean.includes('最大')) return false
    if (clean.includes('荐')) return false
    if (clean.includes('转')) return false

    return /\d+(\.\d+)?/.test(clean)
  })

  if (baseLine) {
    const num = this.extractNumberFromLine(baseLine)

    if (num !== null) {
      if (slot === 'ring') {
        result['最小外功'] = num
      } else if (slot === 'pendant') {
        result['最大外功'] = num
      }
    }
  }

  return result
},

parseAffixesFromOcr(lines, options = {}) {
  const affixes = []
  const knownAffixes = equipmentAffixList.filter(a => a.name && a.name !== 'N/A')
  const tuneSkillName = options.tuneSkillName || null

  for (const line of lines) {
    const normalizedLine = this.normalizeOcrText(line)

    // 忽略装备基础信息和无毕业度意义属性
    if (this.shouldIgnoreOcrLineAsAffix(line)) continue

    // 如果这行是定音技，不要塞进普通词条
    if (this.isOcrTuneSkillLine(line)) {
      continue
    }

    // 如果这行已经被识别为定音技内部名，也不要塞进普通词条
    if (tuneSkillName && normalizedLine.includes(this.normalizeOcrText(tuneSkillName))) {
      continue
    }

    for (const affixDef of knownAffixes) {
      const affixName = affixDef.name
      const aliasList = this.getOcrAffixAliases(affixName)

      const matched = aliasList.some(alias => {
        return normalizedLine.includes(this.normalizeOcrText(alias))
      })

      if (!matched) continue

      const num = this.extractNumberFromLine(line)
      if (num === null || num <= 0) continue

      if (affixes.some(a => a.name === affixName)) continue

      // 避免一个“武学增伤”同时匹配到武学增效1和武学增效2
      if (
        normalizedLine.includes('武学增效') &&
        affixes.some(a => ['武学增效1', '武学增效2', '全部武学增效'].includes(a.name))
      ) {
        continue
      }

      let value = num

      if (affixDef.isPercent) {
        value = num / 100
      }

      affixes.push({
        name: affixName,
        value,
        max: affixDef.max,
        convert: affixDef.convert,
        isPercent: affixDef.isPercent || false,
        isNA: false,
      })

      // 你的系统普通词条上限是 5，防具第 6 条通常走 tuneSkill
      if (affixes.length >= 5) {
        return affixes
      }

      break
    }
  }

  return affixes
},

isOcrTuneSkillLine(line) {
  if (!line) return false

  const normalizedLine = String(line)
    .replace(/\s/g, '')
    .replace(/[·•]/g, '·')
    .replace(/荐/g, '')

  return Object.keys(OCR_TUNE_SKILL_NAME_MAP).some(gameName => {
    const normalizedGameName = gameName
      .replace(/\s/g, '')
      .replace(/[·•]/g, '·')

    return normalizedLine.includes(normalizedGameName)
  })
},

shouldIgnoreOcrLineAsAffix(line) {
  const normalized = this.normalizeOcrText(line)

  if (!normalized) return true

  const ignored = OCR_IGNORED_ATTR_KEYWORDS.some(keyword => {
    return normalized.includes(this.normalizeOcrText(keyword))
  })

  if (ignored) return true

  // 只在整行词条名就是“体/御”时忽略，避免误伤“单体/群体”
  const labelOnly = normalized
    .replace(/\d+(\.\d+)?%?/g, '')
    .replace(/[~～\-]/g, '')
    .replace(/荐/g, '')
    .trim()

  if (OCR_IGNORED_ATTR_EXACT_NAMES.includes(labelOnly)) {
    return true
  }

  const infoKeywords = [
    '装备中',
    '装备等阶',
    '造诣',
    '武器',
    '陌刀',
    '胸甲',
    '冠胄',
    '胫甲',
    '腕甲'
  ]

  return infoKeywords.some(keyword => normalized.includes(this.normalizeOcrText(keyword)))
},

normalizeOcrTuneSkillName(name) {
  if (!name) return null

  const cleanName = String(name)
    .replace(/\s/g, '')
    .replace(/[：:]/g, '')
    .replace(/[％]/g, '%')
    .replace(/[·•]/g, '·')
    .replace(/荐/g, '')
    .trim()

  // 精确匹配
  if (OCR_TUNE_SKILL_NAME_MAP[cleanName]) {
    return OCR_TUNE_SKILL_NAME_MAP[cleanName]
  }

  // 兼容 OCR 行里带数值，例如：嗟夫刀法·蓄力技增伤荐 3.1%
  for (const [gameName, internalName] of Object.entries(OCR_TUNE_SKILL_NAME_MAP)) {
    const normalizedGameName = gameName
      .replace(/\s/g, '')
      .replace(/[·•]/g, '·')

    if (cleanName.includes(normalizedGameName)) {
      return internalName
    }
  }

  return null
},

parseTuneSkillFromOcr(lines, slot) {
  const finalSlot = slot || 'leftWeapon'
  const currentSchool = this.data.currentSchool || app.equipmentStore.currentSchool || {}

  const tuneSkills = this.buildTuneSkills(currentSchool, finalSlot)
    .filter(item => item.name && item.name !== 'N/A')

  if (!tuneSkills.length) return null

  const validTuneNames = tuneSkills.map(item => item.name)

  // 武器 / 环 / 佩：只可能是穿透类定音技
  if (isBaseSlot(finalSlot)) {
    const weaponTuneNames = ['外功穿透', '鸣金穿透', '牵丝穿透', '裂石穿透', '破竹穿透']

    for (const line of lines) {
      const normalizedLine = this.normalizeOcrText(line)

      for (const tuneName of weaponTuneNames) {
        if (!validTuneNames.includes(tuneName)) continue

        if (normalizedLine.includes(this.normalizeOcrText(tuneName))) {
          const value = this.extractNumberFromLine(line)

          return {
            name: tuneName,
            value: value || 0
          }
        }
      }
    }

    return null
  }

  // 防具：游戏原名需要转换为项目内部名
  if (isArmorSlot(finalSlot)) {
    for (const line of lines) {
      const internalName = this.normalizeOcrTuneSkillName(line)

      // 没在映射表里，直接跳过
      if (!internalName) continue

      // 映射出来了，但当前流派定音技列表里没有，也做空白处理
      if (!validTuneNames.includes(internalName)) {
        return null
      }

      const value = this.extractNumberFromLine(line)

      return {
        name: internalName,
        value: value || 0
      }
    }

    return null
  }

  return null
},

normalizeOcrText(str) {
  return String(str || '')
    .replace(/\s/g, '')
    .replace(/[：:]/g, '')
    .replace(/[＋+]/g, '')
    .replace(/[％]/g, '%')
    .replace(/荐/g, '')
    .replace(/\[转\]/g, '')
    .replace(/【转】/g, '')
    .replace(/^转/, '')
    .replace(/[·•]/g, '.')
    .replace(/攻击/g, '')
    .replace(/增伤/g, '增效')
    .replace(/蓄力技/g, '蓄力技')
    .replace(/Ⅰ/g, '1')
    .replace(/Ⅱ/g, '2')
    .replace(/Ⅲ/g, '3')
},

normalizeOcrAffixName(name) {
  const map = {
    '最小外功': '小外',
    '最大外功': '大外',
    '最小外功攻击': '小外',
    '最大外功攻击': '大外',
    '全武学增效': '全部武学增效',
    '全部武学增伤': '全部武学增效'
  }

  return map[name] || name
},

extractNumberFromLine(line) {
  if (!line) return null

  const normalized = String(line)
    .replace(/,/g, '')
    .replace(/[＋+]/g, '')
    .replace(/[％]/g, '%')

  const matches = normalized.match(/\d+(\.\d+)?/g)

  if (!matches || !matches.length) return null

  const num = parseFloat(matches[matches.length - 1])
  return isNaN(num) ? null : num
},

getOcrAffixAliases(name) {
  const currentSchool = this.data.currentSchool || app.equipmentStore.currentSchool || {}

  const boost1Name = currentSchool.martialBoost1Name || ''
  const boost2Name = currentSchool.martialBoost2Name || ''

  const aliasMap = {
    '小外': ['小外', '最小外功', '最小外功攻击'],
    '大外': ['大外', '最大外功', '最大外功攻击'],

    '最小外功': ['最小外功', '最小外功攻击', '小外'],
    '最大外功': ['最大外功', '最大外功攻击', '大外'],

    '劲': ['劲'],
    '敏': ['敏', '敏捷'],
    '势': ['势'],

    '精准率': ['精准率', '精准', '命中率'],
    '会心率': ['会心率', '会心'],
    '会意率': ['会意率', '会意', '会思率'],

    '全部武学增效': ['全部武学增效', '全武学增效', '全部武学增伤', '全武学增伤'],

    '武学增效1': [
      '武学增效1',
      '武学增伤',
      '武学增效',
      '陌刀武学增伤',
      '陌刀武学增效',
      boost1Name
    ].filter(Boolean),

    '武学增效2': [
      '武学增效2',
      boost2Name
    ].filter(Boolean),

    '最小鸣金': ['最小鸣金', '最小鸣金攻击'],
    '最大鸣金': ['最大鸣金', '最大鸣金攻击'],
    '最小牵丝': ['最小牵丝', '最小牵丝攻击', '最小幸丝'],
    '最大牵丝': ['最大牵丝', '最大牵丝攻击', '最大幸丝'],
    '最小裂石': ['最小裂石', '最小裂石攻击'],
    '最大裂石': ['最大裂石', '最大裂石攻击', '[转]最大裂石攻击', '转最大裂石攻击'],
    '最小破竹': ['最小破竹', '最小破竹攻击'],
    '最大破竹': ['最大破竹', '最大破竹攻击'],

    '外功穿透': ['外功穿透'],
    '鸣金穿透': ['鸣金穿透'],
    '牵丝穿透': ['牵丝穿透', '幸丝穿透'],
    '裂石穿透': ['裂石穿透'],
    '破竹穿透': ['破竹穿透'],

    '首领增伤': ['首领增伤', '首领伤害'],
    '单体爆发': ['单体爆发', '单体爆发增伤'],
    '单体控制': ['单体控制', '单体控制增伤'],
    '群体异常': ['群体异常', '群体异常增伤'],
    '群体伤害': ['群体伤害', '群体伤害增伤'],
  }

  return aliasMap[name] || [name]
},

fillOcrEquipmentToDialog(parsed, rawText) {
  const currentSchool = app.equipmentStore.currentSchool
  const slotIndex = SLOTS.findIndex(s => s.key === parsed.slot)
  const qualityIndex = parsed.quality === 'purple' ? 0 : 1
  const levelIndex = this.data.levelOptions.indexOf(parsed.level)

  this.setData({
    ocrRawText: rawText,
    ocrParsedResult: parsed,

    showAddDialog: true,
    showOcrPreviewDialog: false,

    isEditing: false,
    editingIndex: -1,

    slotIndex: slotIndex >= 0 ? slotIndex : 0,
    qualityIndex,
    levelIndex: levelIndex >= 0 ? levelIndex : 1,

    newEquipmentSlotName: SLOT_NAME_MAP[parsed.slot] || '左武器',
    currentTuneSkills: this.buildTuneSkills(currentSchool, parsed.slot),
    tuneNeedValue: !!parsed.tuneSkill && parsed.tuneSkill !== 'N/A',

    newEquipment: {
      name: parsed.name,
      slot: parsed.slot,
      quality: parsed.quality,
      level: parsed.level,
      baseAttrs: parsed.baseAttrs,
      affixes: parsed.affixes,
      tuneSkill: parsed.tuneSkill,
      tuneSkillValue: parsed.tuneSkillValue || '',
    }
  })

  wx.showToast({
    title: '识别完成，请核对',
    icon: 'success'
  })
},

  calculateBaseAttack(slot, quality, level) {
    const hasBase = ['leftWeapon', 'rightWeapon', 'ring', 'pendant'].includes(slot);
    if (!hasBase) return {};
  
    // 81级只有金色
    if (level === 81 && quality === 'purple') return {};
  
    const table = {
      leftWeapon: {
        gold: {
          81: { '最小外功': 39, '最大外功': 91 },
          86: { '最小外功': 46, '最大外功': 106 },
          91: { '最小外功': 53, '最大外功': 124 }
        },
        purple: {
          86: { '最小外功': 41, '最大外功': 96 },
          91: { '最小外功': 48, '最大外功': 112 }
        }
      },
      rightWeapon: {
        gold: {
          81: { '最小外功': 39, '最大外功': 91 },
          86: { '最小外功': 46, '最大外功': 106 },
          91: { '最小外功': 53, '最大外功': 124 }
        },
        purple: {
          86: { '最小外功': 41, '最大外功': 96 },
          91: { '最小外功': 48, '最大外功': 112 }
        }
      },
      ring: {
        gold: {
          81: { '最小外功': 52 },
          86: { '最小外功': 61 },
          91: { '最小外功': 71 }
        },
        purple: {
          86: { '最小外功': 55 },
          91: { '最小外功': 64 }
        }
      },
      pendant: {
        gold: {
          81: { '最大外功': 78 },
          86: { '最大外功': 91 },
          91: { '最大外功': 106 }
        },
        purple: {
          86: { '最大外功': 82 },
          91: { '最大外功': 96 }
        }
      }
    };
  
    return table[slot]?.[quality]?.[level] ?? {};
  },

  // 在 equipment.js 中新增辅助方法
  buildBaseAttrsDisplay(baseAttrs) {
   if (!baseAttrs || Object.keys(baseAttrs).length === 0) return [];
   return Object.entries(baseAttrs).map(([key, val]) => `${key}: ${val}`);
  }, 

  onInputName(e) {
    this.setData({ 'newEquipment.name': e.detail.value });
  },

  onChangeSlot(e) {
    const index = Number(e.detail.value);
    const slot = SLOTS[index];
    const currentSchool = app.equipmentStore.currentSchool;
    const { newEquipment } = this.data;
    const attrs = this.calculateBaseAttack(slot.key, newEquipment.quality, newEquipment.level);
    const shouldPreserveTuneSkill = isSameTuneSkillSlotGroup(newEquipment.slot, slot.key);
    const preservedTuneSkill = shouldPreserveTuneSkill ? newEquipment.tuneSkill : null;
    const preservedTuneValue = shouldPreserveTuneSkill ? newEquipment.tuneSkillValue : 0;
    const preservedTuneNeedValue = !!preservedTuneSkill && preservedTuneSkill !== 'N/A';

    
    const allList = app.equipmentStore.equipmentList || [];
    const slotCount = allList.filter(eq => eq.slot === slot.key).length;
    const defaultName = `默认${slot.name}${slotCount + 1}`;
  
    this.setData({
      'newEquipment.slot': slot.key,
      'newEquipment.baseAttrs': attrs,
      'newEquipment.tuneSkill': preservedTuneSkill,
      'newEquipment.tuneSkillValue': preservedTuneValue,
      'newEquipment.name': defaultName,
      newEquipmentSlotName: slot.name,
      currentTuneSkills: this.buildTuneSkills(currentSchool, slot.key),
      tuneNeedValue: preservedTuneNeedValue,
    });
  },

  onChangeQuality(e) {
    const index = Number(e.detail.value);
    const quality = index === 0 ? 'purple' : 'gold';
    let level = this.data.newEquipment.level;
  // 紫色不支持81级，自动切换到86
  if (quality === 'purple' && level === 81) {level = 86;
    wx.showToast({
    title: '81级不支持紫色品阶',
    icon: 'none',
    duration: 2000})}
  const attrs = this.calculateBaseAttack(this.data.newEquipment.slot, quality, level);
    this.setData({
      qualityIndex: index,
      'newEquipment.quality': quality,
      'newEquipment.level': level,  
      'newEquipment.baseAttrs': attrs,
    });
  },

  onChangeLevel(e) {
    const index = Number(e.detail.value);
    const level = this.data.levelOptions[index] || 86;
    const slot = this.data.newEquipment.slot;
    const quality = this.data.newEquipment.quality;

    let finalQuality = quality;
    let qualityIndex = this.data.qualityIndex;
    if (level === 81 && quality === 'purple') {
      finalQuality = 'gold';
      qualityIndex = 1;
      wx.showToast({ title: '81级仅支持金色品阶', icon: 'none', duration: 2000 });
    }

    const attrs = this.calculateBaseAttack(slot, finalQuality, level);
    this.setData({
      levelIndex: index,
      qualityIndex,
      'newEquipment.level': level,
      'newEquipment.quality':finalQuality,
      'newEquipment.baseAttrs': attrs
    });
  },

 // 选择词条名称
 onSelectAffixName(e) {
  const item = this.data.displayAffixList[e.detail.value];
  const isNA = item.name === 'N/A';
  this.setData({
    'tempAffix.name': item.name,
    'tempAffix.max': item.max,
    'tempAffix.isPercent': item.isPercent ?? false,
    'tempAffix.value': isNA ? 0 : item.max,
    'tempAffix.isNA': isNA,
  });
},

// 删除某条词条
removeAffix(e) {
  const { name } = e.currentTarget.dataset;
  const affixes = this.data.newEquipment.affixes.filter(a => a.name !== name);
  this.setData({ 'newEquipment.affixes': affixes });
},

  openTuneDialog() {
    if (!this.data.currentSchool) {
      wx.showToast({ title: '请先在计算器选择流派', icon: 'none' });
      return;
    }
    this.setData({ showTuneDialog: true });
  },

  onSelectTune(e) {
    const tune = this.data.tuneSkills[e.detail.value];
    this.setData({ 
      'newEquipment.tuneSkill': tune.name,
      showTuneDialog: false
    });
  },

  selectTuneSkill(e) {
    const name = e.currentTarget.dataset.name;
    const { newEquipment } = this.data;
    const isWeaponSlot = ['leftWeapon', 'rightWeapon', 'ring', 'pendant']
      .includes(newEquipment.slot);
    const isNA = name === 'N/A';
  
    // 武器槽穿透类 或 护甲槽非N/A，都需要输入数值
    const tuneNeedValue = !isNA;
  
    this.setData({
      'newEquipment.tuneSkill': name,
      'newEquipment.tuneSkillValue': '',
      tuneNeedValue,
    });
  },
  
  onInputTuneValue(e) {
    this.setData({
      'newEquipment.tuneSkillValue': e.detail.value
    });
  },


  saveEquipment() {
    const { newEquipment, isEditing } = this.data;
    if (!newEquipment.name) {
      wx.showToast({ title: '请输入装备名称', icon: 'none' });
      return;
    }
  
    let tuneSkill = null;
    if (newEquipment.tuneSkill) {
      const isNA = newEquipment.tuneSkill === 'N/A';
      tuneSkill = {
        name: newEquipment.tuneSkill,
        value: isNA ? 0 : parseFloat(newEquipment.tuneSkillValue) || 0,
      };
    }
  
    const equipment = stripEquipmentScoreFields({
      ...newEquipment,
      tuneSkill,
    });
  
    if (isEditing) {
      // ★ 使用 updateEquipment，自动同步 selectedEquipment 引用
      const allList = app.equipmentStore.equipmentList;
      const target = this.data.filteredList[this.data.editingIndex];
      const realIndex = allList.findIndex(eq => eq.id === target?.id);
      app.equipmentStore.updateEquipment(
        realIndex !== -1 ? realIndex : this.data.editingIndex,
        equipment
      );
      this.setData({ isEditing: false, editingIndex: -1 });
      wx.showToast({ title: '修改成功', icon: 'success' });
    } else {
      // 新增模式
      app.equipmentStore.addEquipment(equipment);
      wx.showToast({ title: '添加成功', icon: 'success' });
    }
  
    this.saveData();
    this.updateFilteredList();
    this.setData({ showAddDialog: false });
  },

  openDetailDialog(e) {
    const index = e.currentTarget.dataset.index;
    const equip = this.data.filteredList[index];
    if (!equip) {
      wx.showToast({ title: '装备数据不存在', icon: 'none' });
      return;
    }
    this.setData({
      showDetailDialog: true,
      detailEquipment: {
        ...equip,
        affixes: equip.affixes || [],
        _index: index,
        slotName: SLOT_NAME_MAP[equip.slot] ?? equip.slot,
        qualityName: QUALITY_NAME_MAP[equip.quality] ?? equip.quality,
      }
    });
  },
  
  closeDetailDialog() {
    this.setData({ showDetailDialog: false, detailEquipment: null });
  },
  
  deleteFromDetail() {
    const { detailEquipment } = this.data;
    if (!detailEquipment) return;
  
    wx.showModal({
      title: '确认删除',
      content: `确定删除「${detailEquipment.name}」吗？`,
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // ★ 按 id 删除，无需关心 filteredList 状态
          app.equipmentStore.removeEquipment(detailEquipment.id);
          this.saveData();
          this.updateFilteredList();
          this.setData({ showDetailDialog: false, detailEquipment: null });
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  editFromDetail() {
    const { detailEquipment } = this.data;
    if (!detailEquipment) return;
  
    const equip = detailEquipment;
    const currentSchool = app.equipmentStore.currentSchool;
  
    // 还原 qualityIndex 和 levelIndex
    const qualityIndex = equip.quality === 'purple' ? 0 : 1;
    const matchedLevelIndex = this.data.levelOptions.indexOf(equip.level);
    const levelIndex = matchedLevelIndex >= 0 ? matchedLevelIndex : 1;
    const slotIndex = SLOTS.findIndex(s => s.key === equip.slot);
  
    // 还原 tuneSkill 字符串（存的是对象，取 name）
    const tuneSkillName = equip.tuneSkill?.name ?? null;
    const tuneSkillValue = equip.tuneSkill?.value ?? '';
    const isNA = tuneSkillName === 'N/A';
    const tuneNeedValue = !isNA && tuneSkillName !== null;
  
    this.setData({
      showDetailDialog: false,
      showAddDialog: true,
      isEditing: true,
      editingIndex: detailEquipment._index,
  
      slotIndex,
      qualityIndex,
      levelIndex,
      newEquipmentSlotName: SLOT_NAME_MAP[equip.slot] ?? equip.slot,
      currentTuneSkills: this.buildTuneSkills(currentSchool, equip.slot),
      tuneNeedValue,
  
      newEquipment: {
        ...equip,
        tuneSkill: tuneSkillName,
        tuneSkillValue: String(tuneSkillValue),
      }
    });
  },

  togglePanelCollapse() {
    this.setData({ panelCollapsed: !this.data.panelCollapsed });
  },

  validateEquipmentScores() {
    const validation = validateScoreOrder(this.data.filteredList);
    wx.showToast({
      title: validation.passed ? validation.message : `评分异常：${validation.message}`,
      icon: 'none',
      duration: 2500
    });
  },

  // 清空装备
  handleClearAll() {
    wx.showModal({
      title: '确认',
      content: '确定要清空所有装备吗？',
      success: (res) => {
        if (res.confirm) {
          this.clearAllEquipment();
          this.saveData();
          this.updateFilteredList();
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  // 打开校准对话框
  openCalibrationDialog() {
    const session = calcStore.getCalcSession();
    if (!session) {
      wx.showToast({
        title: '请先在计算器页点击计算',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const panelInput = session.panelInput;
    const currentSchool = app.equipmentStore.currentSchool;
    const sessionSchool = session.context?.currentSchool;
    if (sessionSchool?.schoolName !== currentSchool?.schoolName) {
      wx.showModal({
        title: '流派不一致',
        content: '当前装备管理页的流派与计算时会话不一致，是否以当前会话为准继续校准？',
        success: (res) => {
          if (res.confirm) {
            this.setData({            
            showCalibrationDialog: true,
            calibrationSession: session,
            calibrationPanel: panelInput,});
          }
        }
      });
      return;
    }
    this.setData({
      showCalibrationDialog: true,
      calibrationEquipments: {},
      calibrationSession: session,
      // ★ 直接使用 session.panelInput，不再依赖 rawPanel
      calibrationPanel: panelInput,
    });
  },

  // 选择校准装备
  onSelectCalibrationEquip(e) {
    const slot = e.currentTarget.dataset.slot;
    const equipList = (app.equipmentStore.equipmentList || []).filter(eq => eq.slot === slot);
    
    if (equipList.length === 0) {
      wx.showToast({ title: `请先添加${SLOTS.find(s => s.key === slot).name}`, icon: 'none' });
      return;
    }

      // 只有一件直接选中，不弹选择框
    if (equipList.length === 1) {
       this.setData({ [`calibrationEquipments.${slot}`]: equipList[0] });
       return;
    }
    
    wx.showActionSheet({
      itemList: equipList.map(e => e.name),
      success: (res) => {
        const selected = equipList[res.tapIndex];
        this.setData({
          [`calibrationEquipments.${slot}`]: selected
        });
      }
    });
  },

  buildBasePanelDisplay(panel) {
    if (!panel) return [];

    const percentFields = new Set([
      'precisionRate',
      'insightRate',
      'directInsightRate',
      'perfectRate',
      'directPerfectRate',
      'insightDamageBonus',
      'perfectDamageBonus',
      'damageIncrease',
      'allMartialBonus',
      'bossBonus',
      'singleControlBonus',
      'singleBurstBonus',
      'groupDamageBonus',
      'groupAbnormalBonus',
      'elementBonus',
      'physicalBonus',
    ]);

    return Object.entries(panel)
      .filter(([, val]) => val !== '' && val !== '0' && parseFloat(val) !== 0)
      .map(([key, val]) => {
        const label = PANEL_FIELD_NAMES[key] || key;
        const num = parseFloat(val);
        const display = Number.isInteger(num) ? num : Math.round(num * 100) / 100;
        const suffix = percentFields.has(key) ? '%' : '';
        return `${label}：${display}${suffix}`;
      });
  },
  

  // 执行校准
  doCalibration() {
    const { calibrationEquipments } = this.data;
  
    if (Object.keys(calibrationEquipments).length < 8) {
      wx.showToast({ title: '请选择全部8件装备', icon: 'none' });
      return;
    }
  
  // ★ 从 calibrationSession 读取，不再依赖 this.data.rawPanel
  const session = this.data.calibrationSession;
  if (!session?.panelInput) {
    wx.showToast({ title: '会话面板数据异常，请重新计算', icon: 'none' });
    return;
  }
  

  // 全部转 float，方便运算
  const basePanel = {};
  Object.entries(session.panelInput).forEach(([k, v]) => {
    basePanel[k] = parseFloat(v) || 0;
  });

  
    // 词条名 → 对 basePanel 字段的影响，返回 delta 对象
    const resolveAffix = (name, rawValue, equip, basePanel) => {
      const v = parseFloat(rawValue) || 0;
      switch (name) {
    
        // ── 外功攻击 ──────────────────────────────────
        case '最小外功':
        case '小外':
          return { physicalMinAttack: v };
        case '最大外功':
        case '大外':
          return { physicalMaxAttack: v };
    
        // ── 鸣金属攻 ──────────────────────────────────
        case '最小鸣金':
        case '最小鸣金攻击':
          return { mingjinMin: v };
        case '最大鸣金':
        case '最大鸣金攻击':
          return { mingjinMax: v };
    
        // ── 牵丝属攻 ──────────────────────────────────
        case '最小牵丝':
        case '最小牵丝攻击':
          return { qiansiMin: v };
        case '最大牵丝':
        case '最大牵丝攻击':
          return { qiansiMax: v };
    
        // ── 裂石属攻 ──────────────────────────────────
        case '最小裂石':
        case '最小裂石攻击':
          return { lieshiMin: v };
        case '最大裂石':
        case '最大裂石攻击':
          return { lieshiMax: v };
    
        // ── 破竹属攻 ──────────────────────────────────
        case '最小破竹':
        case '最小破竹攻击':
          return { pozhuMin: v };
        case '最大破竹':
        case '最大破竹攻击':
          return { pozhuMax: v };
    
        // ── 穿透 ──────────────────────────────────────
        case '外功穿透': return { physicalPenetration: v };
        case '鸣金穿透': return { mingjinPen: v };
        case '牵丝穿透': return { qiansiPen: v };
        case '裂石穿透': return { lieshiPen: v };
        case '破竹穿透': return { pozhuPen: v };
    
        // ── 敏 势 劲 ──────────────────────────────────
        case '敏':
          return {
            physicalMinAttack: v * 0.9,
            insightRate:       v * 0.076 * 0.77,
          };
        case '势':
          return {
            physicalMaxAttack: v * 0.9,
            perfectRate:       v * 0.038 * 0.77,
          };
        case '劲':
          return {
            physicalMaxAttack: v * 1.36,
            physicalMinAttack: v * 0.225,
          };
    
        // ── 精准 会心 会意 ────────────────────────────
        case '精准率':
          return { precisionRate: v * 0.9 };
        case '会心率':
          return { insightRate: v * 0.77 };
        case '会意率':
          return { perfectRate: v * 0.77 };
    
        // ── 加成 ──────────────────────────────────────
        case '属攻伤害加成':  return { elementBonus: v };
        case '外功伤害加成':  return { physicalBonus: v };
        case '单体控制':  return { singleControlBonus: v };
        case '单体爆发':  return { singleBurstBonus: v };
        case '群体伤害':  return { groupDamageBonus: v };
        case '群体异常':  return { groupAbnormalBonus: v };
        case '首领增伤':  return { bossBonus: v };
        case '武学增效1': return { martialBoostValue1: v };
        case '武学增效2': return { martialBoostValue2: v };
        case '全部武学增效':
        case '全武学增效':
        return { allMartialBonus: v };
    
        default:
          return {};
      }
    };
  

  // 累加所有装备对面板的贡献
  const totalDelta = {};
  const accum = (key, val) => {
    totalDelta[key] = (totalDelta[key] || 0) + val;
  };

  Object.values(calibrationEquipments).forEach(equip => {
    if (!equip) return;
  

    // baseAttrs
    if (equip.baseAttrs) {
      Object.entries(equip.baseAttrs).forEach(([attrName, attrVal]) => {
        const delta = resolveAffix(attrName, attrVal);
        Object.entries(delta).forEach(([k, dv]) => accum(k, dv));
      });
    }
  
    // ── affixes 处理 ──────────────────────────────────────
    (equip.affixes || []).forEach(affix => {
      if (affix.isNA) return;

      // isPercent 的词条原始值是小数，需转为百分数单位再扣
      const rawVal = affix.isPercent
        ? (parseFloat(affix.value) || 0) * 100
        : (parseFloat(affix.value) || 0);

      const delta = resolveAffix(affix.name, rawVal);
      if (Object.keys(delta).length > 0) {
        Object.entries(delta).forEach(([k, dv]) => accum(k, dv));
      } else {
        // resolveAffix 未识别，尝试匹配流派定音技
        const currentSchool = this.data.currentSchool || {};
        const notes      = currentSchool.notes || [];
        const noteFields = ['noteValue1', 'noteValue2', 'noteValue3'];
        const matchIndex = notes.findIndex(n => n && n !== 'N/A' && n === affix.name);
        if (matchIndex >= 0) {
          accum(noteFields[matchIndex], rawVal);
        }
      }
    });

    // ── tuneSkill 处理 ────────────────────────────────────
    if (equip.tuneSkill && equip.tuneSkill.name && equip.tuneSkill.name !== 'N/A') {
      const tuneName  = equip.tuneSkill.name;
      const tuneValue = parseFloat(equip.tuneSkill.value) || 0;

      // 先尝试 resolveAffix（覆盖穿透等直接面板词条）
      const directDelta = resolveAffix(tuneName, tuneValue);
      if (Object.keys(directDelta).length > 0) {
        Object.entries(directDelta).forEach(([k, dv]) => accum(k, dv));
      } else {
        // 识别不到，尝试匹配流派定音技（如伞特殊增伤、剑蓄力增伤）
        const currentSchool = this.data.currentSchool || {};
        const notes      = currentSchool.notes || [];
        const noteFields = ['noteValue1', 'noteValue2', 'noteValue3'];
        const matchIndex = notes.findIndex(n => n && n !== 'N/A' && n === tuneName);
        if (matchIndex >= 0) {
          accum(noteFields[matchIndex], tuneValue);
        }
      }
    }
  });  // ← forEach equip 结束

  // 面板减去装备贡献
  Object.entries(totalDelta).forEach(([k, dv]) => {
    if (basePanel[k] !== undefined) {
      basePanel[k] = Math.round((basePanel[k] - dv) * 10000) / 10000;
    }
  });

  const resultPanel = {};
  Object.entries(basePanel).forEach(([k, v]) => {
    resultPanel[k] = v === 0 ? '' : String(v);
  });

  app.equipmentStore.setBasePanel(resultPanel);
  this.saveData();

  this.setData({
    showCalibrationDialog: false,
    basePanelDisplay: this.buildBasePanelDisplay(resultPanel),
  });
  wx.showToast({ title: '校准完成', icon: 'success' });
},

  // 遍历最优搭配
  async handleTraverse() {

    const snapshot = this.data.calcContextSnapshot;
      if (!snapshot) {
        wx.showToast({ title: '请先在计算器页执行一次计算', icon: 'none' });
        return;
      }

    // ── 前置校验 ──────────────────────────────────────────────────
    const basePanel = this.data.basePanel;
    if (!basePanel || Object.keys(basePanel).length === 0) {
      wx.showToast({ title: '请先校准基础面板', icon: 'none' });
      return;
    }

      // Guard：currentAxis 必须存在
    if (!snapshot.currentAxis || !snapshot.currentAxis.axisName) {
      wx.showToast({ title: '轴数据异常，请返回计算器页重新计算', icon: 'none' });
      return;
    }

  // currentSchool / currentAxis / selectedSet 等全部从 snapshot 读取
  const currentSchool = snapshot.currentSchool || {};
  if (!currentSchool.schoolName) {
    wx.showToast({ title: '请先选择流派', icon: 'none' });
    return;
  }

  const tuneSkillMap = buildTuneSkillMap(currentSchool);
  // ★ 直接使用 snapshot.currentAxis，不走 store.currentAxis 兜底
  
    const equipmentList = this.data.equipmentList || [];
    if (!equipmentList.length) {
      wx.showToast({ title: '装备库为空', icon: 'none' });
      return;
    }
  
    // ── 按部位分组 ────────────────────────────────────────────────
    const SLOT_KEYS = [
      'leftWeapon', 'rightWeapon',
      'hat', 'chest', 'wrist', 'leg',
      'ring', 'pendant'
    ];
  
    const slotMap = groupEquipmentBySlot(equipmentList);
      const slotNameMap = {
        leftWeapon: '左武器', rightWeapon: '右武器',
        hat: '冠胄', chest: '胸甲', wrist: '腕甲', leg: '胫甲',
        ring: '环',  pendant: '佩'}

  
    const missingSlots = SLOT_KEYS.filter(key => !slotMap[key] || slotMap[key].length === 0);
    if (missingSlots.length) {
      const names = missingSlots.map(k => slotNameMap[k] || k).join('、');
      wx.showToast({ title: `缺少部位：${names}`, icon: 'none', duration: 3000 });
      return;
    }
  
    // ── 构建组合 ──────────────────────────────────────────────────
    const groups       = SLOT_KEYS.map(key => slotMap[key]);
    const combinations = cartesianProduct(groups);
    const total        = combinations.length;
  
    wx.showLoading({ title: `共 ${total} 种组合，计算中...`, mask: true });
  
    // ── 基础 ctx（form 在每次循环内单独覆盖）─────────────────────
    const baseForm = Object.assign({},  this.data.basePanel);
  
    const baseCtx = {
      form:                null,    
      currentSchool:       snapshot.currentSchool,
      currentTarget:       snapshot.currentTarget,
      currentSkill:        snapshot.currentSkill,
      currentAxis:         snapshot.currentAxis,
      selectedSet:         snapshot.selectedSet,
      selectedMentalities: snapshot.selectedMentalities,
      selectedTiangong:    snapshot.selectedTiangong,
      selectedFood:        snapshot.selectedFood,
      setMap,
      bonusMap,
      skills,
    };

    const cleanNumber = (num, digits = 4) => {
      const n = parseFloat(num);
      if (isNaN(n)) return 0;
      const factor = Math.pow(10, digits);
      const rounded = Math.round((n + Number.EPSILON) * factor) / factor;
      return Object.is(rounded, -0) ? 0 : rounded;
    };
    
    const cleanFormValue = (num, digits = 4) => {
      const n = cleanNumber(num, digits);
      return n === 0 ? '' : String(n);
    };
    
    const normalizeForm = (form) => {
      const result = {};
      Object.keys(form || {}).forEach(key => {
        result[key] = cleanFormValue(form[key], 4);
      });
      return result;
    };

    // ── 遍历计算（分批异步）────────────────────────────────────────
    let bestRate   = -1;
    let bestDps    = 0;
    let bestResult = null;
    let bestCombo  = null;
    let bestOverrideForm = null;
  
    await runInBatches(
      combinations,
      50,
      (combo) => {
        const rawOverrideForm = applyComboToForm(combo, baseForm, tuneSkillMap);
        const overrideForm = normalizeForm(rawOverrideForm);
        const calc = createCalculator({ ...baseCtx, form: overrideForm });
        const axisResult = calc.calculateCurrentAxisResult();
    
        if (!axisResult) return;
    
        const graduateRateNum = parseFloat(axisResult.graduateRate) || 0;
        const dpsNum = parseFloat(axisResult.dps) || 0;
    
        if (graduateRateNum > bestRate) {
          bestRate = graduateRateNum;
          bestDps = dpsNum;
          bestResult = JSON.parse(JSON.stringify(axisResult));
          bestCombo = combo.map(e => JSON.parse(JSON.stringify(e)));
          bestOverrideForm = normalizeForm(overrideForm);
        }
      },
      (done, total) => {
        wx.showLoading({ title: `计算中 ${done}/${total}`, mask: true });
      }
    );

    wx.hideLoading();

    if (!bestCombo) {
      wx.showToast({ title: '未找到有效组合', icon: 'none' });
      return;
    }
 
    // ── 写入结果 ──────────────────────────────────────────────────
    this.setData({
      traverseResult: {
        graduateRate: bestRate > 1
          ? `${bestRate.toFixed(2)}%`
          : `${(bestRate * 100).toFixed(2)}%`,
        dps: bestDps > 0 ? bestDps.toFixed(2) : '0.00',
        combo: bestCombo.map((equip, i) => ({
          slot: SLOT_KEYS[i],
          slotName: SLOT_NAME_MAP[SLOT_KEYS[i]] || SLOT_KEYS[i],
          equipName: equip.name,
          affixes: (equip.affixes || []).map(affix => ({
            name: affix.name,
            isNA: affix.isNA,
            displayValue: formatAffixDisplayValue(affix),
          })),
        })),
        overrideForm: bestOverrideForm ? JSON.parse(JSON.stringify(bestOverrideForm)) : {},
      },
      showTraverseResult: true,
    });
  },

  closeTraverseResult() {
    this.setData({ showTraverseResult: false });
  },
  
  applyTraverseResult() {
    const traverseResult = this.data.traverseResult || {};
    const overrideForm = traverseResult.overrideForm || {};

    if (!overrideForm || Object.keys(overrideForm).length === 0) {
      wx.showToast({ title: '最佳搭配面板数据不存在', icon: 'none' });
      return;
    }

    calcStore.batchUpdateForm(normalizeScoreForm(overrideForm));

    wx.showToast({ title: '已填入计算器面板', icon: 'success' });
    this.closeTraverseResult();

    setTimeout(() => {
      wx.navigateBack({
        fail: () => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      });
    }, 200);
  },

  closeOcrPreviewDialog() {
    this.setData({
      showOcrPreviewDialog: false,
      ocrRawText: '',
      ocrParsedResult: null
    });
  },

  closeDialog() {
    this.setData({ 
      showAddDialog: false,
      showAffixDialog: false,
      showTuneDialog: false,
      showCalibrationDialog: false
    });
  }
});
