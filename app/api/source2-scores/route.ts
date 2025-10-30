import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentHash } = body;

    if (!studentHash) {
      return NextResponse.json({ error: 'Student hash is required' }, { status: 400 })
    }

    const trimmedHash = studentHash.trim();

    if (!/^[a-f0-9]{64}$/i.test(trimmedHash)) {
      return NextResponse.json({ error: 'Invalid hash format' }, { status: 400 })
    }

    // 1. 获取来源2的数据（academic_results表）
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

    // 2. 获取courses表信息用于映射
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('course_id, course_name, semester, category, credit')
      .not('course_id', 'is', null);

    if (coursesError) {
      console.error('Courses error:', coursesError)
      return NextResponse.json({ error: 'Failed to fetch courses data' }, { status: 500 })
    }

    // 3. 创建课程编号到课程信息的映射
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

    // 4. 课程类型到类别的映射
    const courseTypeToCategoryMapping: Record<string, string> = {
      '思想政治理论课': '政治课程',
      '公共课': '公共课程',
      '专业课': '专业课程',
      '实践教学课': '实践课程',
      '校级双创课': '创新课程',
      '院级双创课': '创新课程',
      '其他': '基础学科'
    };

    // 5. 处理来源2数据
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
          source: 'academic_results',
          courseName: record.Course_Name,
          courseId: courseId,
          score: score,
          semester: courseInfo?.semester || record.Semester_Offered,
          category: courseTypeToCategoryMapping[record.Course_Type] || '基础学科',
          credit: courseInfo?.credit || parseFloat(record.Credit) || 0.1,
          courseType: record.Course_Type,
          courseAttribute: record.Course_Attribute,
          examType: record.Exam_Type,
          rawData: record
        });
      });
    }

    console.log('Source 2 courses found:', source2Courses.length);
    console.log('Courses with semester info:', source2Courses.filter(c => c.semester !== null).length);
    console.log('Courses with category info:', source2Courses.filter(c => c.category !== null).length);
    console.log('Courses with credit info:', source2Courses.filter(c => c.credit !== null).length);

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
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 