import { createStoreBindings } from 'mobx-miniprogram-bindings';
import { calcStore } from '../../store/calcStore';
const app = getApp()
const targets = require('../../data/targets.js')
const schools = require('../../data/schools.js')
const skills  = require('../../data/skills.js')
const { grandPanelList, grandPanelMap } = require('../../data/GrandPanel.js')
const { axesList, axesMap, axisNameMap } = require('../../data/Axes.js')
const { setMap, setList } = require('../../data/Sets.js')
const { bonusList }       = require('../../data/Bonuses.js')
const { createCalculator } = require('../../utils/calculator')

const AUTO_SAVE_KEY = 'savedConfigs'
const MANUAL_SAVE_KEY = 'manualSavedConfigs'
const LAST_SAVED_KEY = 'lastSavedConfig'

const MANUAL_SLOT_COUNT = 3
const AUTO_SAVE_LIMIT = 3

const defaultTargetName  = '91幽牙蛇影'
const targetFoundIndex   = targets.findIndex(item => item.targetName === defaultTargetName)
const defaultTargetIndex = targetFoundIndex >= 0 ? targetFoundIndex : 0
const defaultSchoolIndex = 0
const defaultSkillIndex  = 0

// 预处理 bonusMap，在模块加载时完成一次即可
const bonusMap = {}
bonusList.forEach(b => { bonusMap[b.name] = b })

