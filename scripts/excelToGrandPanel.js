const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const INPUT_FILE = path.resolve(__dirname, '../resources/data.xlsx')
const SHEET_NAME = '毕业面板'
const OUTPUT_FILE = path.resolve(__dirname, '../data/GrandPanel.js')

const HEADERS = [
  '流派名称',
  '小外',
  '大外',
  '外功穿透',
  '小鸣金',
  '大鸣金',
  '鸣金穿透',
  '小裂石',
  '大裂石',
  '裂石穿透',
  '小牵丝',
  '大牵丝',
  '牵丝穿透',
  '小破竹',
  '大破竹',
  '破竹穿透',
  '精准率',
  '会心率',
  '会意率',
  '直接会心率',
  '直接会意率',
  '外功伤害加成',
  '会心伤害加成',
  '会意伤害加成',
  '属攻伤害加成',
  '全部武学增效',
  '首领增伤',
  '单体控制增伤',
  '单体爆发增伤',
  '群体伤害增伤',
  '群体异常增伤',
  '武器增效1',
  '武器增效2',
  '定音1',
  '定音2',
  '定音3'
]

function normalizeHeader(value) {
  return String(value || '').trim()
}

function normalizeCell(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.trim()
  return value
}

function parseSheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new Error(`未找到 sheet：${sheetName}`)
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: ''
  })

  if (!rows.length) {
    return []
  }

  const headerRow = rows[0].map(normalizeHeader)

  const missingHeaders = HEADERS.filter(item => !headerRow.includes(item))
  if (missingHeaders.length) {
    throw new Error(`毕业面板 sheet 缺少表头：${missingHeaders.join('、')}`)
  }

  const headerIndexMap = {}
  headerRow.forEach((name, index) => {
    headerIndexMap[name] = index
  })

  const result = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const schoolName = normalizeCell(row[headerIndexMap['流派名称']])

    if (!schoolName) {
      continue
    }

    const item = {}
    HEADERS.forEach(header => {
      item[header] = normalizeCell(row[headerIndexMap[header]])
    })

    result.push(item)
  }

  return result
}

function convertRowToPanelItem(row) {
  return {
    schoolName: row['流派名称'] || '',

    attackOuterMin: row['小外'],
    attackOuterMax: row['大外'],
    armorPenetration: row['外功穿透'],

    mingjinMin: row['小鸣金'],
    mingjinMax: row['大鸣金'],
    mingjinPenetration: row['鸣金穿透'],

    lieshiMin: row['小裂石'],
    lieshiMax: row['大裂石'],
    lieshiPenetration: row['裂石穿透'],

    qiansiMin: row['小牵丝'],
    qiansiMax: row['大牵丝'],
    qiansiPenetration: row['牵丝穿透'],

    pozhuMin: row['小破竹'],
    pozhuMax: row['大破竹'],
    pozhuPenetration: row['破竹穿透'],

    accuracyRate: row['精准率'],
    criticalRate: row['会心率'],
    criticalDamageRate: row['会意率'],
    directCriticalRate: row['直接会心率'],
    directCriticalDamageRate: row['直接会意率'],

    damageBonusOuter: row['外功伤害加成'],
    damageBonusElement: row['属攻伤害加成'],
    criticalBonus: row['会心伤害加成'],
    criticalDamageBonus: row['会意伤害加成'],

    allMartialBonus: row['全部武学增效'],
    bossBonus: row['首领增伤'],
    singleControlBonus: row['单体控制增伤'],
    singleBurstBonus: row['单体爆发增伤'],
    groupDamageBonus: row['群体伤害增伤'],
    groupAbnormalBonus: row['群体异常增伤'],

    weaponBoost1: row['武器增效1'],
    weaponBoost2: row['武器增效2'],

    noteValue1: row['定音1'],
    noteValue2: row['定音2'],
    noteValue3: row['定音3']
  }
}

function buildOutputContent(list) {
  const bySchoolName = {}

  list.forEach(item => {
    bySchoolName[item.schoolName] = item
  })

  return `const grandPanelList = ${JSON.stringify(list, null, 2)}

const grandPanelMap = ${JSON.stringify(bySchoolName, null, 2)}

module.exports = {
  grandPanelList,
  grandPanelMap
}
`
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`未找到 Excel 文件：${INPUT_FILE}`)
  }

  const workbook = XLSX.readFile(INPUT_FILE)
  const rows = parseSheetRows(workbook, SHEET_NAME)
  const panelList = rows.map(convertRowToPanelItem)
  const content = buildOutputContent(panelList)

  ensureDir(OUTPUT_FILE)
  fs.writeFileSync(OUTPUT_FILE, content, 'utf8')

  console.log(`毕业面板数据已生成：${OUTPUT_FILE}`)
  console.log(`共生成 ${panelList.length} 条流派数据`)
}

main()