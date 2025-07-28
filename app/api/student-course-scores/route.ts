import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

    // 查询cohort_predictions表，获取第17-80列（具体课程成绩）
    const { data, error } = await supabase
      .from('cohort_predictions')
      .select(`
        SNH,
        major,
        year,
        "思想道德与法治",
        "中国近现代史纲要",
        "马克思主义基本原理",
        "毛泽东思想和中国特色社会主义理论体系概论",
        "形势与政策1",
        "形势与政策2",
        "形势与政策3",
        "形势与政策4",
        "形势与政策5",
        "习近平新时代中国特色社会主义思想概论",
        "体育基础",
        "军事理论",
        "大学生心理健康",
        "安全教育",
        "综合英语（上）",
        "综合英语（下）",
        "进阶听说（上）",
        "进阶听说（下）",
        "线性代数",
        "高等数学A(上)",
        "高等数学A(下)",
        "大学物理D（上）",
        "大学物理D（下）",
        "工程数学",
        "概率论与随机过程",
        "程序设计基础",
        "数据设计",
        "Java高级语言程序设计",
        "软件工程",
        "电子信息工程专业导论",
        "电子系统基础",
        "电子电路基础",
        "信号与系统",
        "数字电路设计",
        "数字信号处理",
        "计算机网络",
        "人工智能导论",
        "产品开发与管理",
        "电磁场与电磁波",
        "通信原理I",
        "多媒体基础",
        "数字音频基础",
        "信息论",
        "机器学习",
        "高级变换",
        "图形与视频处理",
        "交互式媒体设计",
        "3D图形程序设计",
        "深度学习与计算视觉",
        "军训",
        "思想道德与法治（实践环节）",
        "毛泽东思想和中国特色社会主义理论体系概论实",
        "物理实验C",
        "电路实验",
        "学术交流技能1",
        "学术交流技能2",
        "Design & Build实训（电子）",
        "通信原理实验",
        "电子工艺实习",
        "电子信息工程专业实习",
        "个人发展计划1",
        "个人发展计划2",
        "个人发展计划3",
        "毕业设计"
      `)
      .eq('SNH', trimmedHash)
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const studentData = data[0];
    
    // 获取学生专业信息
    const studentMajor = studentData.major;
    
    // 课程名称到课程编号的映射表（基于真实数据）
    const courseNameToIdMapping: Record<string, string> = {
      "思想道德与法治": "3322100012",
      "中国近现代史纲要": "3322100060",
      "马克思主义基本原理": "3322100021",
      "毛泽东思想和中国特色社会主义理论体系概论": "3322100082",
      "形势与政策1": "1052100010",
      "形势与政策2": "1052100020",
      "形势与政策3": "1052100030",
      "形势与政策4": "1052100040",
      "形势与政策5": "1052100050",
      "线性代数": "3412110079",
      "高等数学A(上)": "3412110019",
      "高等数学A(下)": "3412110029",
      "大学物理D（上）": "3412120019",
      "大学物理D（下）": "3412120029",
      "程序设计基础": "3132100090",
      "数据结构": "3132100090", // 假设与程序设计基础相同
      "Java高级语言程序设计": "3512142011",
      "软件工程": "3512163043",
      "电子信息工程专业导论": "3112191070",
      "电子电路基础": "3112190019",
      "信号与系统": "B304BY0010",
      "数字电路设计": "3512142023",
      "数字信号处理": "3512155023",
      "计算机网络": "3112191080",
      "人工智能导论": "3912120120",
      "电磁场与电磁波": "3122101058",
      "通信原理I": "3112100140",
      "机器学习": "3512152011",
      "3D图形程序设计": "3512154053",
      "军训": "2122110003",
      "物理实验C": "3412130049",
      "电路实验": "3122108005",
      "毕业设计": "3512165214"
    };

    // 查询courses表获取课程学期信息
    let courseIdToSemesterMap: Record<string, number | null> = {};
    if (studentMajor) {
      try {
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('course_id, course_name, semester')
          .eq('major', studentMajor);
        
        if (!coursesError && coursesData) {
          // 创建课程编号到学期的映射
          courseIdToSemesterMap = coursesData.reduce((acc, course) => {
            if (course.course_id) {
              acc[course.course_id] = course.semester;
            }
            return acc;
          }, {} as Record<string, number | null>);
          
          console.log('Course ID to semester mapping sample:', Object.entries(courseIdToSemesterMap).slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching course semesters:', error);
      }
    }
    
    // 将数据转换为更易处理的格式
    const courseScores = Object.entries(studentData)
      .filter(([key, value]) => key !== 'SNH' && key !== 'major' && key !== 'year')
      .map(([courseName, score]) => {
        // 使用映射表查找对应的课程编号
        const courseId = courseNameToIdMapping[courseName];
        const semester = courseId ? courseIdToSemesterMap[courseId] || null : null;
        
        return {
          courseName,
          score: score as number | null,
          semester
        };
      })
      .sort((a, b) => {
        // 1. 没有成绩的放在最后
        if (a.score === null && b.score === null) return 0;
        if (a.score === null) return 1;
        if (b.score === null) return -1;
        
        // 2. 有成绩的按学期从小到大排序
        const semesterA = a.semester || 999; // 没有学期信息的放在最后
        const semesterB = b.semester || 999;
        
        if (semesterA !== semesterB) {
          return semesterA - semesterB;
        }
        
        // 如果学期相同，按分数降序排列
        return b.score - a.score;
      });

    console.log(`Found ${courseScores.length} courses for student ${trimmedHash}`);
    console.log(`Courses with scores: ${courseScores.filter(c => c.score !== null).length}`);
    console.log(`Courses without scores: ${courseScores.filter(c => c.score === null).length}`);
    console.log(`Courses with semester info: ${courseScores.filter(c => c.semester !== null).length}`);
    
    // 显示没有学期信息的课程
    const coursesWithoutSemester = courseScores.filter(c => c.semester === null);
    if (coursesWithoutSemester.length > 0) {
      console.log('Courses without semester info:', coursesWithoutSemester.map(c => c.courseName));
    }

    return NextResponse.json({
      success: true,
      data: {
        studentInfo: {
          SNH: studentData.SNH,
          major: studentData.major,
          year: studentData.year
        },
        courseScores
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 