const fs = require('fs')
const path = require('path')

const targets = require('../data/targets.js')
const schools = require('../data/schools.js')
const skills = require('../data/skills.js')
const { grandPanelList } = require('../data/GrandPanel.js')
const { axesList } = require('../data/Axes.js')
const { setList } = require('../data/Sets.js')
const { bonusList } = require('../data/Bonuses.js')
const { affixList } = require('../data/Affixs.js')
const { equipmentAffixList } = require('../data/EquipmentAffixs.js')

const outputPath = path.resolve(__dirname, '../data/cloud-game-data.json')

const doc = {
  _id: 'current',
  version: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
  updatedAt: new Date().toISOString(),
  data: {
    targets,
    schools,
    skills,
    grandPanelList,
    axesList,
    setList,
    bonusList,
    affixList,
    equipmentAffixList,
  },
}

fs.writeFileSync(outputPath, JSON.stringify(doc, null, 2), 'utf8')

console.log(`Cloud data exported: ${outputPath}`)
console.log('Collection: game_data')
console.log('Document _id: current')
