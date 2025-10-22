import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 课程名称过滤映射表（将简化的课程名映射为正确名称）
const courseNameFilterMapping: Record<string, string> = {
  "毛概": "毛泽东思想和中国特色社会主义理论体系概论",
  "毛概（实践环节）": "毛泽东思想和中国特色社会主义理论体系概论（实践环节）",
  "习概": "习近平新时代中国特色社会主义思想概论",
  "习概（实践环节）": "习近平新时代中国特色社会主义思想概论（实践环节）"
};


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentHash, major, studentNumber } = body;

    if (!studentHash) {
      return NextResponse.json({ error: 'Student hash is required' }, { status: 400 })
    }

    if (!studentNumber) {
      return NextResponse.json({ error: 'Student number is required' }, { status: 400 })
    }

    const trimmedHash = studentHash.trim();
    const trimmedStudentNumber = studentNumber.toString().trim();

    if (!/^[a-f0-9]{64}$/i.test(trimmedHash)) {
      return NextResponse.json({ error: 'Invalid hash format' }, { status: 400 })
    }

    // 从学号前四位提取年份（不限制格式）
    const year = parseInt(trimmedStudentNumber.substring(0, 4));
    
    // 验证年份合理性（2020-2050之间）
    if (year < 2020 || year > 2050) {
      return NextResponse.json({ error: 'Invalid year from student number' }, { status: 400 })
    }

    // 1) 确定专业对应的表后缀
    const majorToTableMapping: Record<string, string> = {
      '智能科学与技术': 'ai',
      '电子信息工程': 'ee',
      '电信工程及管理': 'tewm',
      '物联网工程': 'iot'
    };

    if (!major || !(major in majorToTableMapping)) {
      return NextResponse.json({ error: 'Invalid or unsupported major' }, { status: 400 })
    }

    const tableSuffix = majorToTableMapping[major];
    
    // 直接使用从学号提取的年份构建表名
    const tableName = `Cohort${year}_Predictions_${tableSuffix}`;
    //const tableName = `Cohort2024_Predictions_iot`;
    let predictionsData = null;
    let predictionsError = null;

    console.log('查询预测数据 - 专业:', major);
    console.log('查询预测数据 - 哈希值:', trimmedHash);
    console.log('查询预测数据 - 学号:', trimmedStudentNumber);
    console.log('查询预测数据 - 提取年份:', year);
    console.log('查询预测数据 - 表名:', tableName);
    
    // 直接查询指定年份的表
    const result = await supabase
      .from(tableName)
      .select('*')
      .eq('SNH', trimmedHash)
      .limit(1)
      .single();
    
    if (!result.error && result.data) {
      predictionsData = result.data;
      predictionsError = null;
      console.log('✅ 在表中找到学生数据:', tableName);
    } else {
      predictionsError = result.error;
      console.log('❌ 表中未找到学生:', tableName, result.error?.message || 'No data');
    }

    // 2) 检查是否在指定年份的cohort表中找到了学生数据
    if (predictionsError || !predictionsData) {
      console.error('❌ 学生预测数据缺失!');
      console.error('📊 在指定年份的cohort表中找不到该学生数据');
      console.error('🔍 尝试的表:', tableName);
      console.error('🔍 查询的哈希值:', trimmedHash);
      console.error('🎓 专业:', major);
      console.error('📅 学号:', trimmedStudentNumber);
      console.error('📅 提取年份:', year);
      console.error('💡 可能原因: 学生哈希值不在该年份的预测表中，或专业信息不匹配，或学号年份不正确');
      return NextResponse.json({ 
        error: `学生预测数据缺失: 在专业 "${major}" 的 ${year} 年预测表中找不到该学生数据`,
        details: {
          studentHash: trimmedHash,
          major: major,
          studentNumber: trimmedStudentNumber,
          extractedYear: year,
          triedTable: tableName,
          suggestion: '请检查学生哈希值、专业信息或学号是否正确'
        }
      }, { status: 404 })
    }

    console.log('✅ 成功找到学生数据，使用表:', tableName);

    // 2. 创建课程信息查询函数
    const getCourseInfo = async (courseName: string, year: number, major: string) => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('semester, category, credit')
          .eq('course_name', courseName)
          .eq('year', year)
          .eq('major', major)
          .limit(1)
          .single();
        
        if (error || !data) {
          console.log(`未找到课程信息: ${courseName}, 年份: ${year}, 专业: ${major}`);
          return null;
        }
        
        return {
          semester: data.semester,
          category: data.category,
          credit: data.credit
        };
      } catch (error) {
        console.log(`查询课程信息失败: ${courseName}`, error);
        return null;
      }
    };

    // 3. 构建课程成绩数据（过滤非课程字段，规范数值）
    const reservedKeys = new Set([
      'SNH', 'major', 'year', 'grade', 'count',
      'current_public','current_practice','current_math_science','current_political','current_basic_subject','current_innovation','current_english','current_basic_major','current_major','current_pred',
      'target1_min_required_score','target2_min_required_score',
      'current_prob1','current_prob2','current_prob3'
    ]);

    const courseScores = await Promise.all(
      Object.entries(predictionsData)
        .filter(([key]) => !reservedKeys.has(key))
        .map(async ([originalCourseName, raw]) => {
          let score: number | null = null;
          if (typeof raw === 'number') score = raw;
          else if (typeof raw === 'string' && raw.trim() !== '' && !isNaN(Number(raw))) score = Number(raw);

          // 先应用过滤映射表，将简化课程名映射为正确名称
          const filteredCourseName = courseNameFilterMapping[originalCourseName] || originalCourseName;
          
          // 使用课程名称、年份、专业查询课程信息
          const courseInfo = await getCourseInfo(filteredCourseName, year, major);

          return {
            courseName: filteredCourseName, // 使用过滤后的课程名称
            score,
            semester: courseInfo?.semester || null,
            category: courseInfo?.category || null,
            courseId: null, // 不再使用课程ID
            credit: courseInfo?.credit || 0.1
          };
        })
    );

    // 对课程成绩进行排序
    courseScores.sort((a, b) => {
      // 1. 没有成绩的放在最后
      if (a.score === null && b.score === null) return 0;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      
      // 2. 有成绩的按学期从小到大排序
      const semesterA = a.semester || 999;
      const semesterB = b.semester || 999;
      
      if (semesterA !== semesterB) {
        return semesterA - semesterB;
      }
      
      // 如果学期相同，按分数降序排列
      return b.score - a.score;
    });

    console.log('Processed courses:', courseScores.length);
    console.log('Courses with semester info:', courseScores.filter(c => c.semester !== null).length);
    console.log('Courses with category info:', courseScores.filter(c => c.category !== null).length);
    console.log('Courses with credit info:', courseScores.filter(c => c.credit !== null).length);

    return NextResponse.json({
      success: true,
      data: {
        studentInfo: {
          SNH: (predictionsData as any).SNH,
          major: (predictionsData as any).major || major,
          year: (predictionsData as any).year || (predictionsData as any).grade || null
        },
        courseScores
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}