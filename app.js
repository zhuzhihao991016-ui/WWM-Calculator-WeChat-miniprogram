import { equipmentStore } from './store/equipmentStore'
import { calcStore } from './store/calcStore'
App({
  globalData: {
    updateLogVersion: '3.5.1',
    updateLogContent: [
      '对所有流派的毕业秒伤进行了校准',
      '修复了隐藏属攻对所有伤害生效的bug',
      '修复了双刀鼠鼠伤害结算异常的问题',
      '修复了无名携带千山法出现了伤害异常的问题',
      ''
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