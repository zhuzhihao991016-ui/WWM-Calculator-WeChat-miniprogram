const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const { createCalculator } = require('../utils/calculator')
const targets = require('../data/targets')
const schools = require('../data/schools')
const skills = require('../data/skills')
const { axisNameMap } = require('../data/Axes')
const { setMap } = require('../data/Sets')
const { bonusMap } = require('../data/Bonuses')
const { grandPanelMap } = require('../data/GrandPanel')

const repoRoot = path.resolve(__dirname, '..')
const defaultWorkbookPath = path.join(repoRoot, 'resources', 'v2.0国际服全流派毕业度计算器 .xlsx.xlsx')
const pluginScript = 'C:\\Users\\zhuzh\\plugins\\excel-recalculator\\scripts\\recalc-workbook.ps1'
const outputJsonPath = path.join(repoRoot, 'logs', 'excel-js-raw-excel.json')
const reportPath = path.join(repoRoot, 'logs', 'compare-excel-js-report.json')
const martialBoostCellMap = {
  '剑': 'D21',
  '枪': 'D22',
  '扇': 'D23',
  '伞': 'D24',
  '陌刀': 'D25',
  '双刀': 'D26',
  '绳镖': 'D27',
  '横刀': 'D28'
}
const martialBoostRowIndexMap = {
  '剑': 1,
  '枪': 2,
  '扇': 3,
  '伞': 4,
  '陌刀': 5,
  '双刀': 6,
  '绳镖': 7,
  '横刀': 8
}

function parseArgs(argv) {
  const options = {}
  const positional = []
  for (let i = 2; i < argv.length; i++) {
    const item = argv[i]
    if (!item.startsWith('--')) {
      positional.push(item)
      continue
    }
    const eqIndex = item.indexOf('=')
    if (eqIndex >= 0) {
      options[item.slice(2, eqIndex)] = item.slice(eqIndex + 1)
      continue
    }
    const key = item.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      options[key] = next
      i += 1
    } else {
      options[key] = true
    }
  }
  return { options, positional }
}

const cli = parseArgs(process.argv)
const scenario = {
  schoolName: cli.options.school || '鸣金虹',
  targetName: cli.options.target || '91幽牙蛇影',
  axisName: cli.options.axis || '气涌轴',
  preset: cli.options.preset || '',
  selectedFood: cli.options.food || '√',
  selectedTiangong: cli.options.tiangong || '火',
  selectedSet: cli.options.set || '玉斗',
  selectedMentalities: (cli.options.mentalities || '威猛歌,断石之构,易水歌')
    .split(/[,，/]/)
    .map(item => item.trim())
    .filter(Boolean),
  mentalityRanks: (cli.options.mentalityRanks || '六重,六重,六重,六重')
    .split(/[,，/]/)
    .map(item => item.trim())
}

const workbookPath = path.resolve(cli.positional[0] || defaultWorkbookPath)

function v(value) {
  return value === '' || value === undefined ? null : value
}

function pct(value) {
  return value === '' || value === undefined ? null : Number(value) / 100
}

function getPanelFromScenario(config) {
  if (config.preset === 'qiansiyu-calibrated') {
    return {
      schoolName: '牵丝玉',
      attackOuterMin: 1107,
      attackOuterMax: 2317,
      armorPenetration: 34,
      mingjinMin: 29,
      mingjinMax: '',
      mingjinPenetration: '',
      lieshiMin: '',
      lieshiMax: '',
      lieshiPenetration: '',
      qiansiMin: 274,
      qiansiMax: 683,
      qiansiPenetration: 18,
      pozhuMin: 97,
      pozhuMax: '',
      pozhuPenetration: '',
      accuracyRate: 100,
      criticalRate: 74,
      criticalDamageRate: 54.4,
      directCriticalRate: 8.7,
      directCriticalDamageRate: '',
      damageBonusOuter: '',
      damageBonusElement: 9,
      criticalBonus: 16.8,
      criticalDamageBonus: 35,
      allMartialBonus: '',
      bossBonus: 4.9,
      singleControlBonus: '',
      singleBurstBonus: 7.3,
      groupDamageBonus: '',
      groupAbnormalBonus: '',
      martialBoost1: 4.8,
      martialBoost2: '',
      noteValue1: 15.1,
      noteValue2: '',
      noteValue3: ''
    }
  }
  return grandPanelMap[config.schoolName]
}

