import { equipmentStore } from './store/equipmentStore'
import { calcStore } from './store/calcStore'
App({
  globalData: {
    updateLogVersion: '3.3.0',
    updateLogContent: [
      '更新了UI',
      '优化了装备库入口逻辑',
      '更新了面板提升分析的建议清单'
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