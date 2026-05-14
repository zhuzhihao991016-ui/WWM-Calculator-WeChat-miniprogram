import { createStoreBindings } from 'mobx-miniprogram-bindings';
import { calcStore } from '../../store/calcStore';
const app = getApp()
const { createCalculator } = require('../../utils/calculator')
const { getGameData, getLocalGameData, getGameDataSourceInfo } = require('../../utils/cloudData')
const {
  getLocalUserConfig,
  normalizeManualSavedConfigs,
  saveUserConfigPatch,
  syncUserConfig
} = require('../../utils/userConfigStorage')

const localGameData = getLocalGameData()
let targets = localGameData.targets
let schools = localGameData.schools
let skills = localGameData.skills
let grandPanelList = localGameData.grandPanelList
let grandPanelMap = localGameData.grandPanelMap
let axesList = localGameData.axesList
let axesMap = localGameData.axesMap
let axisNameMap = localGameData.axisNameMap
let setMap = localGameData.setMap
let setList = localGameData.setList
let bonusList = localGameData.bonusList
let bonusMap = localGameData.bonusMap
let affixList = localGameData.affixList

const AUTO_SAVE_KEY = 'savedConfigs'
const MANUAL_SAVE_KEY = 'manualSavedConfigs'
const WXACODE_IMAGE_PATH = '/images/wxacode.jpg'

const AUTO_SAVE_LIMIT = 3

