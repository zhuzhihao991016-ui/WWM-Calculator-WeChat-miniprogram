// 装备词条库，基于 Affixs.js 修改：
// 1. 移除外功穿透和属攻穿透（改为定音技）
// 2. 新增 N/A 空词条

const equipmentAffixList = [
  { name: 'N/A',        max: 0,     convert: 0,     isPercent: false },
  { name: '劲',         max: 40.4,  convert: 40.4,   isPercent: false },
  { name: '敏',         max: 40.4,  convert: 40.4,   isPercent: false },
  { name: '势',         max: 40.4,  convert: 40.4,   isPercent: false },
  { name: '大外',       max: 63.8,  convert: 63.8,   isPercent: false },
  { name: '小外',       max: 63.8,  convert: 63.8,   isPercent: false },
  { name: '精准率',     max: 6.6,   convert: 5.8674, isPercent: true  },
  { name: '会心率',     max: 7.4,   convert: 5.106,  isPercent: true  },
  { name: '会意率',     max: 3.6,   convert: 2.484,  isPercent: true  },
  { name: '全部武学增效', max: 2.6, convert: 2.6,    isPercent: true  },
  { name: '武学增效1',  max: 5.2,   convert: 5.2,    isPercent: true  },
  { name: '武学增效2',  max: 5.2,   convert: 5.2,    isPercent: true  },
  { name: '首领增伤',   max: 2.6,   convert: 2.6,    isPercent: true  },
  { name: '单体爆发',   max: 8.0,   convert: 8.0,    isPercent: true  },
  { name: '单体控制',   max: 8.0,   convert: 8.0,    isPercent: true  },
  { name: '群体异常',   max: 8.0,   convert: 8.0,    isPercent: true  },
  { name: '群体伤害',   max: 8.0,   convert: 8.0,    isPercent: true  },
  { name: '最小鸣金',   max: 36.2,  convert: 36.2,   isPercent: false },
  { name: '最大鸣金',   max: 36.2,  convert: 36.2,   isPercent: false },
  { name: '最小裂石',   max: 36.2,  convert: 36.2,   isPercent: false },
  { name: '最大裂石',   max: 36.2,  convert: 36.2,   isPercent: false },
  { name: '最小牵丝',   max: 36.2,  convert: 36.2,   isPercent: false },
  { name: '最大牵丝',   max: 36.2,  convert: 36.2,   isPercent: false },
  { name: '最小破竹',   max: 36.2,  convert: 36.2,   isPercent: false },
  { name: '最大破竹',   max: 36.2,  convert: 36.2,   isPercent: false },
];

module.exports = { equipmentAffixList };
