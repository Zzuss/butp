import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    console.log('📋 获取竞赛选项数据...')
    
    // 并行查询两个竞赛表
    const [scoresResult, rankingResult] = await Promise.all([
      supabase
        .from('student_competition_scores')
        .select('region, level, name, premier_prize, first_prize, second_prize, third_prize')
        .order('region')
        .order('level')
        .order('name'),
      
      supabase
        .from('student_competition_ranking_scores')
        .select('region, level, name, ranked_first, ranked_second, ranked_third, ranked_fourth, ranked_fifth, ranked_sixth')
        .order('region')
        .order('level')
        .order('name')
    ])

    if (scoresResult.error) {
      console.error('❌ 查询奖项等级加分表失败:', scoresResult.error)
      throw scoresResult.error
    }

    if (rankingResult.error) {
      console.error('❌ 查询排名加分表失败:', rankingResult.error)
      throw rankingResult.error
    }

    console.log(`✅ 成功获取竞赛选项 - 奖项等级: ${scoresResult.data?.length || 0}条, 排名: ${rankingResult.data?.length || 0}条`)
    
    return NextResponse.json({
      success: true,
      data: {
        prizeBasedCompetitions: scoresResult.data || [],
        rankingBasedCompetitions: rankingResult.data || []
      }
    })

  } catch (error) {
    console.error('💥 获取竞赛选项失败:', error)
    return NextResponse.json({
      success: false,
      message: '获取竞赛选项失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

