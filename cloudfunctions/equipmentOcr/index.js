const cloud = require('wx-server-sdk')
const tencentcloud = require('tencentcloud-sdk-nodejs')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const OcrClient = tencentcloud.ocr.v20181119.Client

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

exports.main = async (event) => {
  const { fileID } = event

  if (!fileID) {
    return {
      code: -1,
      message: '缺少 fileID'
    }
  }

  try {
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

    const result = await client.GeneralFastOCR({
      ImageUrl: imageUrl
    })

    const detections = result.TextDetections || []

    const lines = detections
      .map(item => ({
        text: item.DetectedText,
        confidence: item.Confidence,
        polygon: item.Polygon
      }))
      .filter(item => item.text)

    return {
      code: 0,
      message: 'success',
      rawText: lines.map(item => item.text).join('\n'),
      lines
    }
  } catch (err) {
    return {
      code: -500,
      message: err.message || 'OCR 识别失败',
      errorCode: err.code || '',
      requestId: err.requestId || ''
    }
  }
}