function buildWritesFromGrandPanel(config) {
  const panel = getPanelFromScenario(config)
  if (!panel) throw new Error(`Project data missing grand panel: ${config.schoolName}`)
  const school = schools.find(item => item.schoolName === config.schoolName) || {}
  const mentalities = config.selectedMentalities || []
  const ranks = config.mentalityRanks || []
  const writes = [
    { sheet: '面板区', cell: 'C2', value: config.schoolName },
    { sheet: '面板区', cell: 'C4', value: config.targetName },
    { sheet: '面板区', cell: 'L2', value: config.axisName },
    { sheet: '面板区', cell: 'K15', value: config.selectedFood },
    { sheet: '面板区', cell: 'M15', value: config.selectedTiangong },
    { sheet: '面板区', cell: 'O15', value: config.selectedSet },
    { sheet: '面板区', cell: 'K8', value: mentalities[0] || null },
    { sheet: '面板区', cell: 'M8', value: mentalities[1] || null },
    { sheet: '面板区', cell: 'O8', value: mentalities[2] || null },
    { sheet: '面板区', cell: 'Q8', value: mentalities[3] || null },
    { sheet: '面板区', cell: 'K10', value: ranks[0] || '六重' },
    { sheet: '面板区', cell: 'M10', value: ranks[1] || '六重' },
    { sheet: '面板区', cell: 'O10', value: ranks[2] || '六重' },
    { sheet: '面板区', cell: 'Q10', value: ranks[3] || '六重' },
    { sheet: '面板区', cell: 'D8', value: v(panel.attackOuterMin) },
    { sheet: '面板区', cell: 'F8', value: v(panel.attackOuterMax) },
    { sheet: '面板区', cell: 'H8', value: v(panel.armorPenetration) },
    { sheet: '面板区', cell: 'D9', value: v(panel.mingjinMin) },
    { sheet: '面板区', cell: 'F9', value: v(panel.mingjinMax) },
    { sheet: '面板区', cell: 'H9', value: v(panel.mingjinPenetration) },
    { sheet: '面板区', cell: 'D10', value: v(panel.lieshiMin) },
    { sheet: '面板区', cell: 'F10', value: v(panel.lieshiMax) },
    { sheet: '面板区', cell: 'H10', value: v(panel.lieshiPenetration) },
    { sheet: '面板区', cell: 'D11', value: v(panel.qiansiMin) },
    { sheet: '面板区', cell: 'F11', value: v(panel.qiansiMax) },
    { sheet: '面板区', cell: 'H11', value: v(panel.qiansiPenetration) },
    { sheet: '面板区', cell: 'D12', value: v(panel.pozhuMin) },
    { sheet: '面板区', cell: 'F12', value: v(panel.pozhuMax) },
    { sheet: '面板区', cell: 'H12', value: v(panel.pozhuPenetration) },
    { sheet: '面板区', cell: 'D14', value: pct(panel.accuracyRate) },
    { sheet: '面板区', cell: 'D15', value: pct(panel.criticalRate) },
    { sheet: '面板区', cell: 'D16', value: pct(panel.criticalDamageRate) },
    { sheet: '面板区', cell: 'D17', value: pct(panel.directCriticalRate) },
    { sheet: '面板区', cell: 'D18', value: pct(panel.directCriticalDamageRate) },
    { sheet: '面板区', cell: 'F14', value: pct(panel.damageBonusOuter) },
    { sheet: '面板区', cell: 'F15', value: pct(panel.criticalBonus) },
    { sheet: '面板区', cell: 'F16', value: pct(panel.criticalDamageBonus) },
    { sheet: '面板区', cell: 'F17', value: pct(panel.damageBonusElement) },
    { sheet: '面板区', cell: 'D20', value: pct(panel.allMartialBonus) },
    { sheet: '面板区', cell: 'F20', value: pct(panel.bossBonus) },
    { sheet: '面板区', cell: 'D21', value: null },
    { sheet: '面板区', cell: 'D22', value: null },
    { sheet: '面板区', cell: 'D23', value: null },
    { sheet: '面板区', cell: 'D24', value: null },
    { sheet: '面板区', cell: 'F21', value: pct(panel.singleControlBonus) },
    { sheet: '面板区', cell: 'F22', value: pct(panel.singleBurstBonus) },
    { sheet: '面板区', cell: 'F23', value: pct(panel.groupAbnormalBonus) },
    { sheet: '面板区', cell: 'F24', value: pct(panel.groupDamageBonus) },
    { sheet: '面板区', cell: 'F25', value: pct(panel.noteValue1) },
    { sheet: '面板区', cell: 'F26', value: pct(panel.noteValue2) },
    { sheet: '面板区', cell: 'F27', value: pct(panel.noteValue3) }
  ]
  const weapon1Cell = martialBoostCellMap[String(school.weapon1 || '').trim()]
  const weapon2Cell = martialBoostCellMap[String(school.weapon2 || '').trim()]
  if (weapon1Cell) writes.push({ sheet: '面板区', cell: weapon1Cell, value: pct(panel.martialBoost1 ?? panel.weaponBoost1) })
  if (weapon2Cell) writes.push({ sheet: '面板区', cell: weapon2Cell, value: pct(panel.martialBoost2 ?? panel.weaponBoost2) })
  return writes
}

