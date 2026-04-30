import { observable, action } from 'mobx-miniprogram';

export const equipmentStore = observable({
  equipmentList: [],
  selectedEquipment: {
    leftWeapon: null, rightWeapon: null, ring: null, pendant: null,
    hat: null, chest: null, leg: null, wrist: null
  },
  basePanel: null,
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
        this.selectedEquipment[removed.slot] = null;
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
        this.selectedEquipment[oldEquip.slot] = newEquip;
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
      this.selectedEquipment[slot] = null;
      return;
    }
    const exists = this.equipmentList.some(eq => eq.id === equipment.id);
    if (!exists) {
      return;
    }
    this.selectedEquipment[slot] = equipment;
  }),

  setBasePanel: action(function(panel) {
    this.basePanel = panel;
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


    setBasePanel: action(function(panel) {
      this.basePanel = panel;
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

    setCalcContextSnapshot: action(function(snapshot) {   // ← 新增这个 action
      this.calcContextSnapshot = snapshot;
    }),

    // 计算当前面板
    get currentPanel() {
      if (!this.basePanel) return null;
      const panel = { ...this.basePanel };
      Object.values(this.selectedEquipment).forEach(equip => {
        if (!equip) return;
        if (equip.baseAttrs) {
          Object.entries(equip.baseAttrs).forEach(([key, val]) => {
            panel[key] = (panel[key] || 0) + val;
          });
        }
        equip.affixes.forEach(affix => {
          panel[affix.name] = (panel[affix.name] || 0) + affix.value;
        });
      });
      return panel;
    }
  })