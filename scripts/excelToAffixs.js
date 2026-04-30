const xlsx = require('xlsx')
const path = require('path')
const fs = require('fs')

const workbookPath = path.join(__dirname, '../resources/data.xlsx')
const outputPath = path.join(__dirname, '../data/Affixs.js')

const SHEET_NAME = '满值词条'

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
  const affixList = []
  const affixMap = {}

  for (const row of rows) {
    const name = normalizeString(row['词条名称'])
    if (!name) continue

    const affix = {
      name,
      max:     toNumber(row['满值']),
      convert: toNumber(row['换算值'])
    }

    affixList.push(affix)
    affixMap[name] = affix
  }

  return { affixList, affixMap }
}

function writeToFile(data) {
  const content = `const affixList = ${JSON.stringify(data.affixList, null, 2)}

const affixMap = ${JSON.stringify(data.affixMap, null, 2)}

module.exports = {
  affixList,
  affixMap
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

  console.log(`词条数据转换完成：${outputPath}`)
  console.log(`共生成 ${result.affixList.length} 条词条`)
}

main()