const defaultWrites = scenario.schoolName === '鸣金虹' &&
  scenario.targetName === '91幽牙蛇影' &&
  scenario.axisName === '气涌轴'
  ? [
  { sheet: '面板区', cell: 'C2', value: '鸣金虹' },
  { sheet: '面板区', cell: 'C4', value: '91幽牙蛇影' },
  { sheet: '面板区', cell: 'L2', value: '气涌轴' },
  { sheet: '面板区', cell: 'K15', value: '√' },
  { sheet: '面板区', cell: 'M15', value: '火' },
  { sheet: '面板区', cell: 'O15', value: '玉斗' },
  { sheet: '面板区', cell: 'M8', value: '威猛歌' },
  { sheet: '面板区', cell: 'O8', value: '断石之构' },
  { sheet: '面板区', cell: 'Q8', value: '易水歌' },
  { sheet: '面板区', cell: 'K10', value: '六重' },
  { sheet: '面板区', cell: 'M10', value: '六重' },
  { sheet: '面板区', cell: 'O10', value: '六重' },
  { sheet: '面板区', cell: 'Q10', value: '六重' },
  { sheet: '面板区', cell: 'D8', value: 896.9 },
  { sheet: '面板区', cell: 'F8', value: 2949.8 },
  { sheet: '面板区', cell: 'H8', value: 36 },
  { sheet: '面板区', cell: 'D9', value: 274 },
  { sheet: '面板区', cell: 'F9', value: 549 },
  { sheet: '面板区', cell: 'H9', value: 18 },
  { sheet: '面板区', cell: 'D10', value: null },
  { sheet: '面板区', cell: 'F10', value: null },
  { sheet: '面板区', cell: 'H10', value: null },
  { sheet: '面板区', cell: 'D11', value: null },
  { sheet: '面板区', cell: 'F11', value: null },
  { sheet: '面板区', cell: 'H11', value: null },
  { sheet: '面板区', cell: 'D12', value: null },
  { sheet: '面板区', cell: 'F12', value: null },
  { sheet: '面板区', cell: 'H12', value: null },
  { sheet: '面板区', cell: 'D14', value: 0.983 },
  { sheet: '面板区', cell: 'D15', value: 0.457 },
  { sheet: '面板区', cell: 'D16', value: 0.398 },
  { sheet: '面板区', cell: 'D17', value: 0.087 },
  { sheet: '面板区', cell: 'D18', value: 0.023 },
  { sheet: '面板区', cell: 'F14', value: null },
  { sheet: '面板区', cell: 'F15', value: 0.5 },
  { sheet: '面板区', cell: 'F16', value: 0.402 },
  { sheet: '面板区', cell: 'F17', value: 0.09 },
  { sheet: '面板区', cell: 'D20', value: null },
  { sheet: '面板区', cell: 'F20', value: 0.052 },
  { sheet: '面板区', cell: 'D21', value: 0.052 },
  { sheet: '面板区', cell: 'D22', value: null },
  { sheet: '面板区', cell: 'F21', value: null },
  { sheet: '面板区', cell: 'F22', value: null },
  { sheet: '面板区', cell: 'F23', value: null },
  { sheet: '面板区', cell: 'F24', value: null },
  { sheet: '面板区', cell: 'F25', value: 0.2 },
  { sheet: '面板区', cell: 'F26', value: null },
  { sheet: '面板区', cell: 'F27', value: null }
]
  : buildWritesFromGrandPanel(scenario)

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toPercentString(value) {
  const n = toNumber(value)
  return n === 0 ? '' : String(n * 100)
}

