import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join, basename } from 'path'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('file')
    const batchId = searchParams.get('batchId')

    if (!filename) {
      return NextResponse.json({ error: '请指定要下载的文件名' }, { status: 400 })
    }

    // 安全检查：只允许下载预测结果文件
    if (!filename.includes('Predictions') || !filename.endsWith('.xlsx')) {
      return NextResponse.json({ error: '无效的文件名' }, { status: 400 })
    }

    // 在temp_predictions目录中查找文件
    const tempBaseDir = join(process.cwd(), 'temp_predictions')
    let filePath: string | null = null

    if (batchId) {
      // 批量处理文件的查找逻辑
      console.log(`查找批量处理文件: ${filename} (batchId: ${batchId})`)
      
      try {
        const { readdir } = require('fs/promises')
        
        // 检查批量处理目录
        const batchDir = join(tempBaseDir, batchId)
        if (existsSync(batchDir)) {
          const batchSubDirs = await readdir(batchDir)
          
          // 在所有子目录中查找文件
          for (const subDir of batchSubDirs) {
            const candidatePath = join(batchDir, subDir, filename)
            if (existsSync(candidatePath)) {
              filePath = candidatePath
              console.log(`找到批量处理文件: ${filePath}`)
              break
            }
          }
        }
      } catch (error) {
        console.error('查找批量处理文件时出错:', error)
      }
    } else {
      // 单文件处理文件的查找逻辑（原有逻辑）
      try {
        const { readdir } = require('fs/promises')
        const tempDirs = await readdir(tempBaseDir)
        
        for (const dir of tempDirs) {
          if (dir.startsWith('prediction_')) {
            const candidatePath = join(tempBaseDir, dir, filename)
            if (existsSync(candidatePath)) {
              filePath = candidatePath
              break
            }
          }
        }
      } catch (error) {
        console.error('查找单文件处理文件时出错:', error)
      }
    }

    if (!filePath || !existsSync(filePath)) {
      console.error(`文件未找到: ${filename}, batchId: ${batchId}`)
      return NextResponse.json({ error: '文件不存在或已过期' }, { status: 404 })
    }

    // 读取文件
    const fileBuffer = await readFile(filePath)
    
    // 设置响应头
    const response = new NextResponse(fileBuffer)
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response.headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    response.headers.set('Cache-Control', 'no-cache')
    
    return response

  } catch (error) {
    console.error('下载文件错误:', error)
    return NextResponse.json({
      error: '下载失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
