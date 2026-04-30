const xlsx = require('xlsx')
const path = require('path')
const fs = require('fs')

const workbookPath = path.join(__dirname, '../resources/data.xlsx')
const outputPath = path.join(__dirname, '../data/Axes.js')
const schools = require('../data/schools.js')

const SHEET_NAME = '轴'
const AXIS_ROW_COUNT = 90

function toValue(v) {
  return v === undefined || v === null ? '' : v
}

function toNumber(v) {
  if (v === undefined || v === null || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalizeString(v) {
  return String(toValue(v)).trim()
}

function splitAxisNames(value) {
  const text = normalizeString(value)
  if (!text) return []
  return text
    .split(/[、,，\/\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function getSchoolAxisNames(school) {
  const result = new Set()

  ;[
    school.axis,
    school.axes,
    school.axisName,
    school.axisNames
  ].forEach(v => {
    splitAxisNames(v).forEach(name => result.add(name))
  })

  if (Array.isArray(school.axisList)) {
    school.axisList.forEach(name => {
      const text = normalizeString(name)
      if (text) result.add(text)
    })
  }

  return Array.from(result)
}

function matchSchoolNameByAxisName(axisName) {
  const target = normalizeString(axisName)
  if (!target) return ''

  for (const school of schools) {
    const axisNames = getSchoolAxisNames(school)
    if (axisNames.includes(target)) {
      return normalizeString(school.schoolName)
    }
  }

  return ''
}

function parseSheet(sheet) {
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' })
  const axesList = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const axisName = normalizeString(row['轴名称'])

    if (!axisName) continue

    const schoolName = matchSchoolNameByAxisName(axisName)

    const axisItem = {
      axisName,
      schoolName,
      duration: toNumber(row['时长']),
      graduateDps: toNumber(row['毕业秒伤']),
      steps: []
    }

    for (let j = 0; j < AXIS_ROW_COUNT && i + j < rows.length; j++) {
      const currentRow = rows[i + j]

      const step = {
        index: j + 1,
        skillName: normalizeString(currentRow['技能名']),
        count: toNumber(currentRow['次数']),
        exhausted: toNumber(currentRow['气竭']),
        yishuiStacks: toNumber(currentRow['易水层数']),
        bengjieStacks: toNumber(currentRow['崩解层数']),
        lowEnergy: toNumber(currentRow['低真气']),
        bonus1: normalizeString(currentRow['加成1']),
        bonus2: normalizeString(currentRow['加成2']),
        bonus3: normalizeString(currentRow['加成3']),
        bonus4: normalizeString(currentRow['加成4']),
        bonus5: normalizeString(currentRow['加成5']),
        bonus6: normalizeString(currentRow['加成6']),
        bonus7: normalizeString(currentRow['加成7'])
      }

      axisItem.steps.push(step)
    }

    axesList.push(axisItem)

    i += AXIS_ROW_COUNT - 1
  }

  const axesMap = {}
  const axisNameMap = {}

  axesList.forEach(axis => {
    axisNameMap[axis.axisName] = axis

    const schoolName = normalizeString(axis.schoolName)
    if (!schoolName) return

    if (!axesMap[schoolName]) {
      axesMap[schoolName] = []
    }

    axesMap[schoolName].push(axis)
  })

  return {
    axesList,
    axesMap,
    axisNameMap
  }
}

function writeToFile(data) {
  const content = `const axesList = ${JSON.stringify(data.axesList, null, 2)}

const axesMap = ${JSON.stringify(data.axesMap, null, 2)}

const axisNameMap = ${JSON.stringify(data.axisNameMap, null, 2)}

module.exports = {
  axesList,
  axesMap,
  axisNameMap
}
`

  fs.writeFileSync(outputPath, content, 'utf8')
}

function main() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`未找到 Excel 文件: ${workbookPath}`)
  }

  const workbook = xlsx.readFile(workbookPath)
  const sheet = workbook.Sheets[SHEET_NAME]

  if (!sheet) {
    throw new Error(`未找到工作表: ${SHEET_NAME}`)
  }

  const result = parseSheet(sheet)
  writeToFile(result)

  console.log(`轴数据转换完成：${outputPath}`)
  console.log(`共生成 ${result.axesList.length} 个轴`)
}

main()