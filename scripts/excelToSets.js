const xlsx = require('xlsx')
const path = require('path')
const fs = require('fs')

const workbookPath = path.join(__dirname, '../resources/data.xlsx')
const outputPath = path.join(__dirname, '../data/Sets.js')

const SHEET_NAME = '套装'

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

function parseSheet(sheet) {
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' })
  const setList = []
  const setMap = {}

  for (const row of rows) {
    const name = normalizeString(row['套装名'])
    if (!name) continue

    const setItem = {
      name,
      extraPhysicalBonus:        toNumber(row['额外外功加成']),
      extraInsightDamageBonus:   toNumber(row['额外会心伤害加成']),
      extraDirectInsightRate:    toNumber(row['额外直接会心率']),
      lowEnergyPozhuDamage:      toNumber(row['低真气破竹伤害']),
      commonDamageIncrease:      toNumber(row['通用增伤'])
    }

    setList.push(setItem)
    setMap[name] = setItem
  }

  return { setList, setMap }
}

function writeToFile(data) {
  const content = `const setList = ${JSON.stringify(data.setList, null, 2)}

const setMap = ${JSON.stringify(data.setMap, null, 2)}

module.exports = {
  setList,
  setMap
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

  console.log(`套装数据转换完成：${outputPath}`)
  console.log(`共生成 ${result.setList.length} 个套装`)
}

main()