Page({
  data: {
    axesList,
    axesMap,
    axisNameMap,

    axisIndex: 0,
    currentAxis: null,
    currentAxisList: [],

    schools,
    schoolOptions: schools.map(item => item.schoolName),
    schoolIndex: defaultSchoolIndex,
    currentSchoolAxesText: '',

    skills,
    skillOptions: skills.map(item => item.skillName),
    skillIndex: defaultSkillIndex,
    currentSkill: skills[defaultSkillIndex] || {},

    targets,
    targetOptions: targets.map(item => item.targetName),
    targetIndex: defaultTargetIndex,

    grandPanelList,
    grandPanelMap,
    currentGrandPanel: null,

    selectedMentalities: [],
    setList,
    setOptions: ['无', ...setList.map(item => item.name)],
    setIndex: setList.findIndex(item => item.name === '飞隼') + 1,
    mentalityDisplayList: [],
    selectedMentalitiesText: '无',

    tiangongOptions: ['无', '火', '毒'],
    tiangongIndex: 1,
    selectedTiangong: '火',
    foodOptions: ['×', '√'],
    foodIndex: 1,
    selectedFood: '√',

    ui: {
      showAdvanced: false,
      showResultDetail: false,
      showAllElements: false,
      showGrandPanel: false,
      currentTab: 'panel',
      showPanelAnalysis: true,
    },

    savedConfigs: [],
    manualSavedConfigs: [null, null, null],
    showUpdatePopup: false,
    updateLogVersion: '',
    updateLogContent: []
  },

  
  onShow() {
    this.checkUpdateLog()
  },

  
  checkUpdateLog() {
    const currentVersion = app.globalData.updateLogVersion
    const savedVersion = wx.getStorageSync('updateLogVersion')

    if (savedVersion !== currentVersion) {
      this.setData({
        showUpdatePopup: true,
        updateLogVersion: currentVersion,
        updateLogContent: app.globalData.updateLogContent
      })
    }
  },

  closeUpdatePopup() {
    const currentVersion = app.globalData.updateLogVersion

    wx.setStorageSync('updateLogVersion', currentVersion)

    this.setData({
      showUpdatePopup: false
    })
  },

  onShareAppMessage() {
    return {
      title: '燕云毕业度助手',
      path: '/pages/index/index', // 改成你要跳转的页面路径
      imageUrl: '../../images/share_5_4.png'
    }
  },

  onShareTimeline() {
    return {
      title: '燕云毕业度助手',
      query: '', 
      imageUrl: '../../images/share.png'
    }
  },

  // ─────────────────────────────────────────────
  // 工厂：根据当前页面状态组装计算上下文，返回计算器实例
  // ─────────────────────────────────────────────
  _buildCalc(formOverride) {
    return createCalculator({
      form:               formOverride || this.data.form,
      currentSchool:      this.data.currentSchool || {},
      currentTarget:      this.data.currentTarget || {},
      currentSkill:       this.data.currentSkill  || {},
      currentAxis:        this.data.currentAxis,
      selectedSet:        this.data.selectedSet   || '',
      selectedMentalities: this.data.selectedMentalities || [],
      selectedTiangong:   this.data.selectedTiangong || '',
      selectedFood:       this.data.selectedFood  || '',
      setMap,
      bonusMap,
      skills,
    })
  },

  // ─────────────────────────────────────────────
  // UI 辅助（与计算无关，保留在页面层）
  // ─────────────────────────────────────────────

  buildCurrentSchool(school) {
    const source = school || {}
    return {
      ...source,
      optionalMentalities: (source.optionalMentalities || []).map(item => String(item).trim()),
      fixedMentalityText:  source.fixedMentality || '无',
      axesText: (source.axes || []).length ? source.axes.join(' / ') : '无',
    }
  },

  getAxesText(school) {
    const source = school || {}
    return Array.isArray(source.axes) && source.axes.length ? source.axes.join(' / ') : '无'
  },

  refreshAxisListBySchool() {
    const currentSchool  = this.data.currentSchool || {}
    const schoolName     = String(currentSchool.schoolName || '').trim()
    const currentAxisList = this.data.axesMap[schoolName] || []
    const currentAxis    = currentAxisList[0] || null
  
    this.setData({ currentAxisList, axisIndex: 0, currentAxis }, () => {
      // 刷新完成后同步到 calcStore
      app.calcStore.setCurrentAxis(currentAxis)
    })
  },

  refreshMentalityDisplayList() {
    const currentSchool       = this.data.currentSchool || {}
    const optionalMentalities = currentSchool.optionalMentalities || []
    const selectedMentalities = (this.data.selectedMentalities || []).map(item => String(item).trim())
    const maxSelectable       = 3
    const reachedLimit        = selectedMentalities.length >= maxSelectable

    const mentalityDisplayList = optionalMentalities.map(item => {
      const name     = String(item).trim()
      const selected = selectedMentalities.includes(name)
      const disabled = !selected && reachedLimit
      return { name, selected, disabled }
    })

    const selectedMentalitiesText = selectedMentalities.length
      ? selectedMentalities.join(' / ')
      : '无'

    this.setData({ mentalityDisplayList, selectedMentalitiesText })
  },

  hasSelectedMentality(name) {
    const target = String(name || '').trim()
    const list   = this.data.selectedMentalities || []
    return list.some(item => {
      if (typeof item === 'string') return String(item).trim() === target
      return String((item && (item.name || item.mentalityName)) || '').trim() === target
    })
  },

  getCurrentGrandPanelBySchool() {
    const currentSchool = this.data.currentSchool || {}
    const schoolName    = String(currentSchool.schoolName || '').trim()
    if (!schoolName) return null
    return this.data.grandPanelMap[schoolName] || null
  },

  // ─────────────────────────────────────────────
  // UI 切换
  // ─────────────────────────────────────────────

  toggleGrandPanel()   { this.setData({ 'ui.showGrandPanel':    !this.data.ui.showGrandPanel    }) },
  toggleAdvanced()     { this.setData({ 'ui.showAdvanced':      !this.data.ui.showAdvanced      }) },
  toggleResultDetail() { this.setData({ 'ui.showResultDetail':  !this.data.ui.showResultDetail  }) },
  togglePanelAnalysis(){ this.setData({ 'ui.showPanelAnalysis': !this.data.ui.showPanelAnalysis }) },
  toggleAllElements()  { this.setData({ 'ui.showAllElements':   !this.data.ui.showAllElements   }) },

  // ─────────────────────────────────────────────
  // 生命周期
  // ─────────────────────────────────────────────

  onLoad() {
    this.storeBindings = createStoreBindings(this, {
      store: calcStore,
      fields: [
        'form', 'currentSchool', 'currentTarget', 'selectedSet',
        'result', 'axisResult', 'improveReady', 'improveList', 'panelAdviceList'
      ],
      actions: ['updateFormField', 'updateState', 'setCalculateResults', 'batchUpdateForm']
    })

    this._shouldSaveOnNextCalculate = false

    const savedConfigs = wx.getStorageSync(AUTO_SAVE_KEY) || []
    const manualSavedConfigs = this.getManualSavedConfigs()
    const lastSavedConfig = wx.getStorageSync(LAST_SAVED_KEY)

    const currentSchool = this.buildCurrentSchool(this.data.schools[defaultSchoolIndex])
    const currentTarget = this.data.targets[defaultTargetIndex] || {}

    this.updateState('currentSchool', currentSchool)
    this.updateState('currentTarget', currentTarget)
    this.updateState('selectedSet', '飞隼')

    const currentAxisList = this.data.currentAxisList || [];
    const defaultAxis = currentAxisList[this.data.axisIndex || 0] || null;
    app.calcStore.setCurrentAxis(defaultAxis);
    app.equipmentStore.setCurrentSchool(currentSchool) ;

    const savedData = wx.getStorageSync('equipmentData')
    if (savedData?.basePanel) {
    app.equipmentStore.setBasePanel(savedData.basePanel)
    }

    this.setData({
      schoolIndex:          defaultSchoolIndex,
      currentSchoolAxesText: this.getAxesText(currentSchool),
      skillIndex:           defaultSkillIndex,
      currentSkill:         this.data.skills[defaultSkillIndex] || {},
      targetIndex:          defaultTargetIndex,
      selectedMentalities:  [],
      selectedMentalitiesText: '无',
      selectedTiangong:     '火',
      selectedFood:         '√',
      setIndex:             setList.findIndex(item => item.name === '飞隼') + 1,
      mentalityDisplayList: [],
      currentGrandPanel:    this.data.grandPanelMap[currentSchool.schoolName] || null,
      savedConfigs,
      manualSavedConfigs,
    }, () => {
      this.refreshMentalityDisplayList()
      this.refreshAxisListBySchool()

      if (lastSavedConfig) {
        this.applyConfig(lastSavedConfig, { showToast: false })
      } else {
        this.calculate()
      }
    })
  },

  onUnload() {
    if (this.storeBindings) {
      this.storeBindings.destroyStoreBindings()
    }
  },

  // ─────────────────────────────────────────────
  // 流派 / 技能 / 目标 切换
  // ─────────────────────────────────────────────

  setCurrentSchool(index) {
    const currentSchool = this.buildCurrentSchool(this.data.schools[index])
    app.equipmentStore.setCurrentSchool(currentSchool);
    this.updateState('currentSchool', currentSchool)
    this.updateState('selectedSet', '飞隼')
    this.updateFormField('noteValue1', '')
    this.updateFormField('noteValue2', '')
    this.updateFormField('noteValue3', '')
    this.updateFormField('martialBoostValue1', '')
    this.updateFormField('martialBoostValue2', '')

    this.setData({
      schoolIndex:          index,
      currentSchoolAxesText: this.getAxesText(currentSchool),
      currentGrandPanel:    this.data.grandPanelMap[currentSchool.schoolName] || null,
      currentAxisList:      [],
      axisIndex:            0,
      currentAxis:          null,
      selectedMentalities:  [],
      mentalityDisplayList: [],
      'ui.showAllElements':  false,
      'ui.showResultDetail': false,
      'ui.showGrandPanel':   false,
      setIndex:             setList.findIndex(item => item.name === '飞隼') + 1,
    }, () => {
      this.refreshMentalityDisplayList()
      this.refreshAxisListBySchool()
      this.calculate()
    })
  },

  setCurrentSkill(index) {
    this.setData({
      skillIndex:   index,
      currentSkill: this.data.skills[index] || {}
    })
  },

  // ─────────────────────────────────────────────
  // 事件处理器
  // ─────────────────────────────────────────────

  handleInput(e) {
    this.updateFormField(e.currentTarget.dataset.field, e.detail.value)
  },

  handleSchoolChange(e)  { this.setCurrentSchool(Number(e.detail.value)) },
  handleSkillChange(e)   { this.setCurrentSkill(Number(e.detail.value))  },

  handleTargetChange(e) {
    const index = Number(e.detail.value)
    this.updateState('currentTarget', this.data.targets[index] || {})
    this.setData({ targetIndex: index })
  },

  handleAxisChange(e) {
    const index          = Number(e.detail.value || 0)
    const currentAxisList = this.data.currentAxisList || []
    const axis = currentAxisList[index] || null;
    this.setData({ axisIndex: index, currentAxis: currentAxisList[index] || null }, () => {
      app.calcStore.setCurrentAxis(axis)
      this.calculate()
    })
  },

  handleToggleMentality(e) {
    const name = String(e.currentTarget.dataset.name || '').trim()
    if (!name) return

    const optionalMentalities = ((this.data.currentSchool || {}).optionalMentalities || [])
      .map(item => String(item).trim())
    if (!optionalMentalities.includes(name)) return

    let selectedMentalities = (this.data.selectedMentalities || []).map(item => String(item).trim())
    const exists = selectedMentalities.includes(name)

    if (exists) {
      selectedMentalities = selectedMentalities.filter(item => item !== name)
    } else {
      if (selectedMentalities.length >= 3) {
        wx.showToast({ title: '最多只能选择三个可选心法', icon: 'none' })
        return
      }
      selectedMentalities.push(name)
    }
    this.setData({ selectedMentalities }, () => { this.refreshMentalityDisplayList() })
  },

  handleSetChange(e) {
    const index   = Number(e.detail.value || 0)
    const name    = (this.data.setOptions || [])[index] || ''
    this.updateState('selectedSet', name === '无' ? '' : name)
    this.setData({ setIndex: index })
  },

  handleTiangongChange(e) {
    const index = Number(e.detail.value || 0)
    const name  = this.data.tiangongOptions[index] || ''
    this.setData({ tiangongIndex: index, selectedTiangong: name === '无' ? '' : name }, () => {
      this.calculate()
    })
  },

  handleFoodChange(e) {
    const index = Number(e.detail.value || 0)
    this.setData({ foodIndex: index, selectedFood: this.data.foodOptions[index] || '√' }, () => {
      this.calculate()
    })
  },

  handleTabChange(e) { this.setData({ 'ui.currentTab': e.currentTarget.dataset.tab }) },

  handleScrollToTop() { wx.pageScrollTo({ scrollTop: 0, duration: 300 }) },

  handleShowGrandPanel() {
    const currentGrandPanel = this.getCurrentGrandPanelBySchool()
    if (!currentGrandPanel) {
      wx.showToast({ title: '当前流派暂无毕业面板数据', icon: 'none' })
      return
    }
    this.setData({ currentGrandPanel, 'ui.showGrandPanel': true })
  },

  handleApplyGrandPanel() {
    const panel = this.data.currentGrandPanel || this.getCurrentGrandPanelBySchool()
    if (!panel) {
      wx.showToast({ title: '当前流派暂无毕业面板数据', icon: 'none' })
      return
    }
    this.batchUpdateForm({
      physicalMinAttack:   String(panel.attackOuterMin            ?? ''),
      physicalMaxAttack:   String(panel.attackOuterMax            ?? ''),
      physicalPenetration: String(panel.armorPenetration          ?? ''),
      physicalBonus:       String(panel.damageBonusOuter          ?? ''),
      mingjinMin:          String(panel.mingjinMin                ?? ''),
      mingjinMax:          String(panel.mingjinMax                ?? ''),
      mingjinPen:          String(panel.mingjinPenetration        ?? ''),
      lieshiMin:           String(panel.lieshiMin                 ?? ''),
      lieshiMax:           String(panel.lieshiMax                 ?? ''),
      lieshiPen:           String(panel.lieshiPenetration         ?? ''),
      qiansiMin:           String(panel.qiansiMin                 ?? ''),
      qiansiMax:           String(panel.qiansiMax                 ?? ''),
      qiansiPen:           String(panel.qiansiPenetration         ?? ''),
      pozhuMin:            String(panel.pozhuMin                  ?? ''),
      pozhuMax:            String(panel.pozhuMax                  ?? ''),
      pozhuPen:            String(panel.pozhuPenetration          ?? ''),
      elementBonus:        String(panel.damageBonusElement        ?? ''),
      precisionRate:       String(panel.accuracyRate              ?? ''),
      insightRate:         String(panel.criticalRate              ?? ''),
      perfectRate:         String(panel.criticalDamageRate        ?? ''),
      directInsightRate:   String(panel.directCriticalRate        ?? ''),
      directPerfectRate:   String(panel.directCriticalDamageRate  ?? ''),
      insightDamageBonus:  String(panel.criticalBonus             ?? ''),
      perfectDamageBonus:  String(panel.criticalDamageBonus       ?? ''),
      allMartialBonus:     String(panel.allMartialBonus           ?? ''),
      bossBonus:           String(panel.bossBonus                 ?? ''),
      singleControlBonus:  String(panel.singleControlBonus        ?? ''),
      singleBurstBonus:    String(panel.singleBurstBonus          ?? ''),
      groupDamageBonus:    String(panel.groupDamageBonus          ?? ''),
      groupAbnormalBonus:  String(panel.groupAbnormalBonus        ?? ''),
      martialBoostValue1:  String(panel.weaponBoost1              ?? ''),
      martialBoostValue2:  String(panel.weaponBoost2              ?? ''),
      noteValue1:          String(panel.noteValue1                ?? ''),
      noteValue2:          String(panel.noteValue2                ?? ''),
      noteValue3:          String(panel.noteValue3                ?? ''),
    })
    this.setData({ currentGrandPanel: panel, 'ui.showGrandPanel': true })
    wx.nextTick(() => { wx.showToast({ title: '已自动填入毕业面板', icon: 'success' }) })
  },

  // ─────────────────────────────────────────────
  // 主计算入口（组装结果写入 Store，不含具体计算逻辑）
  // ─────────────────────────────────────────────

  handleCalculate() {
    this._shouldSaveOnNextCalculate = true
    const { axisRawResult } = this.calculate()
    this.buildImproveList(axisRawResult)
    this.buildPanelAdvice()
    this.updateState('improveReady', true)
  },

  calculate() {
    const calc = this._buildCalc();

    calcStore.setCalcSession(
      { ...this.data.form }, 
      {
      currentSchool:      this.data.currentSchool  || {},
      currentTarget:      this.data.currentTarget  || {},
      currentSkill:       this.data.currentSkill   || null,
      currentAxis:        this.data.currentAxis    || null,
      selectedSet:        this.data.selectedSet    || '',
      selectedMentalities: this.data.selectedMentalities || [],
      selectedTiangong:   this.data.selectedTiangong || '',
      selectedFood:       this.data.selectedFood  || '',
      // 静态数据通过 calcStore.setCalcSession 内部自动补全
      setMap,
      bonusMap,
      skills,
      // 显式传入 panelInput（当前表单）
      panelInput: this.data.form,
    });

    const currentSkill = this.data.currentSkill || {}
    const singleResult = calc.calculateSkillResult(currentSkill, {
      exhausted: 0, yishuiStacks: 0, bengjieStacks: 0, lowEnergy: 0,
      bonuses: [],
      hasYishui:  this.hasSelectedMentality('易水歌'),
      hasBengjie: this.hasSelectedMentality('断石之构'),
    })

    const axisRawResult = calc.calculateCurrentAxisResult()

    const fmt = n => calc.format(n)

    const result = {
      schoolName:  singleResult.schoolName  || '',
      skillName:   singleResult.skillName   || '',
      targetName:  singleResult.targetName  || '',

      targetPhysicalDefense:    String(singleResult.targetPhysicalDefense || 0),
      targetCommonDamageBonus:  `${fmt(singleResult.targetCommonDamageBonus  * 100)}%`,
      targetExhaustedDamageBonus: `${fmt(singleResult.targetExhaustedDamageBonus * 100)}%`,
      totalDamageIncrease:      `${fmt(singleResult.totalDamageIncrease * 100)}%`,
      correction:               fmt(singleResult.correction),
      noteMultiplier:           fmt(singleResult.noteMultiplier),
      martialBoostApplied:      (singleResult.martialBoostApplied || []).join('、'),

      mainElement:              (this.data.currentSchool || {}).mainElement || '',
      hiddenMainElementAttack:  String((this.data.currentSchool || {}).hiddenMainElementAttack || 0),
      matchedNoteName:          singleResult.matchedNoteName  || '',
      matchedNoteValue:         `${fmt(singleResult.matchedNoteValue * 100)}%`,

      finalInsightRate: `${fmt(singleResult.finalInsightRate * 100)}%`,
      finalPerfectRate: `${fmt(singleResult.finalPerfectRate * 100)}%`,

      glancingDamage: fmt(singleResult.glancingDamage),
      normalDamage:   fmt(singleResult.normalDamage),
      insightDamage:  fmt(singleResult.insightDamage),
      perfectDamage:  fmt(singleResult.perfectDamage),
      expectedDamage: fmt(singleResult.expectedDamage),

      glancingRate: `${fmt(singleResult.glancingRate     * 100)}%`,
      normalRate:   `${fmt(singleResult.normalRate       * 100)}%`,
      insightRate:  `${fmt(singleResult.insightProcRate  * 100)}%`,
      perfectRate:  `${fmt(singleResult.perfectProcRate  * 100)}%`,

      avgPhysicalPart:     fmt(singleResult.avgPhysicalPart),
      avgMainElementPart:  fmt(singleResult.avgMainElementPart),
      avgOtherElementPart: fmt(singleResult.avgOtherElementPart),
      maxPhysicalPart:     fmt(singleResult.maxPhysicalPart),
      maxMainElementPart:  fmt(singleResult.maxMainElementPart),
      maxOtherElementPart: fmt(singleResult.maxOtherElementPart),
      minPhysicalPart:     fmt(singleResult.minPhysicalPart),
      minMainElementPart:  fmt(singleResult.minMainElementPart),
      minOtherElementPart: fmt(singleResult.minOtherElementPart),
    }

    let axisResult = null
    if (axisRawResult) {
      axisResult = {
        axisName:            axisRawResult.axisName,
        schoolName:          axisRawResult.schoolName,
        rawDps:              axisRawResult.rawDps,
        duration:            fmt(axisRawResult.duration),
        graduateDps:         fmt(axisRawResult.graduateDps),
        totalExpectedDamage: fmt(axisRawResult.totalExpectedDamage),
        dps:                 fmt(axisRawResult.dps),
        graduateRate:        `${fmt(axisRawResult.graduateRate * 100)}%`,
        details: (axisRawResult.details || []).map(item => ({
          ...item,
          expectedDamage: fmt(item.expectedDamage),
          totalDamage:    fmt(item.totalDamage),
          finalInsightRate: `${fmt((item.finalInsightRate || 0) * 100)}%`,
          finalPerfectRate: `${fmt((item.finalPerfectRate || 0) * 100)}%`,
          glancingRate:     `${fmt((item.glancingRate     || 0) * 100)}%`,
          normalRate:       `${fmt((item.normalRate       || 0) * 100)}%`,
          insightProcRate:  `${fmt((item.insightProcRate  || 0) * 100)}%`,
          perfectProcRate:  `${fmt((item.perfectProcRate  || 0) * 100)}%`,
          bossBonus:        `${fmt((item.bossBonus        || 0) * 100)}%`,
          totalDamageIncrease:        `${fmt((item.totalDamageIncrease        || 0) * 100)}%`,
          insightDamageBonus:         `${fmt((item.insightDamageBonus         || 0) * 100)}%`,
          perfectDamageBonus:         `${fmt((item.perfectDamageBonus         || 0) * 100)}%`,
          martialBoostDamageIncrease: `${fmt((item.martialBoostDamageIncrease || 0) * 100)}%`,
          noteValue:                   fmt((item.noteValue || 0) * 100) + '%',
        })),
        skillSummaryList: (axisRawResult.skillSummaryList || []).map(item => ({
          skillName:   item.skillName,
          totalDamage: fmt(item.totalDamage),
          ratio: axisRawResult.totalExpectedDamage > 0
            ? `${fmt(item.totalDamage / axisRawResult.totalExpectedDamage * 100)}%`
            : '0.00%',
        })),
        hitTypeStats: {
          glancingRate: `${fmt((axisRawResult.hitTypeStats.glancingRate || 0) * 100)}%`,
          normalRate:   `${fmt((axisRawResult.hitTypeStats.normalRate   || 0) * 100)}%`,
          insightRate:  `${fmt((axisRawResult.hitTypeStats.insightRate  || 0) * 100)}%`,
          perfectRate:  `${fmt((axisRawResult.hitTypeStats.perfectRate  || 0) * 100)}%`,
        },
      }
    }

    this.setCalculateResults({ result, axisResult })
    this.autoSaveConfig(result, axisResult)

    // calculate() 末尾，新增一个"计算上下文快照"
    app.equipmentStore.setCalcContextSnapshot({
      selectedMentalities: [...(this.data.selectedMentalities || [])],
      selectedTiangong:    this.data.selectedTiangong    || '',
      selectedFood:        this.data.selectedFood        || '',
      currentAxis:         this.data.currentAxis         || null,
      currentSchool:       this.data.currentSchool       || {},
      currentTarget:       this.data.currentTarget       || {},
      selectedSet:         this.data.selectedSet         || '',
      currentSkill:        this.data.currentSkill        || null,
    });

    return { result, axisResult, axisRawResult } 
  },

  // ─────────────────────────────────────────────
  // 自动保存
  // ─────────────────────────────────────────────

  autoSaveConfig(result, axisResult) {
    if (!this._shouldSaveOnNextCalculate) return
    this._shouldSaveOnNextCalculate = false
  
    const config = this.buildCurrentConfig(result, axisResult, 'auto')
  
    let savedConfigs = wx.getStorageSync(AUTO_SAVE_KEY) || []
    savedConfigs.unshift(config)
    if (savedConfigs.length > AUTO_SAVE_LIMIT) {
      savedConfigs = savedConfigs.slice(0, AUTO_SAVE_LIMIT)
    }
  
    wx.setStorageSync(AUTO_SAVE_KEY, savedConfigs)
    this.setLastSavedConfig(config)
  
    this.setData({ savedConfigs })
    this.checkCalibrationReminder()
  },

  checkCalibrationReminder() {
    const reminderData = wx.getStorageSync('calibrationReminder');
    const hasPanel = app.equipmentStore.basePanel && 
    Object.keys(app.equipmentStore.basePanel).length > 0;
    // 已校准或在提醒抑制期内
    if (hasPanel || (reminderData && Date.now() < reminderData.suppressUntil)) {
      return;
    }
    
    wx.showModal({
      title: '提示',
      content: '检测到您还未校准基础面板，是否前往装备管理页进行校准？校准后可使用装备遍历功能。',
      confirmText: '去校准',
      cancelText: '暂不',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/equipment/equipment' });
        } else {
          // 询问是否1天内不再提醒
          wx.showModal({
            title: '提示',
            content: '是否1天内不再提醒？',
            success: (res2) => {
              if (res2.confirm) {
                wx.setStorageSync('calibrationReminder', {
                  suppressUntil: Date.now() + 24 * 60 * 60 * 1000
                });
              }
            }
          });
        }
      }
    });
  },

  // ─────────────────────────────────────────────
  // 面板建议
  // ─────────────────────────────────────────────

  buildPanelAdvice() {
    const form          = this.data.form
    const currentSchool = this.data.currentSchool || {}
    const selectedSet   = this.data.selectedSet   || ''
    const schoolName    = currentSchool.schoolName || ''
    const mainElement   = currentSchool.mainElement || ''
    const adviceList    = []

    const num  = key => {
      const v = form[key]
      if (v === '' || v === undefined || v === null) return 0
      return Number(String(v).replace('%', '')) || 0
    }
    const warn = text => adviceList.push({ level: 'warn', text })
    const info = text => adviceList.push({ level: 'info', text })

    // 全局规则
    if (num('precisionRate') < 99) warn('精准率低于 99%，建议将精准率提升至 100%')
    if (num('physicalPenetration') < 23.4) warn('外功穿透低于 23.4，建议进一步提升外功穿透')

    const allElements        = ['鸣金', '牵丝', '裂石', '破竹']
    const nonMainElements    = allElements.filter(e => e !== mainElement)
    const elementMaxKeyMap   = { 鸣金: 'mingjinMax', 牵丝: 'qiansiMax', 裂石: 'lieshiMax', 破竹: 'pozhuMax' }
    const elementMinKeyMap   = { 鸣金: 'mingjinMin', 牵丝: 'qiansiMin', 裂石: 'lieshiMin', 破竹: 'pozhuMin' }
    const nonMainWithMax     = nonMainElements.filter(e => num(elementMaxKeyMap[e]) > 0)
    const nonMainWithLargeMin = nonMainElements.filter(e => num(elementMinKeyMap[e]) > 100)

    if (nonMainWithMax.length > 0)
      info(`检测到非主属性（${nonMainWithMax.join('、')}）存在最大属攻，建议将外系属攻优化掉以减少词条浪费`)
    if (nonMainWithLargeMin.length > 0)
      warn(`非主属性（${nonMainWithLargeMin.join('、')}）最小属攻超过 100，建议减少外系最小属攻`)

    const mainMinKey = elementMinKeyMap[mainElement]
    const mainMaxKey = elementMaxKeyMap[mainElement]
    if (mainMinKey && num(mainMinKey) > 300) warn(`${mainElement}最小属攻超过 300，建议减少本系最小属攻以优化词条分配`)
    if (mainMaxKey && num(mainMaxKey) > 650) warn(`${mainElement}最大属攻超过 650，建议减少本系最大属攻以优化词条分配`)
    if (num('martialBoostValue1') === 0) warn('武学增效数值为 0，建议提高武学增效以提升总体伤害')
    if (num('bossBonus') === 0) warn('首领增伤为 0，建议提高首领增伤')

    // 流派规则
    const schoolRules = {
      鸣金虹: () => {
        if (num('physicalMaxAttack') < 2200) warn('最大外功低于 2200，建议进一步提升最大外功')
        if (num('physicalMinAttack') > 800)  warn('最小外攻超过 800，建议减少最小外攻')
        if (num('perfectRate') < 35)         warn('会意率低于 35%，建议将会意率提升至 37% 以上')
        if (num('insightRate') < 38)         warn('会心率低于 38%，建议将会心率提升至 42% 以上')
        if (num('noteValue1') < 14)          info('剑蓄力增伤定音低于 14%，建议提高剑蓄力增伤定音')
      },
      鸣金影: () => {
        if (num('physicalMaxAttack') < 2200) warn('最大外功低于 2200，建议进一步提升最大外功')
        if (num('physicalMinAttack') > 800)  warn('最小外攻超过 800，建议减少最小外攻')
        if (num('perfectRate') < 35)         warn('会意率低于 35%，建议将会意率提升至 37% 以上')
        if (num('insightRate') < 38)         warn('会心率低于 38%，建议将会心率提升至 42% 以上')
        if (num('noteValue1') < 14)          info('流血增伤定音低于 14%，建议提高流血增伤定音')
      },
      牵丝玉: () => {
        if (num('physicalMaxAttack') < 2050) warn('最大外功低于 2050，建议进一步提升最大外功')
        if (num('physicalMinAttack') < 750)  warn('最小外攻低于 750，建议进一步提升最小外攻')
        if (num('insightRate') < 60)         warn('会心率低于 60%，建议将会心率提升至 65% 以上')
        if (num('noteValue1') < 14)          info('伞特殊增伤定音低于 14%，建议提高伞特殊增伤定音')
        if (num('perfectRate') > 21)         warn('会意率超过 21%，建议降低会意率以优化词条分配')
      },
      裂石威: () => {
        if (num('physicalMaxAttack') < 1950) warn('最大外功低于 1950，建议进一步提升最大外功')
        if (num('physicalMinAttack') < 800)  warn('最小外攻低于 800，建议进一步提升最小外攻')
        if (num('insightRate') < 54.5)       warn('会心率低于 54.5%，建议将会心率提升至 56%')
        if (num('insightRate') > 57.5)       warn('会心率高于 57.5%，建议将会心率降低至 56% 附近')
        if (num('noteValue1') < 14)          info('陌刀蓄力增伤定音低于 14%，建议提高陌刀蓄力增伤定音')
        if (num('perfectRate') > 16)         warn('会意率超过 16%，建议降低会意率以优化词条分配')
        if (selectedSet !== '时雨')           info('裂石威推荐使用时雨套装，建议检查套装选择')
      },
      破竹风: () => {
        if (num('physicalMaxAttack') < 2100) warn('最大外功低于 2100，建议进一步提升最大外功')
        if (num('physicalMinAttack') < 800)  warn('最小外攻低于 800，建议进一步提升最小外攻')
        if (num('insightRate') < 60)         warn('会心率低于 60%，建议将会心率提升至 65% 以上')
        if (num('noteValue1') < 14)          info('鼠鼠增伤定音低于 14%，建议提高鼠鼠增伤定音')
        if (num('perfectRate') > 21)         warn('会意率超过 21%，建议降低会意率以优化词条分配')
      },
      破竹尘: () => {
        if (num('physicalMaxAttack') < 2000) warn('最大外功低于 2000，建议进一步提升最大外功')
        if (num('physicalMinAttack') < 800)  warn('最小外攻低于 800，建议进一步提升最小外攻')
        if (num('insightRate') < 65)         warn('会心率低于 65%，建议将会心率提升至 70% 以上')
        if (num('noteValue1') < 14)          info('伞武学增伤定音低于 14%，建议提高伞武学增伤定音')
        if (num('perfectRate') > 15 && selectedSet !== '飞隼')
          warn('会意率超过 15% 且套装非飞隼，建议降低会意率以优化词条分配')
      },
    }
    if (schoolRules[schoolName]) schoolRules[schoolName]()

    // 套装规则
    if (selectedSet === '飞隼' && num('perfectRate') < 17)
      info('当前选择了飞隼套装，建议将会意率提升至 17% 以上以充分发挥套装效果')
    if (selectedSet === '时雨' && schoolName !== '裂石威')
      warn('时雨套装需要护盾触发效果，当前流派可能无法稳定触发，建议选择时雨（无盾）版本或其他套装')

    this.updateState('panelAdviceList', adviceList)
  },

  // ─────────────────────────────────────────────
  // 词条提升分析
  // ─────────────────────────────────────────────

  buildImproveList(axisRawResult) {
    if (!axisRawResult || !axisRawResult.rawDps || axisRawResult.rawDps <= 0) {
      this.updateState('improveReady', false)
      this.updateState('improveList', [])
      return
    }

    const baseDps       = axisRawResult.rawDps
    const form          = this.data.form
    const currentSchool = this.data.currentSchool || {}
    const { affixList } = require('../../data/Affixs')
    // 使用一个临时计算器实例来访问 buildOverrideForm / calculateDpsWithForm
    const calc = this._buildCalc()
    const rows = []

    for (const affix of affixList) {
      const overrideForm = calc.buildOverrideForm(affix, form, currentSchool)
      if (!overrideForm) continue

      // 用覆盖后的 form 重新创建计算器，再计算 DPS
      const calcOverride = createCalculator({
        form:               overrideForm,
        currentSchool:      this.data.currentSchool || {},
        currentTarget:      this.data.currentTarget || {},
        currentSkill:       this.data.currentSkill  || {},
        currentAxis:        this.data.currentAxis,
        selectedSet:        this.data.selectedSet   || '',
        selectedMentalities: this.data.selectedMentalities || [],
        selectedTiangong:   this.data.selectedTiangong || '',
        selectedFood:       this.data.selectedFood  || '',
        setMap,
        bonusMap,
        skills,
      })
      const boostedDps = calcOverride.calculateDpsWithForm(overrideForm)
      if (boostedDps === null || boostedDps <= 0) continue

      const rate = (boostedDps - baseDps) / baseDps
      rows.push({
        name:        affix.name,
        maxValue:    calc.formatAffixMaxValue(affix),
        boostedDps:  calc.formatDpsValue(boostedDps),
        improveRate: (rate * 100).toFixed(2) + '%',
        _rate:       rate,
      })
    }

    rows.sort((a, b) => b._rate - a._rate)
    this.updateState('improveList', rows)
    this.updateState('improveReady', true)
  },

  getManualSavedConfigs() {
    const saved = wx.getStorageSync(MANUAL_SAVE_KEY) || []
    const normalized = Array.from({ length: MANUAL_SLOT_COUNT }, (_, index) => saved[index] || null)
    return normalized
  },

  setManualSavedConfigs(list) {
    const normalized = Array.from({ length: MANUAL_SLOT_COUNT }, (_, index) => list[index] || null)
    wx.setStorageSync(MANUAL_SAVE_KEY, normalized)
    this.setData({ manualSavedConfigs: normalized })
  },

  setLastSavedConfig(config) {
    if (!config) return
    wx.setStorageSync(LAST_SAVED_KEY, config)
  },

  buildCurrentConfig(result, axisResult, saveType = 'auto', manualSlot = null) {
    const form = this.data.form || {}
    const currentSchool = this.data.currentSchool || {}
    const currentTarget = this.data.currentTarget || {}
  
    return {
      id: Date.now(),
      saveType,
      manualSlot,
      saveTime: new Date().toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      label: `${currentSchool.schoolName || '未知流派'} · ${currentTarget.targetName || '未知目标'}`,
      schoolIndex: this.data.schoolIndex,
      skillIndex: this.data.skillIndex,
      targetIndex: this.data.targetIndex,
      axisIndex: this.data.axisIndex,
      setIndex: this.data.setIndex,
      selectedSet: this.data.selectedSet,
      tiangongIndex: this.data.tiangongIndex,
      selectedTiangong: this.data.selectedTiangong,
      foodIndex: this.data.foodIndex,
      selectedFood: this.data.selectedFood,
      selectedMentalities: this.data.selectedMentalities || [],
      form: { ...form },
      result: result || {},
      axisResult: axisResult || null,
    }
  },

  applyConfig(config, options = {}) {
    const { showToast = true } = options
    if (!config) return
  
    const schoolIndex = config.schoolIndex || 0
    const currentSchool = this.buildCurrentSchool(this.data.schools[schoolIndex])
    app.equipmentStore.setCurrentSchool(currentSchool)
  
    this.updateState('currentSchool', currentSchool)
    this.updateState('currentTarget', this.data.targets[config.targetIndex || 0] || {})
    this.updateState('selectedSet', config.selectedSet || '')
    this.batchUpdateForm({ ...(config.form || {}) })
  
    this.setData({
      schoolIndex,
      currentSchoolAxesText: this.getAxesText(currentSchool),
      currentGrandPanel: this.data.grandPanelMap[currentSchool.schoolName] || null,
      skillIndex: config.skillIndex || 0,
      currentSkill: this.data.skills[config.skillIndex || 0] || {},
      targetIndex: config.targetIndex || 0,
      axisIndex: config.axisIndex || 0,
      setIndex: config.setIndex || 0,
      tiangongIndex: config.tiangongIndex || 0,
      selectedTiangong: config.selectedTiangong || '',
      foodIndex: config.foodIndex || 0,
      selectedFood: config.selectedFood || '×',
      selectedMentalities: config.selectedMentalities || [],
    }, () => {
      this.refreshMentalityDisplayList()
      this.refreshAxisListBySchool()
  
      wx.nextTick(() => {
        const currentAxisList = this.data.currentAxisList || []
        const axisIndex = config.axisIndex || 0
        const axis = currentAxisList[axisIndex] || currentAxisList[0] || null
  
        this.setData({ axisIndex, currentAxis: axis })
        app.calcStore.setCurrentAxis(axis)
        this.calculate()
  
        if (showToast) {
          wx.showToast({ title: '配置已加载', icon: 'success' })
        }
      })
    })
  },


  // ─────────────────────────────────────────────
  // 配置存取
  // ─────────────────────────────────────────────

  navigateToEquipment() {
    wx.navigateTo({
      url: '/pages/equipment/equipment'
    });
  },

  handleManualSaveConfig() {
    const config = this.buildCurrentConfig(this.data.result, this.data.axisResult, 'manual')
    const manualSavedConfigs = this.getManualSavedConfigs()
  
    const emptyIndex = manualSavedConfigs.findIndex(item => !item)
  
    if (emptyIndex !== -1) {
      config.manualSlot = emptyIndex
      manualSavedConfigs[emptyIndex] = config
      this.setManualSavedConfigs(manualSavedConfigs)
      this.setLastSavedConfig(config)
      wx.showToast({ title: `已保存到栏位${emptyIndex + 1}`, icon: 'success' })
      return
    }
  
    wx.showActionSheet({
      itemList: manualSavedConfigs.map((item, index) =>
        `栏位${index + 1}：${item?.label || '空'}`
      ),
      success: (res) => {
        const replaceIndex = res.tapIndex
        config.manualSlot = replaceIndex
  
        wx.showModal({
          title: '替换手动配置',
          content: `确定替换栏位${replaceIndex + 1}中的配置吗？`,
          success: (modalRes) => {
            if (!modalRes.confirm) return
  
            const latestList = this.getManualSavedConfigs()
            latestList[replaceIndex] = config
            this.setManualSavedConfigs(latestList)
            this.setLastSavedConfig(config)
            wx.showToast({ title: `已替换栏位${replaceIndex + 1}`, icon: 'success' })
          }
        })
      }
    })
  },

  handleLoadManualConfig(e) {
    const index = Number(e.currentTarget.dataset.index)
    const manualSavedConfigs = this.data.manualSavedConfigs || []
    const config = manualSavedConfigs[index]
    if (!config) return
  
    this.applyConfig(config)
  },

  handleDeleteManualConfig(e) {
    const index = Number(e.currentTarget.dataset.index)
    const manualSavedConfigs = this.getManualSavedConfigs()
  
    if (!manualSavedConfigs[index]) return
  
    wx.showModal({
      title: '删除手动配置',
      content: `确定删除栏位${index + 1}中的配置吗？`,
      success: (res) => {
        if (!res.confirm) return
        manualSavedConfigs[index] = null
        this.setManualSavedConfigs(manualSavedConfigs)
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  handleLoadConfig(e) {
    const index = e.currentTarget.dataset.index
    const savedConfigs = this.data.savedConfigs || []
    const config = savedConfigs[index]
    if (!config) return
  
    this.applyConfig(config)
  },

  handleDeleteConfig(e) {
    const index = e.currentTarget.dataset.index
    let savedConfigs = (this.data.savedConfigs || []).filter((_, i) => i !== index)
    wx.setStorageSync(AUTO_SAVE_KEY, savedConfigs)
    this.setData({ savedConfigs })
    wx.showToast({ title: '已删除', icon: 'none' })
  },

  resetForm() {
    const defaultSchool = this.buildCurrentSchool(this.data.schools[defaultSchoolIndex])
    this.updateState('currentSchool', defaultSchool)
    this.updateState('currentTarget', this.data.targets[defaultTargetIndex] || {})
    this.updateState('selectedSet', '飞隼')

    const emptyForm = {
      physicalMinAttack: '', physicalMaxAttack: '', physicalPenetration: '', physicalBonus: '',
      mingjinMin: '', mingjinMax: '', mingjinPen: '',
      qiansiMin: '',  qiansiMax: '',  qiansiPen: '',
      lieshiMin: '',  lieshiMax: '',  lieshiPen: '',
      pozhuMin: '',   pozhuMax: '',   pozhuPen: '',
      elementBonus: '',
      precisionRate: '', insightRate: '', directInsightRate: '',
      perfectRate: '',   directPerfectRate: '',
      insightDamageBonus: '', perfectDamageBonus: '', damageIncrease: '',
      allMartialBonus: '', bossBonus: '',
      singleControlBonus: '', singleBurstBonus: '',
      groupDamageBonus: '', groupAbnormalBonus: '',
      noteValue1: '', noteValue2: '', noteValue3: '',
      martialBoostValue1: '', martialBoostValue2: '',
    }
    this.batchUpdateForm(emptyForm)
    calcStore.clearCalcSession();
    this.setData({
      schoolIndex:           defaultSchoolIndex,
      currentSchoolAxesText: this.getAxesText(defaultSchool),
      currentGrandPanel:     this.data.grandPanelMap[defaultSchool.schoolName] || null,
      skillIndex:            defaultSkillIndex,
      currentSkill:          this.data.skills[defaultSkillIndex] || {},
      targetIndex:           defaultTargetIndex,
      selectedMentalities:   [],
      selectedMentalitiesText: '无',
      mentalityDisplayList:  [],
      setIndex:              setList.findIndex(item => item.name === '飞隼') + 1,
      tiangongIndex:         1,
      selectedTiangong:      '火',
      foodIndex:             1,
      selectedFood:          '√',
      'ui.showAdvanced':     false,
      'ui.showResultDetail': false,
      'ui.showAllElements':  false,
      'ui.showGrandPanel':   false,
    }, () => {
      this.refreshMentalityDisplayList()
      this.refreshAxisListBySchool()
      this.calculate()
    })
  },
})