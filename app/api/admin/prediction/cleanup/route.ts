import { NextRequest, NextResponse } from 'next/server'
import { readdir, stat, rm } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// 清理超过指定小时数的临时文件（默认24小时）
const CLEANUP_HOURS = 24

export async function POST(request: NextRequest) {
  try {
    const { maxHours = CLEANUP_HOURS } = await request.json().catch(() => ({}))
    
    // 兼容Vercel serverless环境
    const baseDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME 
      ? '/tmp' 
      : process.cwd()
    const tempBaseDir = join(baseDir, 'temp_predictions')
    
    if (!existsSync(tempBaseDir)) {
      return NextResponse.json({
        success: true,
        message: '临时目录不存在，无需清理',
        cleanedDirs: 0,
        cleanedFiles: 0
      })
    }

    const now = Date.now()
    const maxAge = maxHours * 60 * 60 * 1000 // 转换为毫秒
    
    let cleanedDirs = 0
    let cleanedFiles = 0
    const errors: string[] = []

    try {
      const items = await readdir(tempBaseDir)
      
      for (const item of items) {
        if (!item.startsWith('prediction_')) continue
        
        const itemPath = join(tempBaseDir, item)
        
        try {
          const stats = await stat(itemPath)
          const age = now - stats.mtime.getTime()
          
          if (age > maxAge) {
            await rm(itemPath, { recursive: true, force: true })
            cleanedDirs++
            
            // 统计清理的文件数（估算）
            try {
              const dirContents = await readdir(itemPath).catch(() => [])
              cleanedFiles += dirContents.length
            } catch {
              cleanedFiles += 1 // 估算为1个文件
            }
            
            console.log(`已清理过期目录: ${item} (年龄: ${Math.round(age / 1000 / 60 / 60)}小时)`)
          }
        } catch (error) {
          const errorMsg = `清理目录 ${item} 时出错: ${error instanceof Error ? error.message : '未知错误'}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }
    } catch (error) {
      const errorMsg = `读取临时目录时出错: ${error instanceof Error ? error.message : '未知错误'}`
      console.error(errorMsg)
      errors.push(errorMsg)
    }

    return NextResponse.json({
      success: true,
      message: `清理完成，删除了 ${cleanedDirs} 个目录，约 ${cleanedFiles} 个文件`,
      cleanedDirs,
      cleanedFiles,
      errors: errors.length > 0 ? errors : undefined,
      maxAge: maxHours
    })

  } catch (error) {
    console.error('清理API错误:', error)
    return NextResponse.json({
      success: false,
      error: '清理操作失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// 获取临时文件统计信息
export async function GET() {
  try {
    // 兼容Vercel serverless环境
    const baseDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME 
      ? '/tmp' 
      : process.cwd()
    const tempBaseDir = join(baseDir, 'temp_predictions')
    
    if (!existsSync(tempBaseDir)) {
      return NextResponse.json({
        totalDirs: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null
      })
    }

    const items = await readdir(tempBaseDir)
    const predictionDirs = items.filter(item => item.startsWith('prediction_'))
    
    let totalSize = 0
    let oldestTime = Infinity
    let newestTime = 0
    let oldestDir = ''
    let newestDir = ''
    
    for (const dir of predictionDirs) {
      const dirPath = join(tempBaseDir, dir)
      try {
        const stats = await stat(dirPath)
        const size = await calculateDirSize(dirPath)
        
        totalSize += size
        
        if (stats.mtime.getTime() < oldestTime) {
          oldestTime = stats.mtime.getTime()
          oldestDir = dir
        }
        
        if (stats.mtime.getTime() > newestTime) {
          newestTime = stats.mtime.getTime()
          newestDir = dir
        }
      } catch (error) {
        console.error(`统计目录 ${dir} 时出错:`, error)
      }
    }

    return NextResponse.json({
      totalDirs: predictionDirs.length,
      totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100, // MB
      oldestFile: oldestTime !== Infinity ? {
        name: oldestDir,
        age: Math.round((Date.now() - oldestTime) / 1000 / 60 / 60 * 100) / 100 // hours
      } : null,
      newestFile: newestTime > 0 ? {
        name: newestDir,
        age: Math.round((Date.now() - newestTime) / 1000 / 60 / 60 * 100) / 100 // hours
      } : null
    })

  } catch (error) {
    console.error('获取统计信息错误:', error)
    return NextResponse.json({
      error: '获取统计信息失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// 计算目录大小的辅助函数
async function calculateDirSize(dirPath: string): Promise<number> {
  let totalSize = 0
  
  try {
    const items = await readdir(dirPath)
    
    for (const item of items) {
      const itemPath = join(dirPath, item)
      try {
        const stats = await stat(itemPath)
        if (stats.isFile()) {
          totalSize += stats.size
        } else if (stats.isDirectory()) {
          totalSize += await calculateDirSize(itemPath)
        }
      } catch {
        // 忽略无法访问的文件
      }
    }
  } catch {
    // 忽略无法访问的目录
  }
  
  return totalSize
}
