const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

const inputArg = process.argv[2]
const excelPath = inputArg
  ? path.resolve(process.cwd(), inputArg)
  : path.join(__dirname, '../resources/data.xlsx')

const outputPath = path.join(__dirname, '../data/skills.js')
const sheetName = '武器奇术'

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
    throw new Error(`Excel 文件不存在，请检查路径：${excelPath}`)
  }

  const workbook = xlsx.readFile(excelPath)
  const sheet = workbook.Sheets[sheetName]

  if (!sheet) {
    throw new Error(`未找到工作表：${sheetName}`)
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' })

  const result = rows
    .filter(row => row['技能名'])
    .map(row => ({
      skillName: toText(row['技能名']),
      physicalRate: toNumber(row['倍率']),
      physicalFixed: toNumber(row['固伤']),
      elementRate: toNumber(row['属攻倍率']),
      elementFixed: toNumber(row['属攻固伤']),

      extraMinPhysicalBonus: toNumber(row['额外最小外功加成']),
      extraMinPhysicalAttack: toNumber(row['额外最小外功']),
      extraMaxPhysicalBonus: toNumber(row['额外最大外攻加成']),
      extraMaxPhysicalAttack: toNumber(row['额外最大外攻']),

      extraInsightRate: toNumber(row['额外会心率']),
      extraInsightDamage: toNumber(row['额外会心伤害']),
      extraPerfectRate: toNumber(row['额外会意率']),
      extraPerfectDamage: toNumber(row['额外会意伤害']),

      correction: toNumber(row['补正']),
      extraDamageIncrease: toNumber(row['额外增伤']),
      extraPhysicalPenetration: toNumber(row['额外外功穿透']),

      chargeSkill: toNumber(row['蓄力技能']),
      type1: toText(row['类型1']),
      type2: toText(row['类型2']),
      attribute: toText(row['属性']),
      special: toText(row['特殊']),
      note: toText(row['定音']),
      guaranteedInsight: toNumber(row['必定会心'])
    }))

  const content = `module.exports = ${JSON.stringify(result, null, 2)}\n`
  fs.writeFileSync(outputPath, content, 'utf8')

  console.log(`已生成：${outputPath}`)
}

main()