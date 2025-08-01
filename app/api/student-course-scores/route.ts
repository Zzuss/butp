import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用硬编码的Supabase配置
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseKey)

// 辅助函数：从学期字符串中提取学期数字
function extractSemesterNumber(semesterStr: string | null): number | null {
  if (!semesterStr) return null;
  
  // 格式: "2020-2021-1" -> 1, "2020-2021-2" -> 2
  const match = semesterStr.match(/-(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

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

    // 2. 从academic_results表获取课程详细信息
    const courseNames = [
      '思想道德与法治', '中国近现代史纲要', '马克思主义基本原理', '毛泽东思想和中国特色社会主义理论体系概论',
      '形势与政策1', '形势与政策2', '形势与政策3', '形势与政策4', '形势与政策5', '习近平新时代中国特色社会主义思想概论',
      '体育基础', '军事理论', '大学生心理健康', '安全教育', '综合英语（上）', '综合英语（下）',
      '进阶听说（上）', '进阶听说（下）', '线性代数', '高等数学A(上)', '高等数学A(下)', '大学物理D（上）', '大学物理D（下）',
      '工程数学', '概率论与随机过程', '程序设计基础', '数据设计', 'Java高级语言程序设计', '软件工程',
      '电子信息工程专业导论', '电子系统基础', '电子电路基础', '信号与系统', '数字电路设计', '数字信号处理',
      '计算机网络', '人工智能导论', '产品开发与管理', '电磁场与电磁波', '通信原理I', '多媒体基础',
      '数字音频基础', '信息论', '机器学习', '高级变换', '图形与视频处理', '交互式媒体设计',
      '3D图形程序设计', '深度学习与计算视觉', '军训', '思想道德与法治（实践环节）',
      '毛泽东思想和中国特色社会主义理论体系概论实', '物理实验C', '电路实验', '学术交流技能1', '学术交流技能2',
      'Design & Build实训（电子）', '通信原理实验', '电子工艺实习', '电子信息工程专业实习',
      '个人发展计划1', '个人发展计划2', '个人发展计划3', '毕业设计'
    ];

    const { data: academicData, error: academicError } = await supabase
      .from('academic_results')
      .select('Course_Name, Course_ID, Course_Type, Credit, Semester_Offered')
      .in('Course_Name', courseNames);

    if (academicError) {
      console.error('Error fetching academic data:', academicError);
      return NextResponse.json({ error: 'Failed to fetch course information' }, { status: 500 })
    }

    // 3. 创建课程信息映射
    const courseInfoMap = new Map();
    if (academicData) {
      academicData.forEach(course => {
        if (!courseInfoMap.has(course.Course_Name)) {
          courseInfoMap.set(course.Course_Name, {
            courseId: course.Course_ID,
            category: course.Course_Type,
            credit: parseFloat(course.Credit || '0'),
            semester: extractSemesterNumber(course.Semester_Offered)
          });
        }
      });
    }

    // 4. 构建课程成绩数据
    const courseScores = Object.entries(predictionsData)
      .filter(([key, value]) => key !== 'SNH' && key !== 'major' && key !== 'year')
      .map(([courseName, score]) => {
        const courseInfo = courseInfoMap.get(courseName) || {
          courseId: null,
          category: null,
          credit: 0.1,
          semester: null
        };

        return {
          courseName,
          score: score as number | null,
          semester: courseInfo.semester,
          category: courseInfo.category,
          courseId: courseInfo.courseId,
          credit: courseInfo.credit
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