function toPlainString(value) {
  if (value === undefined || value === null || value === 0 || value === '') return ''
  return String(value)
}

function normalizeSkillName(name) {
  return String(name || '')
    .replace(/^90/, '95')
    .replace(/^86九枪/, '95九枪')
    .replace(/^87九枪/, '95九枪')
    .replace(/^5重/, '6重')
}

function findRead(excelPayload, reference) {
  const found = (excelPayload.reads || []).find(item => item.reference === reference)
  if (!found) throw new Error(`Excel output missing read reference: ${reference}`)
  return found.value
}

function cellValue(excelPayload, reference) {
  return findRead(excelPayload, reference)
}

function readExcelWorkbook() {
  const reads = [
    '面板区!C2',
    '面板区!C4',
    '面板区!L2',
    '面板区!K15',
    '面板区!M15',
    '面板区!O15',
    '面板区!J8:Q8',
    '面板区!D8:H18',
    '面板区!D20:F28',
    '计算区!B4',
    '计算区!B8',
    '计算区!C5:F94',
    '计算区!H5:EH94'
  ].join(',')

  const stdout = execFileSync('powershell', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', pluginScript,
    '-WorkbookPath', workbookPath,
    '-WritesJson', JSON.stringify(defaultWrites),
    '-Reads', reads,
    '-OutputJsonPath', outputJsonPath,
    '-CalculationTimeoutSeconds', '180'
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })

  const raw = fs.existsSync(outputJsonPath)
    ? fs.readFileSync(outputJsonPath, 'utf8')
    : stdout
  return JSON.parse(raw.replace(/^\uFEFF/, ''))
}

