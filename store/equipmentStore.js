import { observable, action } from 'mobx-miniprogram';

const PANEL_FIELD_MAP = {
  '最小外功': 'physicalMinAttack',
  '最大外功': 'physicalMaxAttack',
  '小外': 'physicalMinAttack',
  '大外': 'physicalMaxAttack',
  '外功穿透': 'physicalPenetration',
  '外功伤害加成': 'physicalBonus',
  '最小鸣金': 'mingjinMin',
  '最大鸣金': 'mingjinMax',
  '鸣金穿透': 'mingjinPen',
  '最小牵丝': 'qiansiMin',
  '最大牵丝': 'qiansiMax',
  '牵丝穿透': 'qiansiPen',
  '最小裂石': 'lieshiMin',
  '最大裂石': 'lieshiMax',
  '裂石穿透': 'lieshiPen',
  '最小破竹': 'pozhuMin',
  '最大破竹': 'pozhuMax',
  '破竹穿透': 'pozhuPen',
  '属攻伤害加成': 'elementBonus',
  '精准率': 'precisionRate',
  '会心率': 'insightRate',
  '直接会心率': 'directInsightRate',
  '会意率': 'perfectRate',
  '直接会意率': 'directPerfectRate',
  '会心伤害加成': 'insightDamageBonus',
  '会意伤害加成': 'perfectDamageBonus',
  '总增伤': 'damageIncrease',
  '全部武学增效': 'allMartialBonus',
  '全武学增效': 'allMartialBonus',
  '首领增伤': 'bossBonus',
  '单体控制': 'singleControlBonus',
  '单体爆发': 'singleBurstBonus',
  '群体伤害': 'groupDamageBonus',
  '群体异常': 'groupAbnormalBonus',
  '武学增效1': 'martialBoostValue1',
  '武学增效2': 'martialBoostValue2',
};

