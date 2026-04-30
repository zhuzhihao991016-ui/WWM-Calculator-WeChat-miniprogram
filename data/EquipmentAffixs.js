// 装备词条库，基于 Affixs.js 修改：
// 1. 移除外功穿透和属攻穿透（改为定音技）
// 2. 新增 N/A 空词条

const equipmentAffixList = [
  { name: 'N/A',        max: 0,     convert: 0,     isPercent: false },
  { name: '劲',         max: 34.8,  convert: 34.8,  isPercent: false },
  { name: '敏',         max: 34.8,  convert: 34.8,  isPercent: false },
  { name: '势',         max: 34.8,  convert: 34.8,  isPercent: false },
  { name: '大外',       max: 54.8,  convert: 54.8,  isPercent: false },
  { name: '小外',       max: 54.8,  convert: 54.8,  isPercent: false },
  { name: '精准率',     max: 5.6,   convert: 5.04,  isPercent: true  },
  { name: '会心率',     max: 6.4,   convert: 4.928, isPercent: true  },
  { name: '会意率',     max: 3.2,   convert: 2.464, isPercent: true  },
  { name: '全部武学增效', max: 2.2, convert: 2.2,   isPercent: true  },
  { name: '武学增效1',  max: 4.4,   convert: 4.4,   isPercent: true  },
  { name: '武学增效2',  max: 4.4,   convert: 4.4,   isPercent: true  },
  { name: '首领增伤',   max: 2.4,   convert: 2.4,   isPercent: true  },
  { name: '单体爆发',   max: 7.0,   convert: 7.0,   isPercent: true  },
  { name: '单体控制',   max: 7.0,   convert: 7.0,   isPercent: true  },
  { name: '群体异常',   max: 7.0,   convert: 7.0,   isPercent: true  },
  { name: '群体伤害',   max: 7.0,   convert: 7.0,   isPercent: true  },
  { name: '最小鸣金',   max: 31,    convert: 31,    isPercent: false },
  { name: '最大鸣金',   max: 31,    convert: 31,    isPercent: false },
  { name: '最小裂石',   max: 31,    convert: 31,    isPercent: false },
  { name: '最大裂石',   max: 31,    convert: 31,    isPercent: false },
  { name: '最小牵丝',   max: 31,    convert: 31,    isPercent: false },
  { name: '最大牵丝',   max: 31,    convert: 31,    isPercent: false },
  { name: '最小破竹',   max: 31,    convert: 31,    isPercent: false },
  { name: '最大破竹',   max: 31,    convert: 31,    isPercent: false },
];

module.exports = { equipmentAffixList };