const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

const inputArg = process.argv[2]
const excelPath = inputArg
  ? path.resolve(process.cwd(), inputArg)
  : path.join(__dirname, '../resources/data.xlsx')

const outputPath = path.join(__dirname, '../data/schools.js')
const sheetName = '流派表'

function normalizeElement(value) {
  const text = String(value || '').trim()
  const valid = ['鸣金', '牵丝', '裂石', '破竹']
  if (!valid.includes(text)) {
    throw new Error(`主属性无效: ${text}，仅允许：${valid.join('、')}`)
  }
  return text
}

function toNumber(value) {
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

function toText(value) {
  return String(value || '').trim()
}

function main() {
  console.log('正在读取 Excel 文件：', excelPath)

  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel 文件不存在，请检查路径是否正确：${excelPath}`)
  }

  const workbook = xlsx.readFile(excelPath)
  const sheet = workbook.Sheets[sheetName]

  if (!sheet) {
    throw new Error(`未找到工作表：${sheetName}`)
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' })

  const result = rows
    .filter(row => row['流派名称'])
    .map(row => ({
      schoolName: toText(row['流派名称']),
      mainElement: normalizeElement(row['主属性']),
      hiddenMainElementAttack: toNumber(row['隐藏本系属性攻击']),

      notes: [
        toText(row['定音1']),
        toText(row['定音2']),
        toText(row['定音3'])
      ].filter(Boolean),

      fixedMentality: toText(row['固定心法']),
      optionalMentalities: [
        toText(row['可选心法1']),
        toText(row['可选心法2']),
        toText(row['可选心法3']),
        toText(row['可选心法4']),
        toText(row['可选心法5']),
        toText(row['可选心法6']),
        toText(row['可选心法7']),
        toText(row['可选心法8']),
        toText(row['可选心法9'])
      ].filter(Boolean),

      axes: [
        toText(row['轴1']),
        toText(row['轴2']),
        toText(row['轴3'])
      ].filter(Boolean),

      martialBoost1Name: toText(row['武学增效1']),
      martialBoost2Name: toText(row['武学增效2']),
      weapon1: toText(row['武器1']),
      weapon2: toText(row['武器2'])
    }))

  const content = `module.exports = ${JSON.stringify(result, null, 2)}\n`
  fs.writeFileSync(outputPath, content, 'utf8')

  console.log(`已生成：${outputPath}`)
}

main()