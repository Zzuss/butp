import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - 获取用户的竞赛记录
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '缺少用户ID参数'
      }, { status: 400 })
    }

    console.log(`📋 获取用户 ${userId} 的竞赛记录...`)
    
    const { data, error } = await supabase
      .from('student_competition_records')
      .select('*')
      .eq('bupt_student_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 查询竞赛记录失败:', error)
      throw error
    }

    console.log(`✅ 成功获取 ${data?.length || 0} 条竞赛记录`)
    
    return NextResponse.json({
      success: true,
      data: data || []
    })

  } catch (error) {
    console.error('💥 获取竞赛记录失败:', error)
    return NextResponse.json({
      success: false,
      message: '获取竞赛记录失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// POST - 添加新的竞赛记录
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      competition_region,
      competition_level,
      competition_name,
      bupt_student_id,
      full_name,
      class: studentClass,
      award_type, // 'prize' 或 'ranking'
      award_value, // 具体获得的奖项或排名
      note
    } = body

    console.log('📝 添加竞赛记录:', {
      competition_region,
      competition_level, 
      competition_name,
      bupt_student_id,
      award_type,
      award_value
    })

    // 验证必填字段
    if (!competition_region || !competition_level || !competition_name || 
        !bupt_student_id || !full_name || !studentClass || !award_type || !award_value) {
      return NextResponse.json({
        success: false,
        message: '请填写所有必填字段'
      }, { status: 400 })
    }

    // 根据奖项类型查询对应的分数
    let score = 0
    let scoreQuery
    
    if (award_type === 'prize') {
      // 查询奖项等级加分表
      scoreQuery = await supabase
        .from('student_competition_scores')
        .select(award_value) // award_value应该是 'premier_prize', 'first_prize' 等
        .eq('region', competition_region)
        .eq('level', competition_level)
        .eq('name', competition_name)
        .single()
    } else if (award_type === 'ranking') {
      // 查询排名加分表
      scoreQuery = await supabase
        .from('student_competition_ranking_scores')
        .select(award_value) // award_value应该是 'ranked_first', 'ranked_second' 等
        .eq('region', competition_region)
        .eq('level', competition_level)
        .eq('name', competition_name)
        .single()
    } else {
      return NextResponse.json({
        success: false,
        message: '无效的奖项类型'
      }, { status: 400 })
    }

    if (scoreQuery.error) {
      console.error('❌ 查询分数失败:', scoreQuery.error)
      // 如果查询失败，设置分数为0（表示需要根据当年情况确定）
      score = 0
    } else {
      score = scoreQuery.data?.[award_value] || 0
    }

    // 插入竞赛记录
    const { data, error } = await supabase
      .from('student_competition_records')
      .insert({
        competition_region,
        competition_level,
        competition_name,
        bupt_student_id,
        full_name,
        class: studentClass,
        note: note || '',
        score
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 插入竞赛记录失败:', error)
      throw error
    }

    console.log('✅ 成功添加竞赛记录，ID:', data.id)
    
    return NextResponse.json({
      success: true,
      message: '竞赛记录添加成功',
      data: data
    })

  } catch (error) {
    console.error('💥 添加竞赛记录失败:', error)
    return NextResponse.json({
      success: false,
      message: '添加竞赛记录失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// DELETE - 删除竞赛记录
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const recordId = searchParams.get('id')
    const userId = searchParams.get('userId')
    
    if (!recordId || !userId) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数'
      }, { status: 400 })
    }

    console.log(`🗑️ 删除竞赛记录 ${recordId}...`)
    
    const { error } = await supabase
      .from('student_competition_records')
      .delete()
      .eq('id', recordId)
      .eq('bupt_student_id', userId) // 确保只能删除自己的记录

    if (error) {
      console.error('❌ 删除竞赛记录失败:', error)
      throw error
    }

    console.log('✅ 成功删除竞赛记录')
    
    return NextResponse.json({
      success: true,
      message: '竞赛记录删除成功'
    })

  } catch (error) {
    console.error('💥 删除竞赛记录失败:', error)
    return NextResponse.json({
      success: false,
      message: '删除竞赛记录失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

