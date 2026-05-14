const cloud = require('wx-server-sdk')
const tencentcloud = require('tencentcloud-sdk-nodejs')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const OcrClient = tencentcloud.ocr.v20181119.Client

const OCR_API_CHAIN = [
  { key: 'fast', label: '高速版', method: 'GeneralFastOCR' },
  { key: 'basic', label: '普通版', method: 'GeneralBasicOCR' },
  { key: 'accurate', label: '高精度版', method: 'GeneralAccurateOCR' },
  { key: 'efficient', label: '精简版', method: 'GeneralEfficientOCR' }
]

const client = new OcrClient({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY
  },
  region: process.env.TENCENT_REGION || 'ap-guangzhou',
  profile: {
    httpProfile: {
      endpoint: 'ocr.tencentcloudapi.com'
    }
  }
})

function isValidCloudFileID(fileID) {
  return typeof fileID === 'string'
    && fileID.length > 0
    && fileID.length <= 512
    && fileID.startsWith('cloud://')
    && !/[\r\n]/.test(fileID)
}

function normalizeDetection(item, apiInfo) {
  const polygon = item.Polygon || item.ItemPolygon || null
  const text = typeof item.DetectedText === 'string'
    ? item.DetectedText.trim()
    : ''

  return {
    text,
    confidence: item.Confidence,
    polygon,
    source: apiInfo.key,
    sourceName: apiInfo.label
  }
}

async function callOcrApi(apiInfo, imageUrl) {
  if (typeof client[apiInfo.method] !== 'function') {
    const err = new Error(`${apiInfo.method} not supported by SDK`)
    err.code = 'SDK_METHOD_NOT_FOUND'
    throw err
  }

  const result = await client[apiInfo.method]({
    ImageUrl: imageUrl
  })

  const detections = result.TextDetections || []
  const lines = detections
    .map(item => normalizeDetection(item, apiInfo))
    .filter(item => item.text)

  return {
    api: apiInfo.key,
    apiName: apiInfo.label,
    requestId: result.RequestId || '',
    lines
  }
}

function shouldTryNextOcrApi(err) {
  const code = String(err && err.code || '').toLowerCase()
  const message = String(err && err.message || '').toLowerCase()
  const text = `${code} ${message}`

  return [
    'resourceunavailable',
    'resourcepackagerunout',
    'resourceinsufficient',
    'failedoperation.accountarrears',
    'limitexceeded',
    'requestlimitexceeded',
    'unsupportedoperation',
    'unauthorizedoperation',
    'sdk_method_not_found',
    'quota',
    '余额',
    '欠费',
    '额度',
    '次数',
    '限频',
    '限流',
    '未开通',
    '未授权'
  ].some(keyword => text.includes(keyword))
}

async function deleteOcrSourceFile(fileID) {
  try {
    await cloud.deleteFile({
      fileList: [fileID]
    })
    return { deleted: true }
  } catch (err) {
    console.error('OCR 临时图片删除失败', {
      errorCode: err.code || '',
      requestId: err.requestId || ''
    })
    return {
      deleted: false,
      errorCode: err.code || '',
      requestId: err.requestId || ''
    }
  }
}

exports.main = async (event) => {
  const { fileID } = event

  if (!isValidCloudFileID(fileID)) {
    return {
      code: -1,
      message: 'fileID 无效'
    }
  }

  let shouldDeleteSourceFile = true

  try {
    if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
      return {
        code: -3,
        message: 'OCR 服务未配置'
      }
    }

    const tempUrlRes = await cloud.getTempFileURL({
      fileList: [fileID]
    })

    const imageUrl = tempUrlRes.fileList?.[0]?.tempFileURL

    if (!imageUrl) {
      return {
        code: -2,
        message: '获取图片临时链接失败'
      }
    }

    const apiAttempts = []
    let lastErr = null

    for (const apiInfo of OCR_API_CHAIN) {
      try {
        const result = await callOcrApi(apiInfo, imageUrl)

        if (!result.lines.length) {
          const emptyErr = new Error(`${apiInfo.method} returned no text`)
          emptyErr.code = 'OCR_EMPTY_RESULT'
          emptyErr.requestId = result.requestId
          lastErr = emptyErr
          apiAttempts.push({
            api: apiInfo.key,
            apiName: apiInfo.label,
            status: 'empty',
            lineCount: 0,
            requestId: result.requestId
          })
          continue
        }

        apiAttempts.push({
          api: apiInfo.key,
          apiName: apiInfo.label,
          status: 'success',
          lineCount: result.lines.length,
          requestId: result.requestId
        })

        return {
          code: 0,
          message: 'success',
          rawText: result.lines.map(item => item.text).join('\n'),
          lines: result.lines,
          apiUsed: result.api,
          apiUsedName: result.apiName,
          apiAttempts
        }
      } catch (err) {
        lastErr = err
        apiAttempts.push({
          api: apiInfo.key,
          apiName: apiInfo.label,
          status: 'failed',
          errorCode: err.code || '',
          requestId: err.requestId || ''
        })

        if (!shouldTryNextOcrApi(err)) {
          break
        }
      }
    }

    return {
      code: -500,
      message: 'OCR 识别失败',
      errorCode: lastErr && lastErr.code || '',
      requestId: lastErr && lastErr.requestId || '',
      apiAttempts
    }
  } catch (err) {
    return {
      code: -500,
      message: 'OCR 识别失败',
      errorCode: err.code || '',
      requestId: err.requestId || ''
    }
  } finally {
    if (shouldDeleteSourceFile) {
      await deleteOcrSourceFile(fileID)
    }
  }
}
