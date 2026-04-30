const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const inputFilePath = path.resolve(__dirname, '../resources/data.xlsx')
const outputJsonPath = path.resolve(__dirname, '../data/targets.json')
const outputJsPath = path.resolve(__dirname, '../data/targets.js')
const sheetName = '目标属性'

function toNumber(value, defaultValue = 0) {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }
  const num = Number(value)
  return Number.isNaN(num) ? defaultValue : num
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function main() {
  if (!fs.existsSync(inputFilePath)) {
    console.error(`未找到 Excel 文件：${inputFilePath}`)
    process.exit(1)
  }

  const workbook = XLSX.readFile(inputFilePath)

  if (!workbook.SheetNames.includes(sheetName)) {
    console.error(`未找到工作表：${sheetName}`)
    console.error(`当前工作表有：${workbook.SheetNames.join(', ')}`)
    process.exit(1)
  }

  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

  const result = rows
    .filter(row => String(row['目标名称']).trim() !== '')
    .map((row, index) => {
      const targetName = String(row['目标名称']).trim()

      if (!targetName) {
        console.warn(`第 ${index + 2} 行目标名称为空，已跳过`)
        return null
      }

      return {
        targetName,
        physicalDefense: toNumber(row['外功防御']),
        commonDamageBonus: toNumber(row['通用增伤']),
        exhaustedDamageBonus: toNumber(row['气竭增伤'])
      }
    })
    .filter(Boolean)

  ensureDir(outputJsonPath)
  ensureDir(outputJsPath)

  fs.writeFileSync(outputJsonPath, JSON.stringify(result, null, 2), 'utf8')
  fs.writeFileSync(outputJsPath, `module.exports = ${JSON.stringify(result, null, 2)}\n`, 'utf8')

  console.log(`转换完成，共输出 ${result.length} 条数据`)
  console.log(`JSON 文件：${outputJsonPath}`)
  console.log(`JS 文件：${outputJsPath}`)
}

main()