const defaultTargetName  = '91幽牙蛇影'
const targetFoundIndex   = targets.findIndex(item => item.targetName === defaultTargetName)
const defaultTargetIndex = targetFoundIndex >= 0 ? targetFoundIndex : 0
const defaultSchoolIndex = 0
const defaultSkillIndex  = 0

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
    expandedSkillMap: {},

    savedConfigs: [],
    manualSavedConfigs: [null, null, null],
    showSharePoster: false,
    sharePosterPath: '',
    sharePosterGenerating: false,
    showUpdatePopup: false,
    updateLogVersion: '',
    updateLogContent: [],
    dataSourceInfo: getGameDataSourceInfo()
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

  openUpdatePopup() {
    this.setData({
      showUpdatePopup: true,
      updateLogVersion: app.globalData.updateLogVersion,
      updateLogContent: app.globalData.updateLogContent || []
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
  noop() {},
  adLoad() {},
  adError() {},
  adClose() {},

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

    getGameData().then(gameData => {
      this.setData({ dataSourceInfo: getGameDataSourceInfo() })
      this.applyGameData(gameData)
      this.initCalculatorPage()
    })
  },

  applyGameData(gameData) {
    targets = gameData.targets || targets
    schools = gameData.schools || schools
    skills = gameData.skills || skills
    grandPanelList = gameData.grandPanelList || grandPanelList
    grandPanelMap = gameData.grandPanelMap || grandPanelMap
    axesList = gameData.axesList || axesList
    axesMap = gameData.axesMap || axesMap
    axisNameMap = gameData.axisNameMap || axisNameMap
    setMap = gameData.setMap || setMap
    setList = gameData.setList || setList
    bonusList = gameData.bonusList || bonusList
    bonusMap = gameData.bonusMap || bonusMap
    affixList = gameData.affixList || affixList

    const targetIndex = this.getDefaultTargetIndex()
    this.setData({
      axesList,
      axesMap,
      axisNameMap,
      schools,
      schoolOptions: schools.map(item => item.schoolName),
      skills,
      skillOptions: skills.map(item => item.skillName),
      targets,
      targetOptions: targets.map(item => item.targetName),
      targetIndex,
      grandPanelList,
      grandPanelMap,
      setList,
      setOptions: ['无', ...setList.map(item => item.name)],
      setIndex: setList.findIndex(item => item.name === '飞隼') + 1,
    })
  },

  getDefaultTargetIndex() {
    const foundIndex = targets.findIndex(item => item.targetName === defaultTargetName)
    return foundIndex >= 0 ? foundIndex : 0
  },

  initCalculatorPage() {
    const targetIndex = this.getDefaultTargetIndex()

    const savedConfigs = wx.getStorageSync(AUTO_SAVE_KEY) || []
    const localUserConfig = getLocalUserConfig()
    const manualSavedConfigs = normalizeManualSavedConfigs(localUserConfig.manualSavedConfigs)
    const lastSavedConfig = localUserConfig.lastSavedConfig

    const currentSchool = this.buildCurrentSchool(this.data.schools[defaultSchoolIndex])
    const currentTarget = this.data.targets[targetIndex] || {}

    this.updateState('currentSchool', currentSchool)
    this.updateState('currentTarget', currentTarget)
    this.updateState('selectedSet', '飞隼')

    const currentAxisList = this.data.currentAxisList || [];
    const defaultAxis = currentAxisList[this.data.axisIndex || 0] || null;
    app.calcStore.setCurrentAxis(defaultAxis);
    app.equipmentStore.setCurrentSchool(currentSchool) ;

    const savedData = localUserConfig.equipmentData
    if (savedData?.basePanel) {
    app.equipmentStore.setBasePanel(savedData.basePanel, savedData.basePanelMeta || null)
    }

    this.setData({
      schoolIndex:          defaultSchoolIndex,
      currentSchoolAxesText: this.getAxesText(currentSchool),
      skillIndex:           defaultSkillIndex,
      currentSkill:         this.data.skills[defaultSkillIndex] || {},
      targetIndex,
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
      this.syncCloudUserConfig()
    })
  },

  async syncCloudUserConfig() {
    if (this._syncingCloudUserConfig) return
    this._syncingCloudUserConfig = true

    try {
      const result = await syncUserConfig()
      const cloudConfig = result.source === 'cloud' ? result.data : null
      if (!cloudConfig) return

      const manualSavedConfigs = normalizeManualSavedConfigs(cloudConfig.manualSavedConfigs || this.data.manualSavedConfigs || [])
      this.setData({ manualSavedConfigs })

      if (cloudConfig.equipmentData?.basePanel) {
        app.equipmentStore.setBasePanel(
          cloudConfig.equipmentData.basePanel,
          cloudConfig.equipmentData.basePanelMeta || null
        )
      }

      if (cloudConfig.lastSavedConfig) {
        this.applyConfig(cloudConfig.lastSavedConfig, { showToast: false })
      }
    } finally {
      this._syncingCloudUserConfig = false
    }
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

  handleTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ 'ui.currentTab': tab }, () => {
      wx.pageScrollTo({ scrollTop: 0, duration: 0 })
      if (tab === 'detail') {
        this.refreshImproveAnalysis()
      }
    })
  },

  refreshImproveAnalysis() {
    const { axisRawResult } = this.calculate()
    this.buildImproveList(axisRawResult)
    this.buildPanelAdvice()
    this.setData({ expandedSkillMap: {} })
  },

  toggleSkillDetail(e) {
    const index = e.currentTarget.dataset.index
    if (index === undefined || index === null) return
    const key = String(index)
    const expandedSkillMap = { ...(this.data.expandedSkillMap || {}) }
    expandedSkillMap[key] = !expandedSkillMap[key]
    this.setData({ expandedSkillMap })
  },

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
    const isSetNotIn = names => !names.includes(selectedSet)

    const allElements        = ['鸣金', '牵丝', '裂石', '破竹']
    const nonMainElements    = allElements.filter(e => e !== mainElement)
    const elementMaxKeyMap   = { 鸣金: 'mingjinMax', 牵丝: 'qiansiMax', 裂石: 'lieshiMax', 破竹: 'pozhuMax' }
    const elementMinKeyMap   = { 鸣金: 'mingjinMin', 牵丝: 'qiansiMin', 裂石: 'lieshiMin', 破竹: 'pozhuMin' }
    const buildLargeAttackAdvice = () => {
      // 全局规则
      if (num('precisionRate') < 99) warn('精准率低于 99%，建议将精准率提升至 100%')
      if (num('physicalPenetration') < 32) warn('外功穿透低于 32，建议进一步提升外功穿透')

      const nonMainWithMax      = nonMainElements.filter(e => num(elementMaxKeyMap[e]) > 0)
      const nonMainWithLargeMin = nonMainElements.filter(e => num(elementMinKeyMap[e]) > 100)

      if (nonMainWithMax.length > 0)
        info(`检测到非主属性（${nonMainWithMax.join('、')}）存在最大属攻，建议将外系属攻优化掉以减少词条浪费`)
      if (nonMainWithLargeMin.length > 0)
        warn(`非主属性（${nonMainWithLargeMin.join('、')}）最小属攻超过 100，建议减少外系最小属攻`)

      const mainMinKey = elementMinKeyMap[mainElement]
      const mainMaxKey = elementMaxKeyMap[mainElement]
      if (mainMinKey && num(mainMinKey) > 300) warn(`${mainElement}最小属攻超过 330，建议减少本系最小属攻以优化词条分配`)
      if (mainMaxKey && num(mainMaxKey) > 650) warn(`${mainElement}最大属攻超过 800，建议减少本系最大属攻以优化词条分配`)
      if (num('martialBoostValue1') === 0) warn('武学增效数值为 0，建议提高武学增效以提升总体伤害')
      if (num('bossBonus') === 0) warn('首领增伤为 0，建议提高首领增伤')

      const schoolRules = {
        鸣金虹: () => {
          if (num('physicalMaxAttack') < 2800) warn('最大外功低于 2800，建议进一步提升最大外功')
          if (num('physicalMinAttack') > 950)  warn('最小外攻超过 950，建议减少最小外攻')
          if (num('perfectRate') < 35)         warn('会意率低于 35%，建议将会意率提升至 37% 以上')
          if (num('insightRate') < 38)         warn('会心率低于 38%，建议将会心率提升至 42% 以上')
          if (num('noteValue1') < 18)          info('剑蓄力增伤定音低于 18%，建议提高剑蓄力增伤定音')
        },
        鸣金影: () => {
          if (num('physicalMaxAttack') < 2850) warn('最大外功低于 2850，建议进一步提升最大外功')
          if (num('physicalMinAttack') > 950)  warn('最小外攻超过 950，建议减少最小外攻')
          if (num('perfectRate') < 35)         warn('会意率低于 35%，建议将会意率提升至 37% 以上')
          if (num('insightRate') < 38)         warn('会心率低于 38%，建议将会心率提升至 42% 以上')
          if (num('noteValue1') < 18)          info('流血增伤定音低于 18%，建议提高流血增伤定音')
        },
        牵丝玉: () => {
          if (num('physicalMaxAttack') < 2550) warn('最大外功低于 2550，建议进一步提升最大外功')
          if (num('physicalMinAttack') < 1100)  warn('最小外攻低于 1100，建议进一步提升最小外攻')
          if (num('insightRate') < 65)         warn('会心率低于 65%，建议将会心率提升至 70% 以上')
          if (num('noteValue1') < 18)          info('伞特殊增伤定音低于 18%，建议提高伞特殊增伤定音')
          if (num('perfectRate') > 21)         warn('会意率超过 21%，建议降低会意率以优化词条分配')
        },
        裂石威: () => {
          if (num('physicalMaxAttack') < 2550) warn('最大外功低于 2550，建议进一步提升最大外功')
          if (num('physicalMinAttack') < 1200)  warn('最小外攻低于 1200，建议进一步提升最小外攻')
          if (num('insightRate') < 54.5)       warn('会心率低于 54.5%，建议将会心率提升至 56%')
          if (num('insightRate') > 58)       warn('会心率高于 58%，建议将会心率降低至 56% 附近')
          if (num('noteValue1') < 18)          info('陌刀蓄力增伤定音低于 18%，建议提高陌刀蓄力增伤定音')
          if (num('perfectRate') > 14)         warn('会意率超过 14%，建议降低会意率以优化词条分配')
          if (selectedSet !== '时雨')           info('裂石威推荐使用时雨套装，建议检查套装选择')
        },
        裂石均: () => {
          if (num('physicalMaxAttack') < 2700) warn('大外低于 2700，建议进一步提升大外以提升总体伤害')
          if (num('insightRate') < 65)         warn('会心率低于 65%，建议将会心率提升至 70% 以上以提升总体伤害')
          if (num('noteValue2') < 18)          info('陌刀蓄力增伤定音低于 18%，建议提高陌刀蓄力增伤定音以提升总体伤害')
          if (isSetNotIn(['断岳', '时雨(无盾)'])) info('裂石均推荐携带断岳套装，建议检查套装选择')
          if (num('perfectRate') > 13)         warn('会意率高于 13%，建议优化会意率以提高总体伤害')
        },
        破竹风: () => {
          if (num('physicalMaxAttack') < 2650) warn('最大外功低于 2650，建议进一步提升最大外功')
          if (num('physicalMinAttack') < 950)  warn('最小外攻低于 950，建议进一步提升最小外攻')
          if (num('insightRate') < 60)         warn('会心率低于 60%，建议将会心率提升至 65% 以上')
          if (num('noteValue1') < 18)          info('鼠鼠增伤定音低于 18%，建议提高鼠鼠增伤定音')
          if (num('perfectRate') > 21)         warn('会意率超过 21%，建议降低会意率以优化词条分配')
        },
        破竹尘: () => {
          if (num('physicalMaxAttack') < 2550) warn('最大外功低于 2550，建议进一步提升最大外功')
          if (num('physicalMinAttack') < 1000)  warn('最小外攻低于 1000，建议进一步提升最小外攻')
          if (num('insightRate') < 65)         warn('会心率低于 65%，建议将会心率提升至 70% 以上')
          if (num('noteValue1') < 18)          info('伞武学增伤定音低于 18%，建议提高伞武学增伤定音')
          if (num('perfectRate') > 15 && selectedSet !== '飞隼')
            warn('会意率超过 15% 且套装非飞隼，建议降低会意率以优化词条分配')
        },
      }
      if (schoolRules[schoolName]) schoolRules[schoolName]()

      if (selectedSet === '飞隼' && num('perfectRate') < 17)
        info('当前选择了飞隼套装，建议将会意率提升至 17% 以上以充分发挥套装效果')
      if (selectedSet === '时雨' && schoolName !== '裂石威')
        warn('时雨套装需要护盾触发效果，当前流派可能无法稳定触发，建议选择时雨（无盾）版本或其他套装')
    }

    const buildSmallAttackAdvice = () => {
      if (num('precisionRate') < 99) warn('精准率低于 99%，建议将精准率提升至 100%')
      if (num('physicalPenetration') < 30) warn('外功穿透低于 30，建议进一步提升外功穿透')

      const nonMainWithMax     = nonMainElements.filter(e => num(elementMaxKeyMap[e]) > 0)
      const nonMainWithZeroMin = nonMainElements.filter(e => num(elementMinKeyMap[e]) === 0)

      if (nonMainWithMax.length > 0)
        info(`存在非主属性最大属攻（${nonMainWithMax.join('、')}），建议将外系最大属攻优化掉以减少词条浪费`)
      if (Math.max(num('martialBoostValue1'), num('martialBoostValue2')) < 5)
        warn('武学增效数值小于 5%，建议提高武学增效以提升总体伤害')
      if (num('allMartialBonus') < 5)
        warn('全武学增效数值小于 5%，建议提高全武学增效以提升总体伤害')
      if (num('bossBonus') < 5)
        warn('首领增伤数值小于 5%，建议提高首领增伤以提升总体伤害')

      const warnNonMainZeroMin = () => {
        if (nonMainWithZeroMin.length > 0)
          warn(`非主属性（${nonMainWithZeroMin.join('、')}）的最小属攻为 0，建议提高外系最小属攻以提升总体伤害`)
      }

      const schoolRules = {
        鸣金虹: () => warn('鸣金虹为会意流派，不推荐小外流'),
        鸣金影: () => warn('鸣金影为会意流派，不推荐小外流'),
        牵丝玉: () => {
          if (num('physicalMaxAttack') > 1600) warn('大外高于 1600，建议优化掉劲、势、大外词条以避免词条浪费')
          if (num('physicalMinAttack') < 1900) warn('小外低于 1900，建议将小外提升至 1900 以上以提升总体伤害')
          if (num('insightRate') < 68)         warn('会心率低于 68%，建议将会心率提升至 70% 以上以提升总体伤害')
          if (num('noteValue1') < 18)          info('伞特殊增伤定音低于 18%，建议提高伞特殊增伤定音以提升总体伤害')
          if (isSetNotIn(['时雨(无盾)']))       info('牵丝玉推荐携带时雨套装，建议检查套装选择')
          if (num('perfectRate') > 14)         warn('会意率高于 14%，建议优化会意率以提高总体伤害')
          warnNonMainZeroMin()
        },
        裂石威: () => {
          if (num('physicalMaxAttack') > 1580) warn('大外高于 1580，建议优化掉劲、势、大外词条以避免词条浪费')
          if (num('physicalMinAttack') < 1850) warn('小外低于 1850，建议将小外提升至 1850 以上以提升总体伤害')
          if (num('insightRate') < 54)         warn('会心率低于 54%，建议将会心率提升至 56% 以上以提升总体伤害')
          if (num('insightRate') > 58)         warn('会心率高于 58%，建议将会心率降低至 56% 左右以避免词条浪费')
          if (num('noteValue1') < 18)          info('陌刀蓄力增伤定音低于 18%，建议提高陌刀蓄力增伤定音以提升总体伤害')
          if (selectedSet !== '时雨')           info('裂石威推荐携带时雨套装，建议检查套装选择')
          if (num('perfectRate') > 13)         warn('会意率高于 13%，建议优化会意率以提高总体伤害')
        },
        破竹风: () => {
          if (num('physicalMaxAttack') > 1600) warn('大外高于 1600，建议优化掉劲、势、大外词条以避免词条浪费')
          if (num('physicalMinAttack') < 1900) warn('小外低于 1900，建议将小外提升至 1900 以上以提升总体伤害')
          if (num('insightRate') < 65)         warn('会心率低于 65%，建议将会心率提升至 65% 以上以提升总体伤害')
          if (num('insightRate') > 72)         warn('会心率高于 72%，建议将会心率降低至 70% 以提升总体伤害')
          if (num('noteValue1') < 18)          info('鼠鼠增伤定音低于 18%，建议提高鼠鼠增伤定音以提升总体伤害')
          if (selectedSet !== '燕归')           info('破竹风推荐携带燕归套装，建议检查套装选择')
          if (num('perfectRate') > 14)         warn('会意率高于 14%，建议优化会意率以提高总体伤害')
          warnNonMainZeroMin()
        },
        破竹尘: () => {
          if (num('physicalMaxAttack') > 1580) warn('大外高于 1580，建议优化掉劲、势、大外词条以避免词条浪费')
          if (num('physicalMinAttack') < 1980) warn('小外低于 1980，建议将小外提升至 1980 以上以提升总体伤害')
          if (num('insightRate') < 75)         warn('会心率低于 75%，建议将会心率提升至 75% 以上以提升总体伤害')
          if (num('noteValue1') < 18)          info('伞武学增伤定音低于 18%，建议提高伞武学增伤定音以提升总体伤害')
          if (selectedSet !== '连星')           info('破竹尘推荐携带连星套装，建议检查套装选择')
          if (num('perfectRate') > 14)         warn('会意率高于 14%，建议优化会意率以提高总体伤害')
          warnNonMainZeroMin()
        },
        裂石均: () => {
          if (num('physicalMaxAttack') > 1580) warn('大外高于 1580，建议优化掉劲、势、大外词条以避免词条浪费')
          if (num('physicalMinAttack') < 1980) warn('小外低于 1980，建议将小外提升至 1980 以上以提升总体伤害')
          if (num('insightRate') < 65)         warn('会心率低于 65%，建议将会心率提升至 75% 以上以提升总体伤害')
          if (num('noteValue2') < 18)          info('陌刀蓄力增伤定音低于 18%，建议提高陌刀蓄力增伤定音以提升总体伤害')
          if (isSetNotIn(['断岳', '时雨(无盾)'])) info('裂石均推荐携带断岳套装，建议检查套装选择')
          if (num('perfectRate') > 13)         warn('会意率高于 13%，建议优化会意率以提高总体伤害')
          warnNonMainZeroMin()
        },
      }
      if (schoolRules[schoolName]) schoolRules[schoolName]()
    }

    const physicalMinAttack = num('physicalMinAttack')
    const physicalMaxAttack = num('physicalMaxAttack')
    if (physicalMaxAttack > physicalMinAttack) {
      buildLargeAttackAdvice()
    } else if (physicalMinAttack > physicalMaxAttack) {
      buildSmallAttackAdvice()
    }

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
    return normalizeManualSavedConfigs(wx.getStorageSync(MANUAL_SAVE_KEY) || [])
  },

  setManualSavedConfigs(list) {
    const normalized = normalizeManualSavedConfigs(list)
    saveUserConfigPatch({ manualSavedConfigs: normalized })
    this.setData({ manualSavedConfigs: normalized })
  },

  setLastSavedConfig(config) {
    if (!config) return
    saveUserConfigPatch({ lastSavedConfig: config })
  },

  setManualSavedConfigsWithLast(list, config) {
    const normalized = normalizeManualSavedConfigs(list)
    saveUserConfigPatch({
      manualSavedConfigs: normalized,
      lastSavedConfig: config
    })
    this.setData({ manualSavedConfigs: normalized })
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
      this.setManualSavedConfigsWithLast(manualSavedConfigs, config)
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
            this.setManualSavedConfigsWithLast(latestList, config)
            wx.showToast({ title: `已替换栏位${replaceIndex + 1}`, icon: 'success' })
          }
        })
      }
    })
  },

  getSharePosterSummary() {
    const form = this.data.form || {}
    const school = this.data.currentSchool || {}
    const axis = this.data.currentAxis || {}
    const target = this.data.currentTarget || {}
    const axisResult = this.data.axisResult || {}
    const notes = school.notes || []
    const selectedMentalities = (this.data.selectedMentalities || [])
      .map(item => String(item || '').trim())
      .filter(Boolean)
    const fixedMentality = String(school.fixedMentality || school.fixedMentalityText || '').trim()
    const mentalities = [
      ...(fixedMentality && fixedMentality !== '无' ? [fixedMentality] : []),
      ...selectedMentalities
    ].join('/')
    const physicalMinAttack = Number(form.physicalMinAttack || 0)
    const physicalMaxAttack = Number(form.physicalMaxAttack || 0)
    const physicalAttack = physicalMinAttack > physicalMaxAttack
      ? `${form.physicalMinAttack || 0}（小外流固定外功）`
      : `${form.physicalMinAttack || 0} / ${form.physicalMaxAttack || 0}`
    const martialBoosts = [
      {
        name: school.martialBoost1Name || '武学增效1',
        value: form.martialBoostValue1 || '0'
      },
      {
        name: school.martialBoost2Name || '武学增效2',
        value: form.martialBoostValue2 || '0'
      }
    ].filter(item => item.name && item.value !== '0')

    return {
      title: '燕云国际服毕业度面板',
      schoolName: school.schoolName || '未选择',
      axisName: axis.axisName || axisResult.axisName || '无',
      targetName: target.targetName || '未选择',
      mentalities: mentalities || '无',
      physicalAttack,
      rates: [
        { label: '精准', value: Number(form.precisionRate || 0), max: 100 },
        { label: '会心', value: Number(form.insightRate || 0), max: 80 },
        { label: '会意', value: Number(form.perfectRate || 0), max: 40 },
      ],
      bossBonus: `${form.bossBonus || 0}%`,
      allMartialBonus: `${form.allMartialBonus || 0}%`,
      martialBoosts: martialBoosts.length
        ? martialBoosts.map(item => `${item.name} ${item.value}%`).join(' / ')
        : '无',
      notes: [
        notes[0] && notes[0] !== 'N/A' ? `${notes[0]} ${form.noteValue1 || 0}%` : '',
        notes[1] && notes[1] !== 'N/A' ? `${notes[1]} ${form.noteValue2 || 0}%` : '',
        notes[2] && notes[2] !== 'N/A' ? `${notes[2]} ${form.noteValue3 || 0}%` : '',
      ].filter(Boolean).join(' / ') || '无',
      graduateRate: axisResult.graduateRate || '—',
      dps: axisResult.dps || '—',
    }
  },

  drawPosterRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  },

  drawPosterText(ctx, text, x, y, options = {}) {
    ctx.setFillStyle(options.color || '#17201f')
    ctx.setFontSize(options.size || 28)
    ctx.setTextAlign(options.align || 'left')
    ctx.setTextBaseline('top')
    if (options.bold) {
      ctx.font = `normal bold ${options.size || 28}px sans-serif`
    }
    ctx.fillText(String(text || ''), x, y)
    if (options.bold) {
      ctx.font = `normal normal ${options.size || 28}px sans-serif`
    }
  },

  drawPosterWrappedText(ctx, text, x, y, maxChars, lineHeight, options = {}) {
    const value = String(text || '')
    const lines = []
    for (let start = 0; start < value.length; start += maxChars) {
      lines.push(value.slice(start, start + maxChars))
    }
    lines.forEach((line, index) => {
      this.drawPosterText(ctx, line, x, y + index * lineHeight, options)
    })
    return y + Math.max(lines.length, 1) * lineHeight
  },

  drawPosterMetric(ctx, label, value, x, y, width) {
    ctx.setFillStyle('#f6f1e7')
    this.drawPosterRoundRect(ctx, x, y, width, 104, 18)
    ctx.fill()
    this.drawPosterText(ctx, label, x + 24, y + 18, { color: '#66736f', size: 24 })
    this.drawPosterText(ctx, value, x + 24, y + 52, { color: '#0f766e', size: 34, bold: true })
  },

  drawPosterRow(ctx, label, value, y) {
    this.drawPosterText(ctx, label, 74, y, { color: '#66736f', size: 25 })
    return this.drawPosterWrappedText(ctx, value, 220, y, 19, 34, { color: '#17201f', size: 26 })
  },

  drawPosterProgressBar(ctx, x, y, width, height, percent) {
    const radius = height / 2
    const safePercent = Math.max(0, Math.min(1, percent || 0))
    ctx.setFillStyle('#e9e2d4')
    this.drawPosterRoundRect(ctx, x, y, width, height, radius)
    ctx.fill()
    if (safePercent <= 0) return
    ctx.setFillStyle('#0f766e')
    this.drawPosterRoundRect(ctx, x, y, Math.max(height, width * safePercent), height, radius)
    ctx.fill()
  },

  drawPosterRateRows(ctx, rates, y) {
    this.drawPosterText(ctx, '三率', 74, y, { color: '#66736f', size: 25 })
    let currentY = y
    ;(rates || []).forEach((item) => {
      const value = Number(item.value || 0)
      const max = Number(item.max || 100)
      this.drawPosterText(ctx, `${item.label} ${value}%`, 220, currentY, { color: '#17201f', size: 26 })
      this.drawPosterProgressBar(ctx, 220, currentY + 36, 390, 18, max > 0 ? value / max : 0)
      this.drawPosterText(ctx, `${Math.min(100, Math.round((max > 0 ? value / max : 0) * 100))}%`, 626, currentY + 29, { color: '#66736f', size: 20 })
      currentY += 70
    })
    return currentY
  },

  handleGenerateSharePoster() {
    if (!this.data.axisResult) {
      wx.showToast({ title: '请先完成一次计算', icon: 'none' })
      return
    }

    this.setData({ sharePosterGenerating: true })
    const summary = this.getSharePosterSummary()

    wx.getImageInfo({
      src: WXACODE_IMAGE_PATH,
      success: (imageInfo) => {
        const ctx = wx.createCanvasContext('sharePosterCanvas', this)
        const width = 750
        const height = 1420

        ctx.setFillStyle('#f3f1ea')
        ctx.fillRect(0, 0, width, height)

        ctx.setFillStyle('#103b36')
        this.drawPosterRoundRect(ctx, 34, 34, 682, 238, 28)
        ctx.fill()
        this.drawPosterText(ctx, summary.title, 72, 74, { color: '#fffdf8', size: 36, bold: true })
        this.drawPosterText(ctx, `${summary.schoolName} · ${summary.axisName}`, 72, 128, { color: '#f4b04e', size: 44, bold: true })
        this.drawPosterWrappedText(ctx, summary.targetName, 72, 194, 23, 32, { color: 'rgba(255,255,255,0.76)', size: 25 })

        ctx.setFillStyle('#fffdf8')
        this.drawPosterRoundRect(ctx, 34, 300, 682, 820, 24)
        ctx.fill()
        this.drawPosterMetric(ctx, '毕业度', summary.graduateRate, 74, 338, 282)
        this.drawPosterMetric(ctx, '秒伤', summary.dps, 394, 338, 282)

        let rowY = 486
        rowY = this.drawPosterRow(ctx, '心法', summary.mentalities, rowY) + 24
        rowY = this.drawPosterRow(ctx, '大小外', summary.physicalAttack, rowY) + 24
        rowY = this.drawPosterRateRows(ctx, summary.rates, rowY) + 24
        rowY = this.drawPosterRow(ctx, '首领增伤', summary.bossBonus, rowY) + 24
        rowY = this.drawPosterRow(ctx, '武学增效', summary.martialBoosts, rowY) + 24
        rowY = this.drawPosterRow(ctx, '全武学增效', summary.allMartialBonus, rowY) + 24
        this.drawPosterRow(ctx, '定音', summary.notes, rowY)

        ctx.setFillStyle('#fffdf8')
        this.drawPosterRoundRect(ctx, 34, 1152, 682, 206, 24)
        ctx.fill()
        ctx.drawImage(WXACODE_IMAGE_PATH, 72, 1200, 110, 110)
        this.drawPosterText(ctx, '燕云国际服全流派毕业度计算器', 214, 1192, { color: '#17201f', size: 30, bold: true })
        this.drawPosterWrappedText(ctx, '扫码查看小程序，计算面板毕业度与装备搭配。', 214, 1248, 18, 40, { color: '#66736f', size: 25 })

        ctx.draw(false, () => {
          wx.canvasToTempFilePath({
            canvasId: 'sharePosterCanvas',
            width,
            height,
            destWidth: width,
            destHeight: height,
            success: (res) => {
              this.setData({
                showSharePoster: true,
                sharePosterPath: res.tempFilePath,
                sharePosterGenerating: false
              })
            },
            fail: () => {
              this.setData({ sharePosterGenerating: false })
              wx.showToast({ title: '生成分享图失败', icon: 'none' })
            }
          }, this)
        })
      },
      fail: () => {
        this.setData({ sharePosterGenerating: false })
        wx.showToast({ title: '小程序码图片读取失败', icon: 'none' })
      }
    })
  },

  closeSharePoster() {
    this.setData({ showSharePoster: false })
  },

  previewSharePoster() {
    if (!this.data.sharePosterPath) return
    wx.previewImage({
      urls: [this.data.sharePosterPath],
      current: this.data.sharePosterPath
    })
  },

  saveSharePoster() {
    if (!this.data.sharePosterPath) return
    wx.saveImageToPhotosAlbum({
      filePath: this.data.sharePosterPath,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      },
      fail: (err) => {
        if (err && /auth|authorize/i.test(String(err.errMsg || ''))) {
          wx.showModal({
            title: '需要相册权限',
            content: '请允许保存图片到相册后重试',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting()
            }
          })
          return
        }
        wx.showToast({ title: '保存失败', icon: 'none' })
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
    const targetIndex = this.getDefaultTargetIndex()
    const defaultSchool = this.buildCurrentSchool(this.data.schools[defaultSchoolIndex])
    this.updateState('currentSchool', defaultSchool)
    this.updateState('currentTarget', this.data.targets[targetIndex] || {})
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
      targetIndex,
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
