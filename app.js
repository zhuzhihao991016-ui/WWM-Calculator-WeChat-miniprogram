import { equipmentStore } from './store/equipmentStore'
import { calcStore } from './store/calcStore'
App({
  globalData: {
    updateLogVersion: '3.5.1',
    updateLogContent: [
      '开发者的话：非常感谢大家使用本小程序。目前小程序已接入OCR功能，用户的热情远超我的预料，在6天的时间内，用掉了月全部额度的86%。而由于OCR服务以及云环境存在运营成本，且开发者目前没有固定收入，所以非常抱歉，我会开通广告功能以维持小程序的持续运营。再次感谢大家的支持，我在此承诺广告不会影响正常功能的使用，仅会对OCR做出一些限制，感谢大家！',
      '修复了添加装备面板中不显示OCR返回具体数值的问题',
    ]
  },
  onLaunch() {
    this.equipmentStore = equipmentStore
    this.calcStore = calcStore
    wx.cloud.init({
      env: 'cloudbase-8gskecdl51a2b5c9',
      traceUser: true
    })
  }
})