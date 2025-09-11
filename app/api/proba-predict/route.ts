import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

type FeatureValues = Record<string, number>

export async function POST(request: NextRequest) {
  try {
    const { featureValues } = await request.json()

    if (!featureValues || typeof featureValues !== 'object') {
      return NextResponse.json({ error: 'featureValues is required' }, { status: 400 })
    }

    // 通过 stdin 把 JSON 传给本地 Python 脚本
    const pythonPath = 'python'
    // 以当前工作目录为根，定位到 butp/scripts/xgb_predict_task3.py
    // 注意：在本项目运行时，process.cwd() 可能已位于 butp 目录，因此这里不再重复拼接 'butp'
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'xgb_predict_task3.py')

    const child = spawn(pythonPath, [scriptPath])

    const payload = JSON.stringify({ featureValues })
    child.stdin.write(payload)
    child.stdin.end()

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    const code: number = await new Promise((resolve) => {
      child.on('close', (c) => resolve(c ?? 0))
    })

    if (code !== 0) {
      return NextResponse.json({ error: 'Python script failed', detail: stderr || stdout }, { status: 500 })
    }

    let result: any
    try {
      result = JSON.parse(stdout || '{}')
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON from Python', raw: stdout }, { status: 500 })
    }

    if (result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}


