const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const COLLECTION = 'user_configs'
const ALLOWED_KEYS = new Set([
  'equipmentData',
  'manualSavedConfigs',
  'lastSavedConfig'
])

function pickAllowedPatch(patch) {
  const clean = {}
  Object.keys(patch || {}).forEach(key => {
    if (ALLOWED_KEYS.has(key)) {
      clean[key] = patch[key]
    }
  })
  return clean
}

async function findUserDoc(openid) {
  try {
    const res = await db.collection(COLLECTION).doc(openid).get()
    return res.data || null
  } catch (err) {
    return null
  }
}

async function ensureCollection() {
  try {
    await db.createCollection(COLLECTION)
  } catch (err) {
    // The collection already existing is the normal path after first use.
  }
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return {
      code: -1,
      message: '无法识别用户'
    }
  }

  const op = event.op || 'get'

  try {
    if (op === 'get') {
      const doc = await findUserDoc(openid)
      return {
        code: 0,
        message: 'success',
        exists: !!doc,
        data: doc || null
      }
    }

    if (op === 'savePatch') {
      const patch = pickAllowedPatch(event.patch)
      if (!Object.keys(patch).length) {
        return {
          code: -2,
          message: '没有可保存的数据'
        }
      }

      const now = db.serverDate()
      await ensureCollection()
      const doc = await findUserDoc(openid)
      if (doc) {
        await db.collection(COLLECTION).doc(openid).update({
          data: {
            ...patch,
            updatedAt: now,
            schemaVersion: 1
          }
        })
      } else {
        try {
          await db.collection(COLLECTION).add({
            data: {
              _id: openid,
              _openid: openid,
              ...patch,
              createdAt: now,
              updatedAt: now,
              schemaVersion: 1
            }
          })
        } catch (err) {
          await db.collection(COLLECTION).doc(openid).update({
            data: {
              ...patch,
              updatedAt: now,
              schemaVersion: 1
            }
          })
        }
      }

      return {
        code: 0,
        message: 'success'
      }
    }

    return {
      code: -3,
      message: '不支持的操作'
    }
  } catch (err) {
    console.error('userConfig failed', err)
    return {
      code: -4,
      message: '用户配置云端读写失败'
    }
  }
}
