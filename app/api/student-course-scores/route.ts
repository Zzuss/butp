import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用硬编码的Supabase配置
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseKey)

// 课程名称到课程编号的映射表（基于模板中的完整映射表）
const courseNameToIdMapping: Record<string, string> = {
  // 政治理论课程
  "思想道德与法治": "3322100012",
  "中国近现代史纲要": "3322100060",
  "马克思主义基本原理": "3322100021",
  "毛泽东思想和中国特色社会主义理论体系概论": "3322100082",
  "习近平新时代中国特色社会主义思想概论": "3322100091",
  "形势与政策1": "1052100010",
  "形势与政策2": "1052100020",
  "形势与政策3": "1052100030",
  "形势与政策4": "1052100040",
  "形势与政策5": "1052100050",
  "思想道德与法治（实践环节）": "3322100013",
  "毛泽东思想和中国特色社会主义理论体系概论实": "3322100083",
  
  // 基础课程
  "线性代数": "3412110079",
  "高等数学A(上)": "3412110019",
  "高等数学A(下)": "3412110029",
  "大学物理D（上）": "3412120019",
  "大学物理D（下）": "3412120029",
  "工程数学": "3412110129",
  "概率论与随机过程": "3412110099",
  
  // 英语课程
  "综合英语（上）": "3312110316",
  "综合英语（下）": "3312110326",
  "进阶听说（上）": "3312110336",
  "进阶听说（下）": "3312110346",
  
  // 计算机课程
  "程序设计基础": "3132100090",
  "数据设计": "3512156011",
  "Java高级语言程序设计": "3512142011",
  "软件工程": "3512163043",
  
  // 专业基础课程
  "电子信息工程专业导论": "3112191070",
  "电子系统基础": "3112191110",
  "电子电路基础": "3112190019",
  "信号与系统": "B304BY0010",
  "数字电路设计": "3512142023",
  "数字信号处理": "3512155023",
  "计算机网络": "3112191080",
  "人工智能导论": "3912120120",
  "电磁场与电磁波": "3122101058",
  "通信原理I": "3112100140",
  "机器学习": "3512152011",
  
  // 专业课程
  "产品开发与管理": "3512156071",
  "多媒体基础": "3512153031",
  "数字音频基础": "3512159421",
  "信息论": "3112191960",
  "高级变换": "3512171801",
  "图形与视频处理": "3512162301",
  "交互式媒体设计": "3512153051",
  "3D图形程序设计": "3512154053",
  "深度学习与计算视觉": "3512172411",
  
  // 实践课程
  "军训": "2122110003",
  "物理实验C": "3412130049",
  "电路实验": "3122108005",
  "通信原理实验": "3112100990",
  "电子工艺实习": "3112199020",
  "Design & Build实训（电子）": "3122106831",
  "电子信息工程专业实习": "3512190007",
  
  // 其他课程
  "体育基础": "3812150010",
  "军事理论": "2122110002",
  "大学生心理健康": "2122120000",
  "安全教育": "2122100090",
  "学术交流技能1": "3312110219",
  "学术交流技能2": "3312110229",
  "个人发展计划1": "3512130011",
  "个人发展计划2": "3512140013",
  "个人发展计划3": "3512150011",
  "毕业设计": "3512165214"
};

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

    // 1. 从cohort_predictions表获取学生成绩数据
    const { data: predictionsData, error: predictionsError } = await supabase
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

    if (predictionsError || !predictionsData) {
      return NextResponse.json({ error: 'Student not found in predictions table' }, { status: 404 })
    }

    // 2. 从courses表获取课程详细信息
    // 获取所有在映射表中的课程ID
    const courseIds = Object.values(courseNameToIdMapping);
    
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('course_id, course_name, semester, category, credit')
      .in('course_id', courseIds);

    if (coursesError) {
      console.error('Error fetching courses data:', coursesError);
      return NextResponse.json({ error: 'Failed to fetch course information' }, { status: 500 })
    }

    // 3. 创建课程ID到课程信息的映射
    const courseIdToInfoMap: Record<string, any> = {};
    if (coursesData) {
      coursesData.forEach(course => {
        if (course.course_id) {
          courseIdToInfoMap[course.course_id] = {
            semester: course.semester,
            category: course.category,
            credit: course.credit
          };
        }
      });
    }

    console.log('Found courses in database:', coursesData?.length || 0);
    console.log('Course IDs in mapping:', courseIds.length);

    // 4. 构建课程成绩数据
    const courseScores = Object.entries(predictionsData)
      .filter(([key, value]) => key !== 'SNH' && key !== 'major' && key !== 'year')
      .map(([courseName, score]) => {
        // 使用映射表获取课程ID
        const courseId = courseNameToIdMapping[courseName];
        const courseInfo = courseId ? courseIdToInfoMap[courseId] : null;

        return {
          courseName,
          score: score as number | null,
          semester: courseInfo?.semester || null,
          category: courseInfo?.category || null,
          courseId: courseId || null,
          credit: courseInfo?.credit || null
        };
      })
      .sort((a, b) => {
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
          SNH: predictionsData.SNH,
          major: predictionsData.major,
          year: predictionsData.year
        },
        courseScores
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}