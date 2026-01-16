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
      award_type, // 'prize' 或 'ranking'
      award_value, // 具体获得的奖项或排名
      note,
      // 新增团体竞赛字段
      competition_type, // 'individual' 或 'team'
      team_leader_is_bupt, // boolean
      is_main_member, // boolean
      main_members_count, // number
      coefficient // number
    } = body

    console.log('📝 添加竞赛记录:', {
      competition_region,
      competition_level, 
      competition_name,
      bupt_student_id,
      award_type,
      award_value,
      competition_type,
      team_leader_is_bupt,
      is_main_member,
      main_members_count,
      coefficient: coefficient,
      coefficient_type: typeof coefficient
    })

    // 验证必填字段
    if (!competition_region || !competition_level || !competition_name || 
        !bupt_student_id || !full_name || !award_type || !award_value) {
      return NextResponse.json({
        success: false,
        message: '请填写所有必填字段'
      }, { status: 400 })
    }

    // 根据奖项类型查询对应的分数
    let score = 0
    let scoreQuery
    // 排名类竞赛不应用系数，始终为1
    const finalCoefficient = award_type === 'ranking' ? 1 : (Number(coefficient) || 1)
    console.log('🔢 系数计算:', {
      award_type,
      original_coefficient: coefficient,
      parsed_coefficient: Number(coefficient),
      final_coefficient: finalCoefficient,
      is_ranking: award_type === 'ranking'
    })
    
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
      const baseScore = Number(scoreQuery.data?.[award_value]) || 0
      // 应用系数计算最终分数
      // 团体竞赛需要除以主力队员人数
      if (competition_type === 'team' && main_members_count >= 1) {
        score = Math.round((baseScore * finalCoefficient / main_members_count) * 100) / 100
      } else {
        score = Math.round(baseScore * finalCoefficient * 100) / 100
      }
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
        note: note || '',
        score,
        // 新增字段
        competition_type: award_type === 'ranking' ? 'individual' : (competition_type || 'individual'),
        team_leader_is_bupt: (award_type === 'ranking' || competition_type !== 'team') ? null : team_leader_is_bupt,
        is_main_member: (award_type === 'ranking' || competition_type !== 'team') ? null : is_main_member,
        main_members_count: (award_type === 'ranking' || competition_type !== 'team') ? null : main_members_count,
        coefficient: finalCoefficient
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

// PUT - 更新竞赛记录
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id, // 记录ID
      competition_region,
      competition_level,
      competition_name,
      bupt_student_id,
      full_name,
      award_type,
      award_value,
      note,
      competition_type,
      team_leader_is_bupt,
      is_main_member,
      main_members_count,
      coefficient
    } = body

    console.log('✏️ 更新竞赛记录:', {
      id,
      competition_region,
      competition_level, 
      competition_name,
      bupt_student_id,
      award_type,
      award_value,
      competition_type,
      team_leader_is_bupt,
      is_main_member,
      main_members_count,
      coefficient
    })

    // 验证必填字段
    if (!id || !competition_region || !competition_level || !competition_name || 
        !bupt_student_id || !full_name || !award_type || !award_value) {
      return NextResponse.json({
        success: false,
        message: '请填写所有必填字段'
      }, { status: 400 })
    }

    // 先检查记录是否存在且属于该用户
    const { data: existingRecord, error: checkError } = await supabase
      .from('student_competition_records')
      .select('approval_status')
      .eq('id', id)
      .eq('bupt_student_id', bupt_student_id)
      .single()

    if (checkError || !existingRecord) {
      console.error('❌ 竞赛记录不存在或无权限:', checkError)
      return NextResponse.json({
        success: false,
        message: '竞赛记录不存在或无权限修改'
      }, { status: 404 })
    }

    if (existingRecord.approval_status === 'approved') {
      return NextResponse.json({
        success: false,
        message: '已审核的竞赛记录不允许修改'
      }, { status: 403 })
    }

    // 根据奖项类型查询对应的分数
    let score = 0
    let scoreQuery
    const finalCoefficient = award_type === 'ranking' ? 1 : (Number(coefficient) || 1)
    
    if (award_type === 'prize') {
      scoreQuery = await supabase
        .from('student_competition_scores')
        .select(award_value)
        .eq('region', competition_region)
        .eq('level', competition_level)
        .eq('name', competition_name)
        .single()
    } else if (award_type === 'ranking') {
      scoreQuery = await supabase
        .from('student_competition_ranking_scores')
        .select(award_value)
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
      score = 0
    } else {
      const baseScore = Number(scoreQuery.data?.[award_value]) || 0
      // 团体竞赛需要除以主力队员人数
      if (competition_type === 'team' && main_members_count >= 1) {
        score = Math.round((baseScore * finalCoefficient / main_members_count) * 100) / 100
      } else {
        score = Math.round(baseScore * finalCoefficient * 100) / 100
      }
    }

    // 更新竞赛记录
    const { data, error } = await supabase
      .from('student_competition_records')
      .update({
        competition_region,
        competition_level,
        competition_name,
        full_name,
        note: note || '',
        score,
        competition_type: award_type === 'ranking' ? 'individual' : (competition_type || 'individual'),
        team_leader_is_bupt: (award_type === 'ranking' || competition_type !== 'team') ? null : team_leader_is_bupt,
        is_main_member: (award_type === 'ranking' || competition_type !== 'team') ? null : is_main_member,
        main_members_count: (award_type === 'ranking' || competition_type !== 'team') ? null : main_members_count,
        coefficient: finalCoefficient
      })
      .eq('id', id)
      .eq('bupt_student_id', bupt_student_id)
      .select()
      .single()

    if (error) {
      console.error('❌ 更新竞赛记录失败:', error)
      throw error
    }

    console.log('✅ 成功更新竞赛记录，ID:', data.id)
    
    return NextResponse.json({
      success: true,
      message: '竞赛记录更新成功',
      data: data
    })

  } catch (error) {
    console.error('💥 更新竞赛记录失败:', error)
    return NextResponse.json({
      success: false,
      message: '更新竞赛记录失败',
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
    
    // 先检查是否已审核
    const { data: existingRecord, error: checkError } = await supabase
      .from('student_competition_records')
      .select('approval_status')
      .eq('id', recordId)
      .eq('bupt_student_id', userId)
      .single()

    if (checkError) {
      console.error('❌ 检查竞赛记录审核状态失败:', checkError)
      return NextResponse.json({
        success: false,
        message: '检查竞赛记录审核状态失败'
      }, { status: 500 })
    }

    if (existingRecord?.approval_status === 'approved') {
      return NextResponse.json({
        success: false,
        message: '已审核的竞赛记录不允许删除'
      }, { status: 403 })
    }

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

