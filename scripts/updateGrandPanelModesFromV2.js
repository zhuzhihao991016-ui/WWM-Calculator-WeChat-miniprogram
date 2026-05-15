const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const TARGET_FILE = path.resolve(__dirname, '../resources/data.xlsx')
const V2_FILE = path.resolve(__dirname, '../resources/v2.0国际服全流派毕业度计算器 .xlsx.xlsx')
const SHEET_NAME = '毕业面板'

const HEADERS = [
  '流派名称',
  '面板类型',
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
  '武学增效1',
  '武学增效2',
  '定音1',
  '定音2',
  '定音3',
  '套装'
]

const SCHOOL_NAME_MAP = {
  '裂石均双切': '裂石均'
}

function cell(rows, row, col) {
  return rows[row] && rows[row][col] !== undefined && rows[row][col] !== null ? rows[row][col] : ''
}

function clean(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.trim()
  return value
}

function percent(value) {
  const cleaned = clean(value)
  if (cleaned === '') return ''
  if (typeof cleaned === 'number') return Number((cleaned * 100).toFixed(10))
  const num = Number(cleaned)
  if (!Number.isFinite(num)) return cleaned
  return Number((num * 100).toFixed(10))
}

function parseTitle(value) {
  const match = String(value || '').trim().match(/^(.+?)（(小外流|大外流)）$/)
  if (!match) return null
  return {
    schoolName: SCHOOL_NAME_MAP[match[1]] || match[1],
    panelType: match[2]
  }
}

function parseBlock(rows, titleRow, startCol) {
  const title = parseTitle(cell(rows, titleRow, startCol))
  if (!title) return null

  return {
    '流派名称': title.schoolName,
    '面板类型': title.panelType,
    '小外': clean(cell(rows, titleRow + 1, startCol + 2)),
    '大外': clean(cell(rows, titleRow + 1, startCol + 4)),
    '外功穿透': clean(cell(rows, titleRow + 1, startCol + 6)),
    '小鸣金': clean(cell(rows, titleRow + 2, startCol + 2)),
    '大鸣金': clean(cell(rows, titleRow + 2, startCol + 4)),
    '鸣金穿透': clean(cell(rows, titleRow + 2, startCol + 6)),
    '小裂石': clean(cell(rows, titleRow + 3, startCol + 2)),
    '大裂石': clean(cell(rows, titleRow + 3, startCol + 4)),
    '裂石穿透': clean(cell(rows, titleRow + 3, startCol + 6)),
    '小牵丝': clean(cell(rows, titleRow + 4, startCol + 2)),
    '大牵丝': clean(cell(rows, titleRow + 4, startCol + 4)),
    '牵丝穿透': clean(cell(rows, titleRow + 4, startCol + 6)),
    '小破竹': clean(cell(rows, titleRow + 5, startCol + 2)),
    '大破竹': clean(cell(rows, titleRow + 5, startCol + 4)),
    '破竹穿透': clean(cell(rows, titleRow + 5, startCol + 6)),
    '精准率': percent(cell(rows, titleRow + 7, startCol + 2)),
    '会心率': percent(cell(rows, titleRow + 8, startCol + 2)),
    '会意率': percent(cell(rows, titleRow + 9, startCol + 2)),
    '直接会心率': percent(cell(rows, titleRow + 10, startCol + 2)),
    '直接会意率': percent(cell(rows, titleRow + 11, startCol + 2)),
    '外功伤害加成': percent(cell(rows, titleRow + 7, startCol + 4)),
    '会心伤害加成': percent(cell(rows, titleRow + 8, startCol + 4)),
    '会意伤害加成': percent(cell(rows, titleRow + 9, startCol + 4)),
    '属攻伤害加成': percent(cell(rows, titleRow + 10, startCol + 4)),
    '全部武学增效': percent(cell(rows, titleRow + 13, startCol + 2)),
    '首领增伤': percent(cell(rows, titleRow + 13, startCol + 4)),
    '单体控制增伤': percent(cell(rows, titleRow + 14, startCol + 4)),
    '单体爆发增伤': percent(cell(rows, titleRow + 15, startCol + 4)),
    '群体异常增伤': percent(cell(rows, titleRow + 16, startCol + 4)),
    '群体伤害增伤': percent(cell(rows, titleRow + 17, startCol + 4)),
    '武学增效1': percent(cell(rows, titleRow + 18, startCol + 2)),
    '武学增效2': percent(cell(rows, titleRow + 19, startCol + 2)),
    '定音1': percent(cell(rows, titleRow + 18, startCol + 4)),
    '定音2': percent(cell(rows, titleRow + 19, startCol + 4)),
    '定音3': percent(cell(rows, titleRow + 20, startCol + 4)),
    '套装': clean(cell(rows, titleRow + 1, startCol + 7))
  }
}

