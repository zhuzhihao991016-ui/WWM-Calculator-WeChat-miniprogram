const targets = require('../data/targets.js')
const schools = require('../data/schools.js')
const skills = require('../data/skills.js')
const { grandPanelList, grandPanelMap } = require('../data/GrandPanel.js')
const { axesList, axesMap, axisNameMap } = require('../data/Axes.js')
const { setMap, setList } = require('../data/Sets.js')
const { bonusList, bonusMap } = require('../data/Bonuses.js')
const { affixList, affixMap } = require('../data/Affixs.js')
const { equipmentAffixList } = require('../data/EquipmentAffixs.js')

const COLLECTION_NAME = 'game_data'
const CURRENT_DOC_ID = 'current'
const CACHE_KEY = 'cloudGameDataCache'

let memoryCache = null
let lastDataSourceInfo = {
  source: 'local',
  envVersion: '',
  detail: null,
}

function getMiniProgramEnvVersion() {
  try {
    if (typeof wx !== 'undefined' && typeof wx.getAccountInfoSync === 'function') {
      const accountInfo = wx.getAccountInfoSync()
      const miniProgram = accountInfo && accountInfo.miniProgram
      return miniProgram && miniProgram.envVersion ? miniProgram.envVersion : ''
    }
  } catch (err) {}
  return ''
}

function shouldUseLocalGameDataOnly(options = {}) {
  if (options.localOnly) return true
  return getMiniProgramEnvVersion() === 'develop'
}

function setLastDataSourceInfo(source, detail) {
  lastDataSourceInfo = {
    source,
    envVersion: getMiniProgramEnvVersion(),
    detail: detail || null,
  }
}

function getGameDataSourceInfo() {
  const source = lastDataSourceInfo.source || 'local'
  const envVersion = lastDataSourceInfo.envVersion || getMiniProgramEnvVersion()
  const isLocalOnly = source === 'local-dev'
  const labelMap = {
    'local-dev': '本地数据模式',
    cloud: '云端数据',
    cache: '缓存数据',
    local: '本地兜底数据',
  }

  return {
    source,
    envVersion,
    isLocalOnly,
    label: labelMap[source] || '数据源未知',
    detail: lastDataSourceInfo.detail || null,
  }
}

function buildMap(list, key) {
  return (list || []).reduce((map, item) => {
    if (item && item[key]) map[item[key]] = item
    return map
  }, {})
}

function normalizeGameData(raw) {
  const source = raw || {}
  const normalized = {
    targets: source.targets || targets,
    schools: source.schools || schools,
    skills: source.skills || skills,
    grandPanelList: source.grandPanelList || grandPanelList,
    axesList: source.axesList || axesList,
    setList: source.setList || setList,
    bonusList: source.bonusList || bonusList,
    affixList: source.affixList || affixList,
    equipmentAffixList: source.equipmentAffixList || equipmentAffixList,
  }

  normalized.grandPanelMap = source.grandPanelMap || buildMap(normalized.grandPanelList, 'schoolName')
  normalized.axesMap = source.axesMap || buildAxesMap(normalized.axesList)
  normalized.axisNameMap = source.axisNameMap || buildMap(normalized.axesList, 'axisName')
  normalized.setMap = source.setMap || buildMap(normalized.setList, 'name')
  normalized.bonusMap = source.bonusMap || buildMap(normalized.bonusList, 'name')
  normalized.affixMap = source.affixMap || buildMap(normalized.affixList, 'name')

  return normalized
}

function buildAxesMap(list) {
  return (list || []).reduce((map, axis) => {
    const schoolName = axis && axis.schoolName
    if (!schoolName) return map
    if (!map[schoolName]) map[schoolName] = []
    map[schoolName].push(axis)
    return map
  }, {})
}

function getLocalGameData() {
  setLastDataSourceInfo('local', null)
  return normalizeGameData({
    targets,
    schools,
    skills,
    grandPanelList,
    grandPanelMap,
    axesList,
    axesMap,
    axisNameMap,
    setList,
    setMap,
    bonusList,
    bonusMap,
    affixList,
    affixMap,
    equipmentAffixList,
  })
}

function readCachedGameData() {
  if (typeof wx === 'undefined' || typeof wx.getStorageSync !== 'function') return null
  try {
    const cached = wx.getStorageSync(CACHE_KEY)
    if (cached && cached.data) return normalizeGameData(cached.data)
  } catch (err) {}
  return null
}

function writeCachedGameData(data, meta) {
  if (typeof wx === 'undefined' || typeof wx.setStorageSync !== 'function') return
  try {
    wx.setStorageSync(CACHE_KEY, {
      data,
      meta: meta || {},
      cachedAt: Date.now(),
    })
  } catch (err) {}
}

function fetchCloudGameData() {
  if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.database) {
    return Promise.reject(new Error('wx.cloud.database unavailable'))
  }

  const db = wx.cloud.database()
  return db.collection(COLLECTION_NAME).doc(CURRENT_DOC_ID).get().then(res => {
    const doc = res && res.data ? res.data : {}
    const data = doc.data || doc
    return {
      data: normalizeGameData(data),
      rawData: data,
      meta: {
        version: doc.version || '',
        updatedAt: doc.updatedAt || '',
      },
    }
  })
}

function getGameData(options = {}) {
  if (shouldUseLocalGameDataOnly(options)) {
    const local = getLocalGameData()
    memoryCache = local
    setLastDataSourceInfo('local-dev', { envVersion: getMiniProgramEnvVersion() || 'unknown' })
    return Promise.resolve(local)
  }

  if (memoryCache && !options.forceRefresh) {
    return Promise.resolve(memoryCache)
  }

  const cached = readCachedGameData()
  if (cached && !options.forceRefresh) {
    memoryCache = cached
  }

  return fetchCloudGameData()
    .then(({ data, rawData, meta }) => {
      memoryCache = data
      writeCachedGameData(rawData, meta)
      setLastDataSourceInfo('cloud', meta)
      return data
    })
    .catch(err => {
      const detail = err && (err.errMsg || err.message || err)
      if (memoryCache) {
        setLastDataSourceInfo('cache', detail)
        return memoryCache
      }
      const local = getLocalGameData()
      memoryCache = local
      setLastDataSourceInfo('local', detail)
      return local
    })
}

module.exports = {
  COLLECTION_NAME,
  CURRENT_DOC_ID,
  getGameData,
  getLocalGameData,
  getGameDataSourceInfo,
  getMiniProgramEnvVersion,
  shouldUseLocalGameDataOnly,
}
