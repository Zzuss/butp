import { NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { getAllFilesMetadata, filesMetadata } from '../upload/route'

// 文件存储目录
const UPLOAD_DIR = join(process.cwd(), 'temp_imports', 'grades')

export async function GET() {
  try {
    // 从内存中获取文件元数据
    let files = getAllFilesMetadata()
    console.log(`获取文件列表: 元数据中有 ${files.length} 个文件`)

    // 如果元数据为空，尝试从文件系统重建（serverless环境可能丢失内存）
    if (files.length === 0) {
      console.log('元数据为空，尝试从文件系统扫描文件...')
      try {
        const dirFiles = await readdir(UPLOAD_DIR)
        const excelFiles = dirFiles.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
        console.log(`文件系统中找到 ${excelFiles.length} 个Excel文件`)
        
        // 从文件名提取UUID（文件名格式：{uuid}.xlsx）
        for (const fileName of excelFiles) {
          const fileId = fileName.replace(/\.(xlsx|xls)$/, '')
          const filePath = join(UPLOAD_DIR, fileName)
          try {
            const stats = await stat(filePath)
            if (stats.isFile() && !filesMetadata.has(fileId)) {
              // 重建元数据（使用文件名作为显示名）
              filesMetadata.set(fileId, {
                name: fileName,
                size: stats.size,
                uploadTime: stats.mtime.toISOString(),
              })
              console.log(`重建元数据: ${fileId} -> ${fileName}`)
            }
          } catch (err) {
            console.error(`处理文件 ${fileName} 时出错:`, err)
          }
        }
        
        // 重新获取元数据
        files = getAllFilesMetadata()
        console.log(`重建后元数据中有 ${files.length} 个文件`)
      } catch (err) {
        console.error('从文件系统扫描文件失败:', err)
      }
    }

    // 验证文件是否仍然存在，并清理不存在的文件的元数据
    const existingFiles = []
    
    for (const file of files) {
      const filePath = join(UPLOAD_DIR, `${file.id}.xlsx`)
      const altPath = join(UPLOAD_DIR, `${file.id}.xls`)
      
      let fileExists = false
      let actualPath = null
      
      try {
        // 检查文件是否存在（尝试两种扩展名）
        let stats = null
        try {
          stats = await stat(filePath)
          if (stats && stats.isFile()) {
            fileExists = true
            actualPath = filePath
          }
        } catch (err1) {
          try {
            stats = await stat(altPath)
            if (stats && stats.isFile()) {
              fileExists = true
              actualPath = altPath
            }
          } catch (err2) {
            // 两个路径都不存在
            fileExists = false
          }
        }
        
        if (fileExists && actualPath) {
          existingFiles.push(file)
          console.log(`✓ 文件存在: ${file.name} (${file.id}), 路径: ${actualPath}`)
        } else {
          // 文件不存在，清理元数据
          console.log(`✗ 文件不存在: ${file.name} (${file.id}), 尝试路径: ${filePath}, ${altPath}`)
          if (filesMetadata.has(file.id)) {
            filesMetadata.delete(file.id)
            console.log(`  已清理元数据: ${file.id}`)
          }
        }
      } catch (error) {
        // 检查过程中出现异常，不立即清理，记录错误
        console.error(`检查文件 ${file.id} (${file.name}) 时出现异常:`, error)
        // 不清理元数据，因为可能是临时错误
        console.log(`  保留元数据，等待下次验证`)
      }
    }

    console.log(`文件列表验证完成: ${existingFiles.length} 个文件存在`)
    return NextResponse.json({
      success: true,
      files: existingFiles,
    })
  } catch (error) {
    console.error('获取文件列表错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取文件列表失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