function buildFormFromExcel(excelPayload) {
  const panel = findRead(excelPayload, '面板区!D8:H18')
  const increases = findRead(excelPayload, '面板区!D20:F28')
  const schoolName = String(cellValue(excelPayload, '面板区!C2') || '').trim()
  const currentSchool = schools.find(item => item.schoolName === schoolName) || {}
  const getWeaponBoost = weaponName => {
    const rowIndex = martialBoostRowIndexMap[String(weaponName || '').trim()]
    return rowIndex == null ? '' : toPercentString(increases[rowIndex] && increases[rowIndex][0])
  }

  return {
    physicalMinAttack: toPlainString(panel[0][0]),
    physicalMaxAttack: toPlainString(panel[0][2]),
    physicalPenetration: toPlainString(panel[0][4]),
    physicalBonus: toPercentString(panel[6][2]),

    mingjinMin: toPlainString(panel[1][0]),
    mingjinMax: toPlainString(panel[1][2]),
    mingjinPen: toPlainString(panel[1][4]),
    lieshiMin: toPlainString(panel[2][0]),
    lieshiMax: toPlainString(panel[2][2]),
    lieshiPen: toPlainString(panel[2][4]),
    qiansiMin: toPlainString(panel[3][0]),
    qiansiMax: toPlainString(panel[3][2]),
    qiansiPen: toPlainString(panel[3][4]),
    pozhuMin: toPlainString(panel[4][0]),
    pozhuMax: toPlainString(panel[4][2]),
    pozhuPen: toPlainString(panel[4][4]),

    precisionRate: toPercentString(panel[6][0]),
    insightRate: toPercentString(panel[7][0]),
    insightDamageBonus: toPercentString(panel[7][2]),
    perfectRate: toPercentString(panel[8][0]),
    perfectDamageBonus: toPercentString(panel[8][2]),
    directInsightRate: toPercentString(panel[9][0]),
    elementBonus: toPercentString(panel[9][2]),
    directPerfectRate: toPercentString(panel[10][0]),

    damageIncrease: '',
    allMartialBonus: toPercentString(increases[0][0]),
    bossBonus: toPercentString(increases[0][2]),
    martialBoostValue1: getWeaponBoost(currentSchool.weapon1),
    martialBoostValue2: getWeaponBoost(currentSchool.weapon2),
    singleControlBonus: toPercentString(increases[1][2]),
    singleBurstBonus: toPercentString(increases[2][2]),
    groupAbnormalBonus: toPercentString(increases[3][2]),
    groupDamageBonus: toPercentString(increases[4][2]),
    noteValue1: toPercentString(increases[5][2]),
    noteValue2: toPercentString(increases[6][2]),
    noteValue3: toPercentString(increases[7][2])
  }
}

function getSelectedMentalities(excelPayload) {
  const raw = findRead(excelPayload, '面板区!J8:Q8')
  const row = Array.isArray(raw[0]) ? raw[0] : raw
  return [row[1], row[3], row[5], row[7]]
    .map(item => String(item || '').trim())
    .filter(item => item && item !== 'N/A' && item !== '无名心法')
}

function calculateJs(excelPayload) {
  const schoolName = String(cellValue(excelPayload, '面板区!C2') || '').trim()
  const targetName = String(cellValue(excelPayload, '面板区!C4') || '').trim()
  const axisName = String(cellValue(excelPayload, '面板区!L2') || '').trim()
  const selectedFood = String(cellValue(excelPayload, '面板区!K15') || '').trim()
  const selectedTiangong = String(cellValue(excelPayload, '面板区!M15') || '').trim()
  const selectedSetRaw = String(cellValue(excelPayload, '面板区!O15') || '').trim()
  const selectedSet = selectedSetRaw === '无' ? '' : selectedSetRaw

  const currentSchool = schools.find(item => item.schoolName === schoolName)
  const currentTarget = targets.find(item => item.targetName === targetName)
  const currentAxis = axisNameMap[axisName]
  if (!currentSchool) throw new Error(`Project data missing school: ${schoolName}`)
  if (!currentTarget) throw new Error(`Project data missing target: ${targetName}`)
  if (!currentAxis) throw new Error(`Project data missing axis: ${axisName}`)

  const form = buildFormFromExcel(excelPayload)
  const selectedMentalities = getSelectedMentalities(excelPayload)

  const calc = createCalculator({
    form,
    currentSchool,
    currentTarget,
    currentSkill: skills[0] || {},
    currentAxis,
    selectedSet,
    selectedMentalities,
    selectedTiangong: selectedTiangong === '无' ? '' : selectedTiangong,
    selectedFood,
    setMap,
    bonusMap,
    skills
  })

  return {
    context: {
      schoolName,
      targetName,
      axisName,
      selectedSet,
      selectedMentalities,
      selectedTiangong,
      selectedFood
    },
    form,
    axisResult: calc.calculateCurrentAxisResult()
  }
}

