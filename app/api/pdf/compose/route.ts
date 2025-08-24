import { NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'

// 接收前端上传的图片数组（dataURL 字符串），按 A4 分页合成 PDF
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const images: string[] = body.images || []
    const filename = body.filename || `export_${new Date().toISOString().slice(0,10)}.pdf`

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'no images' }, { status: 400 })
    }

    const pdfDoc = await PDFDocument.create()

    // A4 尺寸 (points)
    const A4_WIDTH = 595.28
    const A4_HEIGHT = 841.89

    for (const dataUrl of images) {
      // dataUrl 形如 data:image/png;base64,....
      const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/)
      if (!match) continue
      const mime = match[1]
      const base64 = match[3]
      const imgBytes = Buffer.from(base64, 'base64')

      let embeddedImage: any
      if (mime.includes('png')) {
        embeddedImage = await pdfDoc.embedPng(imgBytes)
      } else {
        embeddedImage = await pdfDoc.embedJpg(imgBytes)
      }

      const imgDims = { width: embeddedImage.width, height: embeddedImage.height }

      // 将图片缩放到 A4 宽度，按比例计算高度
      const scale = A4_WIDTH / imgDims.width
      const drawWidth = A4_WIDTH
      const drawHeight = imgDims.height * scale

      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])

      // 垂直居中（自顶向下绘制）
      const x = 0
      const y = A4_HEIGHT - drawHeight
      page.drawImage(embeddedImage, {
        x,
        y: y < 0 ? 0 : y,
        width: drawWidth,
        height: drawHeight > A4_HEIGHT ? A4_HEIGHT : drawHeight
      })
    }

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (err: any) {
    console.error('compose pdf error', err)
    return NextResponse.json({ error: String(err && err.message) }, { status: 500 })
  }
}


