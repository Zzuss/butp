import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - 获取截止时间配置
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('deadline_config')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = 没有找到记录
      throw error
    }

    // 如果没有配置，返回默认值
    if (!data) {
      return NextResponse.json({
        success: true,
        data: {
          deadline: null,
          is_enabled: false
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: data
    })
  } catch (error) {
    console.error('获取截止时间配置失败:', error)
    return NextResponse.json({
      success: false,
      message: '获取截止时间配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// POST - 设置截止时间配置
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { deadline, is_enabled } = body

    // 先检查是否已有配置
    const { data: existing } = await supabase
      .from('deadline_config')
      .select('id')
      .single()

    let result
    if (existing) {
      // 更新现有配置
      result = await supabase
        .from('deadline_config')
        .update({
          deadline,
          is_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      // 创建新配置
      result = await supabase
        .from('deadline_config')
        .insert({
          deadline,
          is_enabled
        })
        .select()
        .single()
    }

    if (result.error) {
      throw result.error
    }

    return NextResponse.json({
      success: true,
      message: '截止时间配置保存成功',
      data: result.data
    })
  } catch (error) {
    console.error('保存截止时间配置失败:', error)
    return NextResponse.json({
      success: false,
      message: '保存截止时间配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
