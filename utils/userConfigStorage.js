const EQUIPMENT_KEY = 'equipmentData'
const MANUAL_SAVE_KEY = 'manualSavedConfigs'
const LAST_SAVED_KEY = 'lastSavedConfig'
const MANUAL_SLOT_COUNT = 3

function normalizeManualSavedConfigs(list) {
  const source = Array.isArray(list) ? list : []
  return Array.from({ length: MANUAL_SLOT_COUNT }, (_, index) => source[index] || null)
}

function getLocalUserConfig() {
  return {
    equipmentData: wx.getStorageSync(EQUIPMENT_KEY) || null,
    manualSavedConfigs: normalizeManualSavedConfigs(wx.getStorageSync(MANUAL_SAVE_KEY) || []),
    lastSavedConfig: wx.getStorageSync(LAST_SAVED_KEY) || null
  }
}

function hasSyncableLocalData(config) {
  return !!(
    config &&
    (
      config.equipmentData ||
      config.lastSavedConfig ||
      (config.manualSavedConfigs || []).some(Boolean)
    )
  )
}

function applyLocalPatch(patch) {
  if (!patch) return
  if (Object.prototype.hasOwnProperty.call(patch, 'equipmentData')) {
    wx.setStorageSync(EQUIPMENT_KEY, patch.equipmentData || null)
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'manualSavedConfigs')) {
    wx.setStorageSync(MANUAL_SAVE_KEY, normalizeManualSavedConfigs(patch.manualSavedConfigs))
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'lastSavedConfig')) {
    wx.setStorageSync(LAST_SAVED_KEY, patch.lastSavedConfig || null)
  }
}

function normalizeCloudConfig(data) {
  if (!data) return null
  const config = {
    updatedAt: data.updatedAt || null,
    schemaVersion: data.schemaVersion || 1
  }
  if (Object.prototype.hasOwnProperty.call(data, 'equipmentData')) {
    config.equipmentData = data.equipmentData || null
  }
  if (Object.prototype.hasOwnProperty.call(data, 'manualSavedConfigs')) {
    config.manualSavedConfigs = normalizeManualSavedConfigs(data.manualSavedConfigs || [])
  }
  if (Object.prototype.hasOwnProperty.call(data, 'lastSavedConfig')) {
    config.lastSavedConfig = data.lastSavedConfig || null
  }
  return config
}

async function callUserConfigFunction(payload) {
  const res = await wx.cloud.callFunction({
    name: 'userConfig',
    data: payload
  })
  return res.result || {}
}

async function saveUserConfigPatch(patch) {
  applyLocalPatch(patch)

  try {
    const result = await callUserConfigFunction({
      op: 'savePatch',
      patch
    })
    return result
  } catch (err) {
    return {
      code: -1,
      message: '云端保存失败，已保存在本地'
    }
  }
}

async function syncUserConfig() {
  const localConfig = getLocalUserConfig()

  try {
    const result = await callUserConfigFunction({ op: 'get' })
    if (result.code === 0 && result.exists) {
      const cloudConfig = normalizeCloudConfig(result.data)
      applyLocalPatch(cloudConfig)
      const mergedConfig = {
        ...localConfig,
        ...cloudConfig
      }
      return {
        source: 'cloud',
        data: mergedConfig
      }
    }

    if (result.code === 0 && hasSyncableLocalData(localConfig)) {
      await saveUserConfigPatch(localConfig)
    }

    return {
      source: 'local',
      data: localConfig
    }
  } catch (err) {
    return {
      source: 'local',
      data: localConfig
    }
  }
}

module.exports = {
  getLocalUserConfig,
  normalizeManualSavedConfigs,
  saveUserConfigPatch,
  syncUserConfig
}
