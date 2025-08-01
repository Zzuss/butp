import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const body = await request.json();
    const { studentHash } = body;

    if (!studentHash) {
      return NextResponse.json({ error: 'Student hash is required' }, { status: 400 })
    }

    // 去除前后空格
    const trimmedHash = studentHash.trim();

    // 检查学号格式（64位十六进制）
    if (!/^[a-f0-9]{64}$/i.test(trimmedHash)) {
      return NextResponse.json({ error: 'Invalid hash format' }, { status: 400 })
    }

    // 查询所有包含学号的表格
    const tables = [
      { name: 'academic_results', snhColumn: 'SNH', majorColumn: 'Current_Major' },
      { name: 'cohort_probability', snhColumn: 'SNH', majorColumn: 'major' },
      { name: 'cohort_predictions', snhColumn: 'SNH', majorColumn: 'major' },
      { name: 'student_grades', snhColumn: 'SNH', majorColumn: null }
    ];

    let foundStudent = null;
    let foundTable = null;

    // 依次查询每个表格
    for (const table of tables) {
      try {
        const selectFields = table.majorColumn 
          ? `${table.snhColumn}, ${table.majorColumn}`
          : table.snhColumn;

        const { data, error } = await supabase
          .from(table.name)
          .select(selectFields)
          .eq(table.snhColumn, trimmedHash)
          .limit(1);

        if (error) {
          console.error(`${table.name} query error:`, error);
          continue; // 继续查询下一个表格
        }

        if (data && data.length > 0) {
          foundStudent = data[0];
          foundTable = table;
          break; // 找到学生，停止查询
        }
      } catch (error) {
        console.error(`Error querying ${table.name}:`, error);
        continue;
      }
    }

    // 如果没有找到学生
    if (!foundStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // 返回找到的学生信息
    const major = foundTable?.majorColumn ? foundStudent[foundTable.majorColumn as keyof typeof foundStudent] : null;
    
    const response = {
      exists: true,
      studentInfo: {
        id: trimmedHash,
        name: `学生 ${trimmedHash.substring(0, 6)}`,
        class: major || '未知专业'
      }
    };
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 