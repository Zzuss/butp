import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 在每次请求时创建新的客户端，避免连接问题
function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { studentHash } = await request.json()

    if (!studentHash) {
      return NextResponse.json({ error: 'Student hash is required' }, { status: 400 })
    }

    const trimmedHash = studentHash.trim();

    if (!/^[a-f0-9]{64}$/i.test(trimmedHash)) {
      return NextResponse.json({ error: 'Invalid hash format' }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    // 获取来源2的数据（academic_results表）
    const { data: source2Data, error: source2Error } = await supabase
      .from('academic_results')
      .select(`
        SNH,
        Semester_Offered,
        Current_Major,
        Course_ID,
        Course_Name,
        Grade,
        Grade_Remark,
        Course_Type,
        Course_Attribute,
        Hours,
        Credit,
        Offering_Unit,
        Tags,
        Description,
        Exam_Type,
        Assessment_Method
      `)
      .eq('SNH', trimmedHash)
      .order('Semester_Offered', { ascending: true });

    if (source2Error) {
      console.error('Source 2 error:', source2Error)
      return NextResponse.json({ error: 'Failed to fetch source 2 data' }, { status: 500 })
    }

    // 获取courses表信息用于映射
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('course_id, course_name, semester, category, credit')
      .not('course_id', 'is', null);

    if (coursesError) {
      console.error('Courses error:', coursesError)
      return NextResponse.json({ error: 'Failed to fetch courses data' }, { status: 500 })
    }

    // 创建课程编号到课程信息的映射
    const courseIdToInfoMap: Record<string, any> = {};
    coursesData?.forEach(course => {
      if (course.course_id) {
        courseIdToInfoMap[course.course_id] = {
          semester: course.semester,
          category: course.category,
          credit: course.credit
        };
      }
    });

    // 课程类型到类别的映射
    // 注意：如果需要添加新的课程类型或修改映射关系，需要手动更新这个映射表
    const courseTypeToCategoryMapping: Record<string, string> = {
      '思想政治理论课': '政治课程',
      '公共课': '公共课程',
      '专业课': '专业课程',
      '实践教学课': '实践课程',
      '校级双创课': '创新课程',
      '院级双创课': '创新课程',
      '其他': '基础学科'
    };

    // 处理来源2数据
    const source2Courses: any[] = [];
    if (source2Data) {
      source2Data.forEach((record: any) => {
        const courseId = record.Course_ID;
        const courseInfo = courseId ? courseIdToInfoMap[courseId] : null;
        
        // 转换成绩格式
        let score = null;
        if (record.Grade) {
          const gradeStr = record.Grade.toString();
          if (gradeStr.includes('.')) {
            score = parseFloat(gradeStr);
          } else {
            score = parseInt(gradeStr);
          }
        }
        
        source2Courses.push({
          courseName: record.Course_Name,
          courseId: courseId,
          score: score,
          semester: courseInfo?.semester || record.Semester_Offered,
          category: courseTypeToCategoryMapping[record.Course_Type] || '基础学科', // 使用课程类型映射
          credit: courseInfo?.credit || parseFloat(record.Credit) || 0.1,
          courseType: record.Course_Type,
          courseAttribute: record.Course_Attribute,
          examType: record.Exam_Type
        });
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        studentInfo: {
          SNH: trimmedHash,
          major: source2Data?.[0]?.Current_Major,
        },
        source2Scores: source2Courses
      }
    });

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 