import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: '请提供任务ID' }, { status: 400 })
    }

    // 查询阿里云任务状态
    const statusResponse = await fetch(`http://8.152.102.160:8080/api/task/status/${taskId}`, {
      method: 'GET',
    })

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text()
      console.error(`❌ 查询任务状态失败: ${errorText}`)
      return NextResponse.json({
        success: false,
        error: '查询任务状态失败',
        details: errorText
      }, { status: 500 })
    }

    const result = await statusResponse.json()

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: '任务不存在或查询失败',
        details: result.error
      }, { status: 404 })
    }

    // 返回任务状态
    const taskData = result.data
    return NextResponse.json({
      success: true,
      data: {
        taskId: taskData.id,
        status: taskData.status,
        progress: taskData.progress,
        message: taskData.message,
        createdAt: taskData.created_at,
        updatedAt: taskData.updated_at,
        year: taskData.year,
        resultFiles: taskData.result_files || [],
        error: taskData.error,
        // 添加状态描述
        statusDescription: getStatusDescription(taskData.status),
        canDownload: taskData.status === 'completed' && taskData.result_files && taskData.result_files.length > 0
      }
    })

  } catch (error) {
    console.error('❌ 查询任务状态异常:', error)
    return NextResponse.json({
      success: false,
      error: '查询任务状态失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

function getStatusDescription(status: string): string {
  const descriptions: { [key: string]: string } = {
    'pending': '⏳ 等待开始',
    'running': '🚀 正在预测',
    'completed': '✅ 预测完成',
    'failed': '❌ 预测失败'
  }
  return descriptions[status] || '❓ 未知状态'
}