function buildExcelRows(excelPayload) {
  const rows = findRead(excelPayload, '计算区!C5:F94')
  const details = findRead(excelPayload, '计算区!H5:EH94')
  return rows
    .map((row, index) => ({
      pos: index + 1,
      excelRow: index + 5,
      skillName: row[0],
      normalizedSkillName: normalizeSkillName(row[0]),
      count: toNumber(row[1]),
      note: toNumber(row[2]),
      totalDamage: toNumber(row[3]),
      detail: details[index] || []
    }))
    .filter(row => row.skillName && row.skillName !== 'N/A' && Math.abs(row.count) > 1e-12 && Math.abs(row.totalDamage) > 1e-9)
}

function buildJsRows(jsResult) {
  return (jsResult.axisResult.details || [])
    .filter(row => row.skillName && !row.error && Math.abs(toNumber(row.count)) > 1e-12 && Math.abs(toNumber(row.totalDamage)) > 1e-9)
    .map((row, index) => ({
      pos: index + 1,
      index: row.index,
      skillName: row.skillName,
      normalizedSkillName: normalizeSkillName(row.skillName),
      count: toNumber(row.count),
      expectedDamage: toNumber(row.expectedDamage),
      totalDamage: toNumber(row.totalDamage),
      rawDetail: row
    }))
}

function inferSource(row) {
  if (!row.normalizedMatch) return 'axis-row-or-skill-name-mismatch'
  if (/骑龙回马/.test(row.excelSkill || row.jsSkill || '')) return 'formula-or-axis-bonus-difference: Qilong row still differs after hidden-element fix'
  if (/箫吟千浪/.test(row.excelSkill || row.jsSkill || '') && row.pos <= 27) return 'axis-data-difference: project early Xiaoyin rows use N/A/长风/远程笛, Excel uses 玉斗/N/A/远程笛'
  if (/箫吟千浪/.test(row.excelSkill || row.jsSkill || '')) return 'minor-formula-or-rounding-difference: Xiaoyin rows after hidden-element type1 fix'
  if (/无名枪/.test(row.excelSkill || row.jsSkill || '')) return 'minor-formula-or-rounding-difference: gun row; extraPerfectDamage is blank/0 in Excel skill data'
  if (/天工/.test(row.excelSkill || row.jsSkill || '')) return 'floating-point-noise: Tiangong row matches after precision is forced to 1'
  if (/无名剑蓄力/.test(row.excelSkill || row.jsSkill || '')) return 'minor-formula-or-bonus-difference: charged sword rows differ by small amounts'
  return 'formula-or-data-difference'
}

function normalizeBonusNameForCompare(name) {
  return String(name || '').trim().replace(/低耐力/g, '低耐')
}

function collectProjectBonusNames(currentAxis) {
  const names = new Set()
  ;(currentAxis.steps || []).forEach(step => {
    ;['bonus1', 'bonus2', 'bonus3', 'bonus4', 'bonus5', 'bonus6', 'bonus7'].forEach(key => {
      const name = String(step[key] || '').trim()
      if (name && name !== 'N/A') names.add(name)
    })
  })
  return Array.from(names)
}

function collectExcelBonusNames(excelRows) {
  const names = new Set()
  excelRows.forEach(row => {
    ;(row.detail || []).slice(18, 23).forEach(value => {
      const name = String(value || '').trim()
      if (name && name !== 'N/A') names.add(name)
    })
  })
  return Array.from(names)
}

function buildBonusNameChecks(currentAxis, excelRows) {
  const projectBonusNames = collectProjectBonusNames(currentAxis)
  const excelBonusNames = collectExcelBonusNames(excelRows)
  const projectLowEnergyNames = projectBonusNames.filter(name => /低耐|低真气/.test(name))
  const excelLowEnergyNames = excelBonusNames.filter(name => /低耐|低真气/.test(name))
  const unresolvedProjectBonusNames = projectBonusNames.filter(name => !bonusMap[name])
  const normalizedProjectNames = new Set(projectBonusNames.map(normalizeBonusNameForCompare))
  const normalizedExcelNames = new Set(excelBonusNames.map(normalizeBonusNameForCompare))

  return {
    projectLowEnergyNames,
    excelLowEnergyNames,
    unresolvedProjectBonusNames,
    lowEnergyNamesMatchAfterNormalize: excelLowEnergyNames.every(name => normalizedProjectNames.has(normalizeBonusNameForCompare(name))) &&
      projectLowEnergyNames.every(name => normalizedExcelNames.has(normalizeBonusNameForCompare(name))),
    note: 'Project uses 低耐力 names while Excel uses 低耐 names for two bonuses; generated Axes.js and Bonuses.js are internally consistent, so bonusMap resolves normally.'
  }
}

