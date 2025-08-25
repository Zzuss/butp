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

    // 默认 A4 尺寸 (points)，但可由前端通过 body.pageSize 覆盖
    const DEFAULT_A4_WIDTH = 595.28
    const DEFAULT_A4_HEIGHT = 841.89
    const pageSizeFromBody = body.pageSize || null
    const A4_WIDTH = pageSizeFromBody && pageSizeFromBody.width ? Number(pageSizeFromBody.width) : DEFAULT_A4_WIDTH
    const A4_HEIGHT = pageSizeFromBody && pageSizeFromBody.height ? Number(pageSizeFromBody.height) : DEFAULT_A4_HEIGHT

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
      console.log('[pdf-compose] embedded image dims (px):', imgDims)
      console.log('[pdf-compose] A4 pts:', { A4_WIDTH, A4_HEIGHT })

      // 将每个切片缩放并拉伸为正好填满A4（不保持原始纵横比）
      // 这样每个图片切片将完整占据一张A4页面
      const drawWidth = A4_WIDTH
      const drawHeight = A4_HEIGHT

      // 等比缩放到 A4 宽度（单位：points），然后按 A4 高度分页绘制，避免丢失内容
      const scale = A4_WIDTH / imgDims.width
      const scaledHeight = imgDims.height * scale
      const pagesNeeded = Math.max(1, Math.ceil(scaledHeight / A4_HEIGHT))
      console.log('[pdf-compose] scaledHeight (pts):', scaledHeight, 'pagesNeeded:', pagesNeeded)

      for (let p = 0; p < pagesNeeded; p++) {
        const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
        // 计算每页绘制时的 y 偏移，使得每页显示图片的不同垂直切片
        const yOffset = A4_HEIGHT - scaledHeight + p * A4_HEIGHT
        console.log('[pdf-compose] draw page', p, 'yOffset', yOffset)
        page.drawImage(embeddedImage, {
          x: 0,
          y: yOffset,
          width: A4_WIDTH,
          height: scaledHeight
        })
      }
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


