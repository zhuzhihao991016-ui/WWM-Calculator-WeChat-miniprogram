import { equipmentStore } from './store/equipmentStore'
import { calcStore } from './store/calcStore'
App({
  globalData: {
    updateLogVersion: '3.2.0',
    updateLogContent: [
      '新增了装备评分系统',
      '评分越高表示词条/装备对输出贡献越多',
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