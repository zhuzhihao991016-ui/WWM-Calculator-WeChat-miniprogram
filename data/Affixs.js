const affixList = [
  {
    "name": "劲",
    "max": 40.4,
    "convert": 40.4
  },
  {
    "name": "敏",
    "max": 40.4,
    "convert": 40.4
  },
  {
    "name": "势",
    "max": 40.4,
    "convert": 40.4
  },
  {
    "name": "大外",
    "max": 63.8,
    "convert": 63.8
  },
  {
    "name": "小外",
    "max": 63.8,
    "convert": 63.8
  },
  {
    "name": "精准率",
    "max": 0.066,
    "convert": 0.058674
  },
  {
    "name": "会心率",
    "max": 0.074,
    "convert": 0.05106
  },
  {
    "name": "会意率",
    "max": 0.036,
    "convert": 0.02484
  },
  {
    "name": "全部武学增效",
    "max": 0.026,
    "convert": 0.026
  },
  {
    "name": "武学增效1",
    "max": 0.052,
    "convert": 0.052
  },
  {
    "name": "武学增效2",
    "max": 0.052,
    "convert": 0.052
  },
  {
    "name": "首领增伤",
    "max": 0.026,
    "convert": 0.026
  },
  {
    "name": "单体爆发",
    "max": 0.08,
    "convert": 0.08
  },
  {
    "name": "单体控制",
    "max": 0.08,
    "convert": 0.08
  },
  {
    "name": "群体异常",
    "max": 0.08,
    "convert": 0.08
  },
  {
    "name": "群体伤害",
    "max": 0.08,
    "convert": 0.08
  },
  {
    "name": "最小鸣金",
    "max": 36.2,
    "convert": 36.2
  },
  {
    "name": "最大鸣金",
    "max": 36.2,
    "convert": 36.2
  },
  {
    "name": "最小裂石",
    "max": 36.2,
    "convert": 36.2
  },
  {
    "name": "最大裂石",
    "max": 36.2,
    "convert": 36.2
  },
  {
    "name": "最小牵丝",
    "max": 36.2,
    "convert": 36.2
  },
  {
    "name": "最大牵丝",
    "max": 36.2,
    "convert": 36.2
  },
  {
    "name": "最小破竹",
    "max": 36.2,
    "convert": 36.2
  },
  {
    "name": "最大破竹",
    "max": 36.2,
    "convert": 36.2
  },
  {
    "name": "外功穿透",
    "max": 9,
    "convert": 9
  },
  {
    "name": "属攻穿透",
    "max": 10.8,
    "convert": 10.8
  }
]

const affixMap = {
  "劲": {
    "name": "劲",
    "max": 40.4,
    "convert": 40.4
  },
  "敏": {
    "name": "敏",
    "max": 40.4,
    "convert": 40.4
  },
  "势": {
    "name": "势",
    "max": 40.4,
    "convert": 40.4
  },
  "大外": {
    "name": "大外",
    "max": 63.8,
    "convert": 63.8
  },
  "小外": {
    "name": "小外",
    "max": 63.8,
    "convert": 63.8
  },
  "精准率": {
    "name": "精准率",
    "max": 0.066,
    "convert": 0.058674
  },
  "会心率": {
    "name": "会心率",
    "max": 0.074,
    "convert": 0.05106
  },
  "会意率": {
    "name": "会意率",
    "max": 0.036,
    "convert": 0.02484
  },
  "全部武学增效": {
    "name": "全部武学增效",
    "max": 0.026,
    "convert": 0.026
  },
  "武学增效1": {
    "name": "武学增效1",
    "max": 0.052,
    "convert": 0.052
  },
  "武学增效2": {
    "name": "武学增效2",
    "max": 0.052,
    "convert": 0.052
  },
  "首领增伤": {
    "name": "首领增伤",
    "max": 0.026,
    "convert": 0.026
  },
  "单体爆发": {
    "name": "单体爆发",
    "max": 0.08,
    "convert": 0.08
  },
  "单体控制": {
    "name": "单体控制",
    "max": 0.08,
    "convert": 0.08
  },
  "群体异常": {
    "name": "群体异常",
    "max": 0.08,
    "convert": 0.08
  },
  "群体伤害": {
    "name": "群体伤害",
    "max": 0.08,
    "convert": 0.08
  },
  "最小鸣金": {
    "name": "最小鸣金",
    "max": 36.2,
    "convert": 36.2
  },
  "最大鸣金": {
    "name": "最大鸣金",
    "max": 36.2,
    "convert": 36.2
  },
  "最小裂石": {
    "name": "最小裂石",
    "max": 36.2,
    "convert": 36.2
  },
  "最大裂石": {
    "name": "最大裂石",
    "max": 36.2,
    "convert": 36.2
  },
  "最小牵丝": {
    "name": "最小牵丝",
    "max": 36.2,
    "convert": 36.2
  },
  "最大牵丝": {
    "name": "最大牵丝",
    "max": 36.2,
    "convert": 36.2
  },
  "最小破竹": {
    "name": "最小破竹",
    "max": 36.2,
    "convert": 36.2
  },
  "最大破竹": {
    "name": "最大破竹",
    "max": 36.2,
    "convert": 36.2
  },
  "外功穿透": {
    "name": "外功穿透",
    "max": 9,
    "convert": 9
  },
  "属攻穿透": {
    "name": "属攻穿透",
    "max": 10.8,
    "convert": 10.8
  }
}

module.exports = {
  affixList,
  affixMap
}