function toNumber(value) {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function normalizePanelValue(value) {
  const num = Math.round((toNumber(value) + Number.EPSILON) * 10000) / 10000;
  return num === 0 ? '' : String(Object.is(num, -0) ? 0 : num);
}

function addPanelValue(panel, key, value) {
  if (!key) return;
  panel[key] = normalizePanelValue(toNumber(panel[key]) + toNumber(value));
}

function getConvertedRateValue(rawPercentValue, affix) {
  const max = parseFloat(affix && affix.max);
  const convert = parseFloat(affix && affix.convert);
  if (Number.isFinite(max) && max !== 0 && Number.isFinite(convert)) {
    return rawPercentValue * (convert / max);
  }
  return rawPercentValue;
}

function applyAffixToPanel(panel, affix, currentSchool) {
  if (!affix || affix.isNA) return;
  const rawValue = affix.isPercent ? toNumber(affix.value) * 100 : toNumber(affix.value);

  if (affix.name === '劲') {
    addPanelValue(panel, 'physicalMaxAttack', rawValue * 1.36);
    addPanelValue(panel, 'physicalMinAttack', rawValue * 0.225);
    return;
  }
  if (affix.name === '敏') {
    addPanelValue(panel, 'physicalMinAttack', rawValue * 0.9);
    addPanelValue(panel, 'insightRate', rawValue * 0.076 * 0.77);
    return;
  }
  if (affix.name === '势') {
    addPanelValue(panel, 'physicalMaxAttack', rawValue * 0.9);
    addPanelValue(panel, 'perfectRate', rawValue * 0.038 * 0.77);
    return;
  }
  if (affix.name === '精准率') {
    addPanelValue(panel, 'precisionRate', getConvertedRateValue(rawValue, affix));
    return;
  }
  if (affix.name === '会心率') {
    addPanelValue(panel, 'insightRate', getConvertedRateValue(rawValue, affix));
    return;
  }
  if (affix.name === '会意率') {
    addPanelValue(panel, 'perfectRate', getConvertedRateValue(rawValue, affix));
    return;
  }

  const field = PANEL_FIELD_MAP[affix.name] || getNoteField(currentSchool, affix.name);
  addPanelValue(panel, field, rawValue);
}

function getNoteField(currentSchool, name) {
  const notes = (currentSchool && currentSchool.notes) || [];
  const index = notes.findIndex(note => note && note !== 'N/A' && note === name);
  return index >= 0 ? ['noteValue1', 'noteValue2', 'noteValue3'][index] : '';
}

export const equipmentStore = observable({
  equipmentList: [],
  selectedEquipment: {
    leftWeapon: null, rightWeapon: null, ring: null, pendant: null,
    hat: null, chest: null, leg: null, wrist: null
  },
  basePanel: null,
  basePanelMeta: null,
  currentSchool: null,
  selectedMentalities: [],
  selectedTiangong: '',
  selectedFood: '',
  calcContextSnapshot: null,

  addEquipment(equip) {
    const id = Date.now() + Math.random().toString(36).slice(2);
    this.equipmentList = [...this.equipmentList, { ...equip, id }];
  },

  // ★ 修复：支持 id 或 index 两种调用方式
  removeEquipment: action(function(indexOrId) {
    const list = [...this.equipmentList];
    const realIndex = typeof indexOrId === 'number'
      ? indexOrId
      : list.findIndex(eq => eq.id === indexOrId);

    if (realIndex === -1 || realIndex >= list.length) return;

    const removed = list[realIndex];
    list.splice(realIndex, 1);
    this.equipmentList = list;

    // ★ 同步清理 selectedEquipment 中的 dangling 引用
    if (removed?.slot) {
      const selected = this.selectedEquipment[removed.slot];
      if (selected && (selected.id === removed.id)) {
        this.selectedEquipment = Object.assign({}, this.selectedEquipment, {
          [removed.slot]: null
        });
      }
    }
  }),

  // ★ 修复：编辑后同步更新 selectedEquipment 引用
  updateEquipment: action(function(indexOrId, updates) {
    const list = [...this.equipmentList];
    const realIndex = typeof indexOrId === 'number'
      ? indexOrId
      : list.findIndex(eq => eq.id === indexOrId);

    if (realIndex === -1 || realIndex >= list.length) return;

    const oldEquip = list[realIndex];
    const newEquip = { ...oldEquip, ...updates, id: oldEquip.id };
    list[realIndex] = newEquip;
    this.equipmentList = list;

    // ★ 如果旧装备在 selectedEquipment 中，用新引用替换
    if (oldEquip?.slot) {
      const selected = this.selectedEquipment[oldEquip.slot];
      if (selected && selected.id === oldEquip.id) {
        this.selectedEquipment = Object.assign({}, this.selectedEquipment, {
          [oldEquip.slot]: newEquip
        });
      }
    }
  }),

  clearAllEquipment: action(function() {
    this.equipmentList = [];
    this.selectedEquipment = {
      leftWeapon: null, rightWeapon: null, ring: null, pendant: null,
      hat: null, chest: null, leg: null, wrist: null
    };
  }),

  selectEquipment: action(function(slot, equipment) {
    // ★ 新增：校验 equipment 是否存在于当前列表
    if (equipment === null) {
      this.selectedEquipment = Object.assign({}, this.selectedEquipment, {
        [slot]: null
      });
      return;
    }
    const exists = this.equipmentList.some(eq => eq.id === equipment.id);
    if (!exists) {
      return;
    }
    this.selectedEquipment = Object.assign({}, this.selectedEquipment, {
      [slot]: equipment
    });
  }),

  setBasePanel: action(function(panel, meta) {
    this.basePanel = panel;
    if (meta !== undefined) {
      this.basePanelMeta = meta;
    }
  }),

  setBasePanelMeta: action(function(meta) {
    this.basePanelMeta = meta || null;
  }),

  setCurrentSchool: action(function(school) {
    this.currentSchool = school;
  }),

  setSelectedMentalities: action(function(list) {
    this.selectedMentalities = list || [];
  }),

  setSelectedTiangong: action(function(val) {
    this.selectedTiangong = val || '';
  }),

  setSelectedFood: action(function(val) {
    this.selectedFood = val || '';
  }),

  setCalcContextSnapshot: action(function(snapshot) {
    this.calcContextSnapshot = snapshot;
  }),

  // 计算当前面板
  get currentPanel() {
    if (!this.basePanel) return null;
    const panel = { ...this.basePanel };
    Object.values(this.selectedEquipment).forEach(equip => {
      if (!equip) return;
      if (equip.baseAttrs) {
        Object.entries(equip.baseAttrs).forEach(([name, value]) => {
          addPanelValue(panel, PANEL_FIELD_MAP[name], value);
        });
      }
      (equip.affixes || []).forEach(affix => {
        applyAffixToPanel(panel, affix, this.currentSchool);
      });
      const tuneSkill = equip.tuneSkill;
      if (tuneSkill && tuneSkill.name && tuneSkill.name !== 'N/A') {
        const field = PANEL_FIELD_MAP[tuneSkill.name] || getNoteField(this.currentSchool, tuneSkill.name);
        addPanelValue(panel, field, tuneSkill.value);
      }
    });
    return panel;
  }
})
