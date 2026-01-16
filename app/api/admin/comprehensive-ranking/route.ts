import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ComprehensiveRanking {
  bupt_student_id: string;
  full_name: string;
  programme?: string | null;
  class?: string | null;
  phone_number?: string | null;
  academic_weighted_average: number;
  programme_rank?: number | null;
  programme_total?: number | null;
  practice_extra_points: number;
  academic_practice_total: number;
  overall_rank?: number | null;
  overall_rank_percentage?: number | null;
}

// 生成综测排名表
export async function POST(request: NextRequest) {
  try {
    console.log('开始生成推免排名表...');
    
    const startTime = Date.now();
    const TIMEOUT_MS = 8000; // 8秒超时保护，留2秒缓冲
    
    // 1. 获取所有智育成绩数据（只查询必要字段）
    const { data: academicScores, error: academicError } = await supabase
      .from('academic_scores')
      .select('bupt_student_id, full_name, programme, class, weighted_average, programme_rank, programme_total');

    if (academicError) {
      console.error('获取智育成绩失败:', academicError);
      return NextResponse.json(
        { error: '获取智育成绩失败', details: academicError.message },
        { status: 500 }
      );
    }

    if (!academicScores || academicScores.length === 0) {
      return NextResponse.json(
        { error: '没有找到智育成绩数据，请先导入智育成绩' },
        { status: 400 }
      );
    }

    // 2. 获取所有德育加分数据
    const { data: moralScores, error: moralError } = await supabase
      .from('comprehensive_evaluation_scores')
      .select('bupt_student_id, total_score, phone_number');

    if (moralError) {
      console.error('获取德育加分失败:', moralError);
      return NextResponse.json(
        { error: '获取德育加分失败', details: moralError.message },
        { status: 500 }
      );
    }

    // 检查超时 - 第一次检查
    if (Date.now() - startTime > TIMEOUT_MS) {
      return NextResponse.json(
        { error: '数据量过大，处理超时。建议联系管理员优化数据或分批处理' },
        { status: 408 }
      );
    }

    // 3. 创建德育加分映射表和手机号映射表
    const moralScoreMap = new Map<string, number>();
    const phoneNumberMap = new Map<string, string>();
    console.log('德育总表数据数量:', moralScores?.length || 0);
    moralScores?.forEach(score => {
      console.log('德育记录:', score.bupt_student_id, score.total_score);
      moralScoreMap.set(score.bupt_student_id, score.total_score || 0);
      if (score.phone_number) {
        phoneNumberMap.set(score.bupt_student_id, score.phone_number);
      }
    });
    console.log('德育映射表大小:', moralScoreMap.size);

    // 4. 合并智育成绩和德育加分，计算综合成绩
    const comprehensiveData: ComprehensiveRanking[] = academicScores.map(academic => {
      const practicePoints = moralScoreMap.get(academic.bupt_student_id) || 0;
      const academicTotal = academic.weighted_average || 0;
      const comprehensiveTotal = academicTotal + practicePoints;
      const phoneNumber = phoneNumberMap.get(academic.bupt_student_id) || null;
      
      // 调试特定学生
      if (academic.bupt_student_id === '2021109') {
        console.log('=== 调试学生 2021109 ===');
        console.log('智育成绩:', academicTotal);
        console.log('德育加分:', practicePoints);
        console.log('综合成绩:', comprehensiveTotal);
        console.log('德育映射表中是否存在:', moralScoreMap.has(academic.bupt_student_id));
      }

      return {
        bupt_student_id: academic.bupt_student_id,
        full_name: academic.full_name,
        programme: academic.programme,
        class: academic.class,
        phone_number: phoneNumber,
        academic_weighted_average: Math.round(academicTotal * 100) / 100,
        programme_rank: academic.programme_rank,
        programme_total: academic.programme_total,
        practice_extra_points: Math.round(practicePoints * 100) / 100,
        academic_practice_total: Math.round(comprehensiveTotal * 100) / 100,
        overall_rank: null, // 将在下一步计算
        overall_rank_percentage: null
      };
    });

    // 5. 按专业分组并计算综合排名
    const programmeGroups = new Map<string, ComprehensiveRanking[]>();
    
    comprehensiveData.forEach(student => {
      const programme = student.programme || '未知专业';
      if (!programmeGroups.has(programme)) {
        programmeGroups.set(programme, []);
      }
      programmeGroups.get(programme)!.push(student);
    });

    // 检查超时 - 第二次检查
    if (Date.now() - startTime > TIMEOUT_MS) {
      return NextResponse.json(
        { error: '数据量过大，处理超时。建议联系管理员优化数据或分批处理' },
        { status: 408 }
      );
    }

    // 6. 为每个专业计算排名
    const finalRankings: ComprehensiveRanking[] = [];
    
    programmeGroups.forEach((students, programme) => {
      // 按综合成绩降序排序
      students.sort((a, b) => b.academic_practice_total - a.academic_practice_total);
      
      // 分配排名
      students.forEach((student, index) => {
        student.overall_rank = index + 1;
        student.overall_rank_percentage = Math.round((student.overall_rank / students.length) * 10000) / 100; // 保留两位小数
        finalRankings.push(student);
      });
    });

    // 7. 清空现有综测排名表
    const { error: deleteError } = await supabase
      .from('comprehensive_ranking')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('清空综测排名表失败:', deleteError);
      return NextResponse.json(
        { error: '清空综测排名表失败', details: deleteError.message },
        { status: 500 }
      );
    }

    // 8. 批量插入新的排名数据
    if (finalRankings.length > 0) {
      // 分批插入，避免超时
      const BATCH_SIZE = 100;
      let insertedCount = 0;
      
      for (let i = 0; i < finalRankings.length; i += BATCH_SIZE) {
        const batch = finalRankings.slice(i, i + BATCH_SIZE);
        
        const { error: insertError } = await supabase
          .from('comprehensive_ranking')
          .insert(batch);

        if (insertError) {
          console.error(`批次 ${Math.floor(i/BATCH_SIZE) + 1} 插入失败:`, insertError);
          return NextResponse.json(
            { error: '插入综测排名数据失败', details: insertError.message },
            { status: 500 }
          );
        }
        
        insertedCount += batch.length;
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`综测排名表生成完成，耗时 ${executionTime}ms，共处理 ${finalRankings.length} 名学生`);

    // 9. 统计信息
    const programmeStats = Array.from(programmeGroups.entries()).map(([programme, students]) => ({
      programme,
      studentCount: students.length,
      avgScore: Math.round((students.reduce((sum, s) => sum + s.academic_practice_total, 0) / students.length) * 100) / 100
    }));

    return NextResponse.json({
      success: true,
      message: `综测排名表生成成功，共处理 ${finalRankings.length} 名学生`,
      summary: {
        totalStudents: finalRankings.length,
        totalProgrammes: programmeGroups.size,
        studentsWithMoralScores: moralScores?.length || 0,
        executionTime: `${executionTime}ms`
      },
      programmeStats
    });

  } catch (error) {
    console.error('生成综测排名表失败:', error);
    return NextResponse.json(
      { error: '生成综测排名表失败', details: error },
      { status: 500 }
    );
  }
}

