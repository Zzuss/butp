import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const studentData = data;

    // 课程名称到课程编号的映射
    const courseNameToIdMapping: Record<string, string> = {
      // 思想政治理论课
      "思想道德与法治": "2122100010",
      "中国近现代史纲要": "2122100020",
      "马克思主义基本原理": "2122100030",
      "毛泽东思想和中国特色社会主义理论体系概论": "2122100040",
      "形势与政策1": "2122100051",
      "形势与政策2": "2122100052",
      "形势与政策3": "2122100053",
      "形势与政策4": "2122100054",
      "形势与政策5": "2122100055",
      "习近平新时代中国特色社会主义思想概论": "2122100060",
      
      // 公共基础课
      "综合英语（上）": "2212100011",
      "综合英语（下）": "2212100012",
      "进阶听说（上）": "2212100021",
      "进阶听说（下）": "2212100022",
      "线性代数": "2312100010",
      "高等数学A(上)": "2312100021",
      "高等数学A(下)": "2312100022",
      "大学物理D（上）": "2312100031",
      "大学物理D（下）": "2312100032",
      "工程数学": "2312100040",
      "概率论与随机过程": "2312100050",
      
      // 专业基础课
      "程序设计基础": "2412100010",
      "数据设计": "2412100020",
      "Java高级语言程序设计": "2412100030",
      "软件工程": "2412100040",
      "电子信息工程专业导论": "2412100050",
      "电子系统基础": "2412100060",
      "电子电路基础": "2412100070",
      "信号与系统": "2412100080",
      "数字电路设计": "2412100090",
      "数字信号处理": "2412100100",
      "计算机网络": "2412100110",
      "人工智能导论": "2412100120",
      "产品开发与管理": "2412100130",
      "电磁场与电磁波": "2412100140",
      "通信原理I": "2412100150",
      
      // 专业核心课
      "多媒体基础": "2512100010",
      "数字音频基础": "2512100020",
      "信息论": "2512100030",
      "机器学习": "2512100040",
      "高级变换": "2512100050",
      "图形与视频处理": "2512100060",
      "交互式媒体设计": "2512100070",
      "3D图形程序设计": "2512100080",
      "深度学习与计算视觉": "2512100090",
      
      // 实践环节
      "军训": "3112100001",
      "思想道德与法治（实践环节）": "3122100010",
      "毛泽东思想和中国特色社会主义理论体系概论实": "3122100020",
      "物理实验C": "3122100030",
      "电路实验": "3122100040",
      "学术交流技能1": "3122100051",
      "学术交流技能2": "3122100052",
      "Design & Build实训（电子）": "3122106831",
      "通信原理实验": "3122100070",
      "电子工艺实习": "3122100080",
      "电子信息工程专业实习": "3512190007",
      
      // 其他课程
      "体育基础": "3812150010",
      "军事理论": "2122110002",
      "大学生心理健康": "2122120000",
      "安全教育": "2122100090",
      "个人发展计划1": "3512130011",
      "个人发展计划2": "3512140013",
      "个人发展计划3": "3512150011",
      "毕业设计": "3512165214"
    };

    // 查询courses表获取课程学期、类别和学分信息
    const courseIdToSemesterMap: Record<string, number | null> = {};
    const courseIdToCategoryMap: Record<string, string | null> = {};
    const courseIdToCreditMap: Record<string, number | null> = {};
    
    try {
      // 获取所有课程编号
      const allCourseIds = Object.values(courseNameToIdMapping);
      
      // 直接查询所有相关课程，不限制专业，包含学分信息
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select('course_id, course_name, semester, category, credit')
        .in('course_id', allCourseIds);
      
      if (!error && coursesData) {
        // 创建课程编号到学期、类别和学分的映射
        coursesData.forEach((course) => {
          if (course.course_id) {
            courseIdToSemesterMap[course.course_id] = course.semester;
            courseIdToCategoryMap[course.course_id] = course.category;
            courseIdToCreditMap[course.course_id] = course.credit;
          }
        });
      }
    } catch {
      // 静默处理错误
    }
    
    // 将数据转换为更易处理的格式
    const courseScores = Object.entries(studentData)
      .filter(([key, value]) => key !== 'SNH' && key !== 'major' && key !== 'year')
      .map(([courseName, score]) => {
        // 使用映射表查找对应的课程编号
        const courseId = courseNameToIdMapping[courseName];
        const semester = courseId ? courseIdToSemesterMap[courseId] || null : null;
        const category = courseId ? courseIdToCategoryMap[courseId] || null : null;
        const credit = courseId ? courseIdToCreditMap[courseId] || 0.1 : 0.1; // 默认0.1学分
        
        return {
          courseName,
          score: score as number | null,
          semester,
          category,
          courseId: courseId || null,
          credit
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 