function compareRows(excelRows, jsRows) {
  const max = Math.max(excelRows.length, jsRows.length)
  const rows = []
  for (let i = 0; i < max; i++) {
    const excel = excelRows[i] || {}
    const js = jsRows[i] || {}
    const diff = toNumber(js.totalDamage) - toNumber(excel.totalDamage)
    const normalizedMatch = excel.normalizedSkillName === js.normalizedSkillName
    const row = {
      pos: i + 1,
      excelRow: excel.excelRow || null,
      projectAxisIndex: js.index || null,
      excelSkill: excel.skillName || '',
      jsSkill: js.skillName || '',
      excelCount: excel.count || 0,
      jsCount: js.count || 0,
      excelTotalDamage: excel.totalDamage || 0,
      jsTotalDamage: js.totalDamage || 0,
      excelDetail: excel.detail || [],
      jsDetail: js.rawDetail || null,
      diff,
      absDiff: Math.abs(diff),
      normalizedMatch
    }
    row.suspectedSource = inferSource(row)
    rows.push(row)
  }
  return rows
}

function summarizeSuspectedSources(rows) {
  const map = {}
  rows.forEach(row => {
    const key = row.suspectedSource
    if (!map[key]) map[key] = { source: key, rows: 0, netDiff: 0, absDiff: 0 }
    map[key].rows += 1
    map[key].netDiff += row.diff
    map[key].absDiff += row.absDiff
  })
  return Object.values(map).sort((a, b) => b.absDiff - a.absDiff)
}

function main() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`)
  }

  const excelPayload = readExcelWorkbook()
  const jsResult = calculateJs(excelPayload)

  const excelTotal = toNumber(cellValue(excelPayload, '计算区!B4'))
  const excelDps = toNumber(cellValue(excelPayload, '计算区!B8'))
  const jsTotal = toNumber(jsResult.axisResult.totalExpectedDamage)
  const jsDps = toNumber(jsResult.axisResult.dps)
  const excelRows = buildExcelRows(excelPayload)
  const jsRows = buildJsRows(jsResult)
  const rowComparisons = compareRows(excelRows, jsRows)
  const sortedDiffs = [...rowComparisons].sort((a, b) => b.absDiff - a.absDiff)

  const report = {
    workbookPath,
    generatedAt: new Date().toISOString(),
    context: jsResult.context,
    totals: {
      excelTotalDamage: excelTotal,
      jsTotalDamage: jsTotal,
      totalDamageDiff: jsTotal - excelTotal,
      excelDps,
      jsDps,
      dpsDiff: jsDps - excelDps,
      dpsPercentDiff: excelDps ? (jsDps - excelDps) / excelDps : null
    },
    rowCounts: {
      excelNonzeroRows: excelRows.length,
      jsNonzeroRows: jsRows.length
    },
    bonusNameChecks: buildBonusNameChecks(axisNameMap[jsResult.context.axisName], excelRows),
    suspectedSourceSummary: summarizeSuspectedSources(rowComparisons),
    topDiffs: sortedDiffs.slice(0, 20),
    rowComparisons
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify({
    reportPath,
    context: report.context,
    totals: report.totals,
    rowCounts: report.rowCounts,
    suspectedSourceSummary: report.suspectedSourceSummary.slice(0, 8),
    topDiffs: report.topDiffs.slice(0, 8)
  }, null, 2))
}

main()