// 获取综测排名数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const programme = searchParams.get('programme');
    const classFilter = searchParams.get('class');
    const format = searchParams.get('format') || 'json';
    const topN = parseInt(searchParams.get('topN') || '0'); // 获取前N名

    let query = supabase
      .from('comprehensive_ranking')
      .select('*');

    // 专业筛选
    if (programme) {
      query = query.eq('programme', programme);
    }

    // 班级筛选
    if (classFilter) {
      query = query.eq('class', classFilter);
    }

    // 排序：按综合成绩降序
    query = query.order('academic_practice_total', { ascending: false });

    if (format === 'csv') {
      // 导出CSV格式
      const queryLimit = topN > 0 ? topN : 1000;
      const { data: rankings, error } = await query.limit(queryLimit);

      if (error) {
        console.error('获取综测排名失败:', error);
        return NextResponse.json({ error: '获取综测排名失败' }, { status: 500 });
      }

      // 生成CSV格式，使用中文表头
      const BOM = '\uFEFF'; // UTF-8 BOM
      const csvHeader = '学号,姓名,专业名称,班级名称,手机号,专业成绩加权均分,专业成绩排名,专业排名总人数,实践活动加分,专业综合成绩,专业综合排名,专业综合排名百分比\n';
      const csvRows = rankings?.map(ranking => {
        return `${ranking.bupt_student_id || ''},${ranking.full_name || ''},${ranking.programme || ''},${ranking.class || ''},${ranking.phone_number || ''},${ranking.academic_weighted_average || 0},${ranking.programme_rank || ''},${ranking.programme_total || ''},${ranking.practice_extra_points || 0},${ranking.academic_practice_total || 0},${ranking.overall_rank || ''},${ranking.overall_rank_percentage || ''}`;
      }).join('\n') || '';

      const csvContent = BOM + csvHeader + csvRows;
      const encoder = new TextEncoder();
      const csvBuffer = encoder.encode(csvContent);

      const filename = topN > 0 ? `comprehensive_ranking_top${topN}.csv` : 'comprehensive_ranking.csv';

      return new NextResponse(csvBuffer, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // JSON格式返回
    if (topN > 0) {
      query = query.limit(topN);
    } else {
      // 分页查询
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data: rankings, error } = await query;

    if (error) {
      console.error('获取综测排名失败:', error);
      return NextResponse.json({ error: '获取综测排名失败' }, { status: 500 });
    }

    // 获取总记录数
    const { count: totalCount } = await supabase
      .from('comprehensive_ranking')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      data: rankings || [],
      pagination: topN > 0 ? undefined : {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      },
      summary: {
        total: totalCount || 0,
        returned: rankings?.length || 0,
        topN: topN > 0 ? topN : undefined
      }
    });

  } catch (error) {
    console.error('获取综测排名失败:', error);
    return NextResponse.json(
      { error: '获取综测排名失败', details: error },
      { status: 500 }
    );
  }
}

// 删除综测排名数据
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      const { error } = await supabase
        .from('comprehensive_ranking')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error('清空综测排名表失败:', error);
        return NextResponse.json({ error: '清空综测排名表失败' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: '综测排名表已清空'
      });
    }

    return NextResponse.json(
      { error: '请使用clearAll参数清空数据' },
      { status: 400 }
    );

  } catch (error) {
    console.error('删除综测排名失败:', error);
    return NextResponse.json(
      { error: '删除综测排名失败', details: error },
      { status: 500 }
    );
  }
}
