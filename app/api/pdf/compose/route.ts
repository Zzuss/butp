import { NextResponse } from 'next/server'
import { PDFDocument, rgb } from 'pdf-lib'

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

      const imgPxWidth = embeddedImage.width
      const imgPxHeight = embeddedImage.height
      console.log('[pdf-compose] embedded image dims (px):', { width: imgPxWidth, height: imgPxHeight })
      console.log('[pdf-compose] A4 pts:', { A4_WIDTH, A4_HEIGHT })

      // 将每个切片等比缩放到 A4 宽度（单位：points），保持纵横比；然后按 A4 高度分页绘制，避免丢失内容
      const scalePts = A4_WIDTH / imgPxWidth
      const scaledHeightPts = imgPxHeight * scalePts
      const pagesNeeded = Math.max(1, Math.ceil(scaledHeightPts / A4_HEIGHT))
      console.log('[pdf-compose] scalePts:', scalePts, 'scaledHeightPts:', scaledHeightPts, 'pagesNeeded:', pagesNeeded)

      for (let p = 0; p < pagesNeeded; p++) {
        const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
        // 调试：在每页画一个边框以便确认页面边界和图片位置
        try {
          page.drawRectangle({ x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 })
        } catch (e) {}
        try {
          const size = page.getSize()
          console.log('[pdf-compose] page.getSize()', size.width, size.height)
        } catch (e) { console.warn('[pdf-compose] page.getSize() failed', String(e)) }
        // 对于每页，按等比缩放后的整张图片绘制，但通过 y 位置偏移控制可见的切片
        // 计算 y 偏移（pdf-lib origin 在左下）：把图片底部放在 y = A4_HEIGHT - scaledHeightPts，然后每页向上移动 A4_HEIGHT
        const yBase = A4_HEIGHT - scaledHeightPts
        const y = Math.round(yBase + p * A4_HEIGHT)
        console.log('[pdf-compose] draw page', p, 'y', y)
        // 把嵌入的图片按等比缩放到 A4 宽度（height = scaledHeightPts），
        // 然后通过设置不同的 y 值（可能为负）来让每页显示图片的不同垂直片段。
        try {
          page.drawImage(embeddedImage, {
            x: 0,
            y,
            width: A4_WIDTH,
            height: scaledHeightPts
          })
        } catch (e) {
          console.error('[pdf-compose] drawImage paged error', String(e))
        }
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