function readV2Panels() {
  if (!fs.existsSync(V2_FILE)) {
    throw new Error(`未找到 v2.0 工作簿：${V2_FILE}`)
  }

  const workbook = XLSX.readFile(V2_FILE)
  const sheet = workbook.Sheets[SHEET_NAME]
  if (!sheet) throw new Error(`v2.0 工作簿缺少 sheet：${SHEET_NAME}`)

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const panels = []

  rows.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (!parseTitle(value)) return
      const panel = parseBlock(rows, rowIndex, colIndex)
      if (panel) panels.push(panel)
    })
  })

  return panels
}

function writeTargetWorkbook(panels) {
  const workbook = XLSX.readFile(TARGET_FILE)
  const oldSheet = workbook.Sheets[SHEET_NAME]
  if (!oldSheet) throw new Error(`目标工作簿缺少 sheet：${SHEET_NAME}`)

  const oldRows = XLSX.utils.sheet_to_json(oldSheet, { header: 1, defval: '' })
  const oldHeaders = (oldRows[0] || []).map(header => String(header || '').trim())
  const existingSchoolNames = new Set(
    oldRows.slice(1).map(row => String(row[oldHeaders.indexOf('流派名称')] || '').trim()).filter(Boolean)
  )

  const bySchoolAndType = {}
  panels.forEach(panel => {
    if (!existingSchoolNames.has(panel['流派名称'])) return
    bySchoolAndType[`${panel['流派名称']}|${panel['面板类型']}`] = panel
  })

  const outputRows = [HEADERS]
  const seen = new Set()

  oldRows.slice(1).forEach(row => {
    const schoolName = String(row[oldHeaders.indexOf('流派名称')] || '').trim()
    if (!schoolName || seen.has(schoolName)) return
    seen.add(schoolName)

    const outerMax = bySchoolAndType[`${schoolName}|大外流`]
    const outerMin = bySchoolAndType[`${schoolName}|小外流`]
    const fallback = {}
    oldHeaders.forEach((header, index) => {
      fallback[header] = clean(row[index])
    })

    ;[outerMax || { ...fallback, '面板类型': '大外流' }, outerMin].filter(Boolean).forEach(panel => {
      outputRows.push(HEADERS.map(header => clean(panel[header])))
    })
  })

  workbook.Sheets[SHEET_NAME] = XLSX.utils.aoa_to_sheet(outputRows)
  XLSX.writeFile(workbook, TARGET_FILE)

  return {
    writtenRows: outputRows.length - 1,
    importedRows: panels.length,
    matchedRows: outputRows.length - 1
  }
}

function main() {
  const panels = readV2Panels()
  const result = writeTargetWorkbook(panels)
  console.log(`已从 v2.0 毕业面板读取 ${result.importedRows} 条模式数据`)
  console.log(`已更新 ${TARGET_FILE}`)
  console.log(`毕业面板 sheet 当前 ${result.writtenRows} 行数据`)
}

main()
