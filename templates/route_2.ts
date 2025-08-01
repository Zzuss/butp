import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 在每次请求时创建新的客户端，避免连接问题
function createSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    // 检查环境变量
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { studentHash, modifiedScores, source2Scores } = await request.json()

    if (!studentHash) {
      return NextResponse.json({ error: 'Student hash is required' }, { status: 400 })
    }

    const trimmedHash = studentHash.trim();

    if (!/^[a-f0-9]{64}$/i.test(trimmedHash)) {
      return NextResponse.json({ error: 'Invalid hash format' }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    // 1. 获取来源1的数据（cohort_predictions表）
    const { data: source1Data, error: source1Error } = await supabase
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

    if (source1Error) {
      console.error('Source 1 error:', source1Error)
      return NextResponse.json({ error: 'Failed to fetch source 1 data' }, { status: 500 })
    }

    // 2. 获取来源2的数据（使用前端传递的缓存数据）
    let source2Data = null;
    if (source2Scores && Array.isArray(source2Scores) && source2Scores.length > 0) {
      // 使用前端传递的来源二数据
      source2Data = source2Scores;
    } else {
      // 如果前端没有传递来源二数据，则从数据库查询（备用方案）
      const { data: dbSource2Data, error: source2Error } = await supabase
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
      source2Data = dbSource2Data;
    }

    // 3. 获取courses表信息用于映射
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

    // 来源1 category 到9个特征值的映射表
    // 注意：如果需要添加新的课程类别或修改映射关系，需要手动更新这个映射表
    const source1CategoryToFeatureMapping: Record<string, string> = {
      // 公共课程
      '公共课': '公共课程',
      '素质教育': '公共课程',
      '素质教育-人文社科类': '公共课程',
      '素质教育-理工类': '公共课程',
      '素质教育-艺术类': '公共课程',
      '体育': '公共课程',
      '体育、美育': '公共课程',
      '体育专项课': '公共课程',
      '体育类': '公共课程',
      '体育课等': '公共课程',
      '安全教育': '公共课程',
      '其他': '公共课程',
      '心理健康': '公共课程',
      '军事理论': '公共课程',
      
      // 实践课程
      '实践教学': '实践课程',
      '实践教学课': '实践课程',
      
      // 数学科学
      '数学与自然科学': '数学科学',
      
      // 政治课程
      '思想政治理论': '政治课程',
      '思想政治理论课': '政治课程',
      
      // 基础学科
      '数学与自然科学基础': '基础学科',
      '计算机基础': '基础学科',
      
      // 创新课程
      '校级创新创业课程': '创新课程',
      '校级双创课': '创新课程',
      '院级双创课': '创新课程',
      '学院特色创新5学分': '创新课程',
      '学院特色创新6学分': '创新课程',
      '学院特色创新学分（5学分)': '创新课程',
      '学院特色创新必修3学分': '创新课程',
      '学院特色创新必修5学分': '创新课程',
      
      // 英语课程
      '外语': '英语课程',
      '英语': '英语课程',
      
      // 基础专业
      '专业基础': '基础专业',
      '专业课基础': '基础专业',
      '学科基础': '基础专业',
      
      // 专业课程
      '专业课': '专业课程',
      '叶培大学院辅修': '专业课程'
    };

    // 课程名称到课程编号的映射表（基于真实数据）
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

    // 处理来源1数据（使用前端传递的修改数据）
    const source1Courses: any[] = [];
    if (modifiedScores && Array.isArray(modifiedScores) && modifiedScores.length > 0) {
      modifiedScores.forEach((course: any) => {
        const courseId = courseNameToIdMapping[course.courseName];
        const courseInfo = courseId ? courseIdToInfoMap[courseId] : null;
        
        // 当前成绩就是修改后的成绩
        const currentScore = typeof course.score === 'string' ? parseFloat(course.score) : course.score;
        
        // 应用来源1的category映射
        const originalCategory = course.category || courseInfo?.category || null;
        const mappedCategory = originalCategory ? source1CategoryToFeatureMapping[originalCategory] || '基础学科' : '基础学科';
        
        source1Courses.push({
          source: 'cohort_predictions',
          courseName: course.courseName,
          courseId: courseId || null,
          score: currentScore,
          semester: course.semester || courseInfo?.semester || null,
          category: mappedCategory, // 使用映射后的category
          credit: course.credit || courseInfo?.credit || null,
          rawData: course
        });
      });
    }

    // 添加缓存信息到响应中
    const cacheInfo = {
      hasModifications: modifiedScores && Array.isArray(modifiedScores) && modifiedScores.length > 0,
      modifiedCoursesCount: modifiedScores && Array.isArray(modifiedScores) ? modifiedScores.length : 0,
      cacheKey: `${trimmedHash}_${modifiedScores && Array.isArray(modifiedScores) && modifiedScores.length > 0 ? 
        btoa(unescape(encodeURIComponent(JSON.stringify(modifiedScores)))).slice(0, 8) : 'original'}`
    };

    // 处理来源2数据
    const source2Courses: any[] = [];
    if (source2Data) {
      source2Data.forEach((record: any) => {
        // 如果是从前端传递的数据，直接使用
        if (record.source === 'academic_results') {
          source2Courses.push(record);
        } else {
          // 如果是从数据库查询的数据，需要转换格式
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
            category: courseInfo?.category || null,
            credit: courseInfo?.credit || parseFloat(record.Credit) || null,
            courseType: record.Course_Type,
            courseAttribute: record.Course_Attribute,
            examType: record.Exam_Type,
            rawData: record
          });
        }
      });
    }

    // 合并数据，来源1优先，按细化规则过滤
    const allCourses: any[] = [];
    const processedCourseNames = new Set<string>();

    // 先添加来源1的数据
    // 规则：修改为0分的记录在总表，暂无成绩的不记录
    source1Courses.forEach(course => {
      if (course.score !== null && course.score !== undefined) { // 有成绩就记录（包括0分）
        allCourses.push(course);
        processedCourseNames.add(course.courseName);
      }
    });

    // 添加来源2中未在来源1中出现的课程
    // 规则：无论什么原因，只要没有成绩或成绩为0，都不记录
    source2Courses.forEach(course => {
      if (!processedCourseNames.has(course.courseName) && 
          course.score !== null && 
          course.score !== undefined && 
          course.score !== 0) { // 有成绩且不为0分才记录
        allCourses.push(course);
        processedCourseNames.add(course.courseName);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        studentInfo: {
          SNH: trimmedHash,
          major: source2Data?.[0]?.Current_Major,
          year: null
        },
        summary: {
          totalCourses: allCourses.length,
          source1Count: source1Courses.length,
          source2Count: source2Courses.length,
          uniqueCourses: processedCourseNames.size
        },
        source1Data: source1Courses,
        source2Data: source2Courses,
        allCourses: allCourses,
        courseMapping: courseNameToIdMapping,
        courseInfo: courseIdToInfoMap,
        cacheInfo: cacheInfo
      }
    });

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 