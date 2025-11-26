import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AcademicScore {
  bupt_student_id: string;
  full_name: string;
  school?: string | null;
  campus?: string | null;
  programme?: string | null;
  class?: string | null;
  degree_category?: string | null;
  total_diet?: number;
  total_credits?: number;
  taken_credits?: number;
  untaken_credits?: number;
  weighted_average?: number;
  gpa?: number;
  programme_rank?: number | null;
  programme_total?: number | null;
}

// 导入智育成绩数据
export async function POST(request: NextRequest) {
  try {
    console.log('开始导入智育成绩数据...');
    
    const body = await request.json();
    const { academicScores, replaceExisting = false } = body;

    if (!academicScores || !Array.isArray(academicScores)) {
      return NextResponse.json(
        { error: '请提供有效的智育成绩数据数组' },
        { status: 400 }
      );
    }

    // 验证必填字段
    const requiredFields = ['bupt_student_id', 'full_name'];
    const invalidRecords = academicScores.filter((score: any) => 
      requiredFields.some(field => !score[field])
    );

    if (invalidRecords.length > 0) {
      return NextResponse.json(
        { 
          error: '存在缺少必填字段的记录',
          invalidRecords: invalidRecords.length,
          requiredFields 
        },
        { status: 400 }
      );
    }

    // 数据预处理和验证
    const processedScores: AcademicScore[] = academicScores.map((score: any) => ({
      bupt_student_id: score.bupt_student_id?.toString().trim(),
      full_name: score.full_name?.toString().trim(),
      school: score.school?.toString().trim() || null,
      campus: score.campus?.toString().trim() || null,
      programme: score.programme?.toString().trim() || null,
      class: score.class?.toString().trim() || null,
      degree_category: score.degree_category?.toString().trim() || null,
      total_diet: parseInt(score.total_diet) || 0,
      total_credits: parseFloat(score.total_credits) || 0,
      taken_credits: parseFloat(score.taken_credits) || 0,
      untaken_credits: parseFloat(score.untaken_credits) || 0,
      weighted_average: parseFloat(score.weighted_average) || 0,
      gpa: parseFloat(score.gpa) || 0,
      programme_rank: parseInt(score.programme_rank) || null,
      programme_total: parseInt(score.programme_total) || null,
    }));

    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // 如果选择替换现有数据，先清空表
    if (replaceExisting) {
      const { error: deleteError } = await supabase
        .from('academic_scores')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        console.error('清空智育成绩表失败:', deleteError);
        return NextResponse.json(
          { error: '清空现有数据失败' },
          { status: 500 }
        );
      }
    }

    // 分批处理数据，避免超时
    const BATCH_SIZE = 100;
    for (let i = 0; i < processedScores.length; i += BATCH_SIZE) {
      const batch = processedScores.slice(i, i + BATCH_SIZE);
      
      try {
        if (replaceExisting) {
          // 直接插入
          const { error: insertError } = await supabase
            .from('academic_scores')
            .insert(batch);

          if (insertError) {
            console.error(`批次 ${Math.floor(i/BATCH_SIZE) + 1} 插入失败:`, insertError);
            errorCount += batch.length;
            errors.push(`批次 ${Math.floor(i/BATCH_SIZE) + 1}: ${insertError.message}`);
          } else {
            insertedCount += batch.length;
          }
        } else {
          // 使用 upsert 处理重复数据
          const { error: upsertError } = await supabase
            .from('academic_scores')
            .upsert(batch, { 
              onConflict: 'bupt_student_id',
              ignoreDuplicates: false 
            });

          if (upsertError) {
            console.error(`批次 ${Math.floor(i/BATCH_SIZE) + 1} upsert失败:`, upsertError);
            errorCount += batch.length;
            errors.push(`批次 ${Math.floor(i/BATCH_SIZE) + 1}: ${upsertError.message}`);
          } else {
            // 注意：upsert 不区分插入和更新，这里简化处理
            insertedCount += batch.length;
          }
        }
      } catch (batchError) {
        console.error(`批次 ${Math.floor(i/BATCH_SIZE) + 1} 处理失败:`, batchError);
        errorCount += batch.length;
        errors.push(`批次 ${Math.floor(i/BATCH_SIZE) + 1}: ${batchError}`);
      }
    }

    const totalProcessed = insertedCount + updatedCount + errorCount;

    return NextResponse.json({
      success: true,
      message: `智育成绩导入完成`,
      summary: {
        totalRecords: processedScores.length,
        processed: totalProcessed,
        inserted: insertedCount,
        updated: updatedCount,
        errors: errorCount
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('导入智育成绩失败:', error);
    return NextResponse.json(
      { error: '导入智育成绩失败', details: error },
      { status: 500 }
    );
  }
}

// 获取智育成绩数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const programme = searchParams.get('programme');
    const classFilter = searchParams.get('class');
    const format = searchParams.get('format') || 'json';

    let query = supabase
      .from('academic_scores')
      .select('*');

    // 专业筛选
    if (programme) {
      query = query.eq('programme', programme);
    }

    // 班级筛选
    if (classFilter) {
      query = query.eq('class', classFilter);
    }

    // 排序
    query = query.order('programme_rank', { ascending: true, nullsFirst: false });

    if (format === 'csv') {
      // 导出CSV格式
      const { data: scores, error } = await query.limit(1000);

      if (error) {
        console.error('获取智育成绩失败:', error);
        return NextResponse.json({ error: '获取智育成绩失败' }, { status: 500 });
      }

      // 生成CSV格式
      const BOM = '\uFEFF'; // UTF-8 BOM
      const csvHeader = 'id,bupt_student_id,full_name,school,campus,programme,class,degree_category,total_diet,total_credits,taken_credits,untaken_credits,weighted_average,gpa,programme_rank,programme_total,created_at,updated_at\n';
      const csvRows = scores?.map(score => {
        const createdAt = score.created_at ? new Date(score.created_at).toISOString() : '';
        const updatedAt = score.updated_at ? new Date(score.updated_at).toISOString() : '';
        
        return `${score.id || ''},${score.bupt_student_id || ''},${score.full_name || ''},${score.school || ''},${score.campus || ''},${score.programme || ''},${score.class || ''},${score.degree_category || ''},${score.total_diet || 0},${score.total_credits || 0},${score.taken_credits || 0},${score.untaken_credits || 0},${score.weighted_average || 0},${score.gpa || 0},${score.programme_rank || ''},${score.programme_total || ''},${createdAt},${updatedAt}`;
      }).join('\n') || '';

      const csvContent = BOM + csvHeader + csvRows;
      const encoder = new TextEncoder();
      const csvBuffer = encoder.encode(csvContent);

      return new NextResponse(csvBuffer, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="academic_scores.csv"',
        },
      });
    }

    // 分页查询
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: scores, error } = await query;

    if (error) {
      console.error('获取智育成绩失败:', error);
      return NextResponse.json({ error: '获取智育成绩失败' }, { status: 500 });
    }

    // 获取总记录数
    const { count: totalCount } = await supabase
      .from('academic_scores')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      data: scores || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('获取智育成绩失败:', error);
    return NextResponse.json(
      { error: '获取智育成绩失败', details: error },
      { status: 500 }
    );
  }
}

// 删除智育成绩数据
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      // 清空所有数据
      const { error } = await supabase
        .from('academic_scores')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error('清空智育成绩表失败:', error);
        return NextResponse.json({ error: '清空智育成绩表失败' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: '智育成绩表已清空'
      });
    }

    if (studentId) {
      // 删除指定学生数据
      const { error } = await supabase
        .from('academic_scores')
        .delete()
        .eq('bupt_student_id', studentId);

      if (error) {
        console.error('删除学生智育成绩失败:', error);
        return NextResponse.json({ error: '删除学生智育成绩失败' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `学生 ${studentId} 的智育成绩已删除`
      });
    }

    return NextResponse.json(
      { error: '请指定要删除的学生ID或使用clearAll参数' },
      { status: 400 }
    );

  } catch (error) {
    console.error('删除智育成绩失败:', error);
    return NextResponse.json(
      { error: '删除智育成绩失败', details: error },
      { status: 500 }
    );
  }
}
