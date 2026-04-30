import { equipmentStore } from './store/equipmentStore'
import { calcStore } from './store/calcStore'
App({
  globalData: {
    updateLogVersion: '3.1.0',
    updateLogContent: [
      '更新至国际服95级倍率、天赋、蹊跷等',
      '更新了目标属性',
      '装备管理中新增了OCR（测试）识别功能，允许使用截图添加装备',
      '更新了部分流派的小外流毕业面板',
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