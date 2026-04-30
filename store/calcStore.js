// calcStore.js
import { observable, action } from 'mobx-miniprogram';

let _sessionCounter = 0;

export const calcStore = observable({
  // ==========================================
  // 1. 全局状态 (State)
  // ==========================================

  // 核心输入数据
  form: {
    physicalMinAttack: '', physicalMaxAttack: '', physicalPenetration: '', physicalBonus: '',
    mingjinMin: '', mingjinMax: '', mingjinPen: '',
    qiansiMin: '', qiansiMax: '', qiansiPen: '',
    lieshiMin: '', lieshiMax: '', lieshiPen: '',
    pozhuMin: '', pozhuMax: '', pozhuPen: '',
    elementBonus: '',
    precisionRate: '', insightRate: '', directInsightRate: '',
    perfectRate: '', directPerfectRate: '',
    insightDamageBonus: '', perfectDamageBonus: '', damageIncrease: '',
    allMartialBonus: '', bossBonus: '',
    singleControlBonus: '', singleBurstBonus: '',
    groupDamageBonus: '', groupAbnormalBonus: '',
    noteValue1: '', noteValue2: '', noteValue3: '',
    martialBoostValue1: '', martialBoostValue2: ''
  },

  // 核心上下文设定
  currentSchool: {},
  currentTarget: {},
  currentAxis: null,
  selectedSet: '飞隼',

  // 核心计算结果
  result: {},
  axisResult: null,
  improveReady: false,
  improveList: [],
  panelAdviceList: [],

  // ──────────────────────────────────────────
  // ★ 新增：calcSession（唯一真源）
  // 结构：{ id, timestamp, panelInput, context }
  // ──────────────────────────────────────────
  calcSession: null,

  // ==========================================
  // 2. 修改状态的方法 (Actions)
  // ==========================================

  updateFormField: action(function(field, value) {
    this.form = Object.assign({}, this.form, { [field]: value });
  }),

  updateState: action(function(key, value) {
    this[key] = value;
  }),

  setCurrentAxis(axis) {
    this.currentAxis = axis;
  },

  setCalculateResults: action(function(results) {
    if (results.result) this.result = results.result;
    if (results.axisResult) this.axisResult = results.axisResult;
    if (results.improveList) this.improveList = results.improveList;
    if (results.panelAdviceList) this.panelAdviceList = results.panelAdviceList;
  }),

  batchUpdateForm: action(function(fields) {
    this.form = Object.assign({}, this.form, fields);
  }),

  // ──────────────────────────────────────────
  // ★ calcSession 专属方法
  // ──────────────────────────────────────────

  /**
   * 在 calculator 页「计算」完成后调用一次，
   * 生成并持有本次计算的完整会话快照。
   * @param {object} ctx - createCalculator 所需的所有外部依赖
   */
  setCalcSession(panelInput ,ctx) { 
    const id = `session_${Date.now()}_${++_sessionCounter}`;
    const safePanelInput = Object.assign({}, this.form, panelInput || {});

    // context 只存必要数据的深拷贝（避免引用污染）
    const context = {
      // 流派/目标/技能（引用即可，calculator.js 内部按名查找）
      currentSchool:      ctx.currentSchool      || this.currentSchool      || {},
      currentTarget:       ctx.currentTarget      || this.currentTarget       || {},
      currentSkill:        ctx.currentSkill       || null,
      currentAxis:         ctx.currentAxis        || null,

      // 选择类数据（直接复制，防止后续页面修改影响）
      selectedSet:         ctx.selectedSet        || this.selectedSet        || '',
      selectedMentalities: Array.isArray(ctx.selectedMentalities)
                             ? [...ctx.selectedMentalities]
                             : [],
      selectedTiangong:    ctx.selectedTiangong   || '',
      selectedFood:       ctx.selectedFood       || '√',

      // 静态数据（引用）
      setMap:  ctx.setMap  || {},
      bonusMap: ctx.bonusMap || {},
      skills:  ctx.skills  || [],
    };

    this.calcSession = {
      id,
      timestamp: Date.now(),
      panelInput: safePanelInput,
      context,
    };
  },

  /**
   * 获取当前 calcSession。
   * equipment 页用于判断是否已有可用会话。
   */
  getCalcSession() {
    return this.calcSession;
  },

  /**
   * 清除 calcSession（在 calculator 页重置表单时调用）
   */
  clearCalcSession() {
    this.calcSession = null;
  },
});