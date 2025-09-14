import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

// 这个端点用于触发SQL文件执行
// 由于无法在API路由中直接调用MCP工具，这个端点会生成执行指令
export async function POST(request: NextRequest) {
  try {
    const { sqlFile, operation } = await request.json()
    
    console.log(`收到SQL执行请求: ${operation}`)
    console.log(`SQL文件: ${sqlFile}`)
    
    if (!sqlFile) {
      return NextResponse.json({
        success: false,
        error: 'SQL文件路径未提供'
      }, { status: 400 })
    }
    
    // 检查文件是否存在
    const sqlFilePath = join(process.cwd(), sqlFile)
    
    try {
      const sqlContent = await readFile(sqlFilePath, 'utf8')
      const sqlSize = sqlContent.length
      
      // 估算记录数（粗略计算）
      const estimatedRecords = (sqlContent.match(/VALUES/g) || []).length * 500
      
      console.log(`SQL文件大小: ${sqlSize} bytes`)
      console.log(`预估记录数: ${estimatedRecords} 条`)
      
      return NextResponse.json({
        success: true,
        message: `SQL文件已准备执行`,
        sqlFile: sqlFile,
        sqlSize: sqlSize,
        estimatedRecords: estimatedRecords,
        instructions: [
          '1. Claude将使用MCP工具执行此SQL文件',
          '2. 由于数据量大，可能需要分批执行',
          '3. 执行完成后会返回结果'
        ],
        // 这个标志告诉前端，SQL准备好了，可以请求Claude执行
        readyForExecution: true
      })
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: `无法读取SQL文件: ${error.message}`
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error('SQL执行请求处理失败:', error)
    
    return NextResponse.json({
      success: false,
      error: `请求处理失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 })
  }
}
