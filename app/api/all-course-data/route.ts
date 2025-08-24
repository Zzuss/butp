import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFieldsByTable, validateTableFields } from '@/config/table-schemas'

// 使用环境变量配置 Supabase（用于 API 路由）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

// 在每次请求时创建新的客户端，避免连接问题
function createSupabaseClient() {
  // 添加环境变量检查和回退机制
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase环境变量未配置，使用硬编码配置作为回退');
  }
  
  try {
    return createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('❌ 创建Supabase客户端失败:', error);
    throw new Error('Failed to create Supabase client');
  }
}



export async function POST(request: NextRequest) {
  try {
    const { studentHash, modifiedScores, source2Scores } = await request.json()

    if (!studentHash) {
      return NextResponse.json({ error: 'Student hash is required' }, { status: 400 })
    }

    const trimmedHash = studentHash.trim();

    if (!/^[a-f0-9]{64}$/i.test(trimmedHash)) {
      return NextResponse.json({ error: 'Invalid hash format' }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    // 1. 获取来源1的数据（专业预测表）
    // 动态选择字段，避免字段不存在的错误
    const tableName = 'Cohort2023_Predictions_ee';
    const fields = getFieldsByTable(tableName);
    
    console.log(`🔍 查询表 ${tableName}，使用字段:`, fields.slice(0, 5), '...');
    
    // 验证字段是否实际存在于表中
    const validFields = await validateTableFields(supabase, tableName, fields);
    console.log(`✅ 验证后的有效字段数量: ${validFields.length}`);
    
    const { data: source1Data, error: source1Error } = await supabase
      .from(tableName)
      .select(validFields.join(', '))
      .eq('SNH', trimmedHash)
      .limit(1);

    if (source1Error) {
      console.error('❌ Source 1 error:', source1Error)
      console.error('❌ 数据库连接详情:', {
        url: supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        errorCode: source1Error.code,
        errorMessage: source1Error.message,
        errorDetails: source1Error.details
      })
      return NextResponse.json({ 
        error: 'Failed to fetch source 1 data',
        details: source1Error.message,
        code: source1Error.code
      }, { status: 500 })
    }

    // 2. 获取来源2的数据（使用前端传递的缓存数据或调用来源2 API）
    let source2Data = null;
    if (source2Scores && Array.isArray(source2Scores) && source2Scores.length > 0) {
      // 使用前端传递的来源二数据
      source2Data = source2Scores;
    } else {
      // 如果前端没有传递来源二数据，则调用来源2 API
      try {
        const source2Response = await fetch(`${request.nextUrl.origin}/api/source2-scores`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ studentHash: trimmedHash })
        });
        
        if (source2Response.ok) {
          const source2Result = await source2Response.json();
          if (source2Result.success) {
            source2Data = source2Result.data.source2Scores;
          }
        }
      } catch (error) {
        console.error('Error calling source2 API:', error);
        // 如果API调用失败，使用备用方案从数据库直接查询
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
          console.error('❌ Source 2 error:', source2Error)
          console.error('❌ 数据库连接详情:', {
            url: supabaseUrl,
            hasAnonKey: !!supabaseAnonKey,
            errorCode: source2Error.code,
            errorMessage: source2Error.message,
            errorDetails: source2Error.details
          })
          return NextResponse.json({ 
            error: 'Failed to fetch source 2 data',
            details: source2Error.message,
            code: source2Error.code
          }, { status: 500 })
        }
        source2Data = dbSource2Data;
      }
    }

    // 3. 获取courses表信息用于映射
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('course_id, course_name, semester, category, credit')
      .not('course_id', 'is', null);

    if (coursesError) {
      console.error('❌ Courses error:', coursesError)
      console.error('❌ 数据库连接详情:', {
        url: supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        errorCode: coursesError.code,
        errorMessage: coursesError.message,
        errorDetails: coursesError.details
      })
      return NextResponse.json({ 
        error: 'Failed to fetch courses data',
        details: coursesError.message,
        code: coursesError.code
      }, { status: 500 })
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

    // 来源2 课程类型到类别的映射表（来自模板route_1.ts）
    const source2CourseTypeToCategoryMapping: Record<string, string> = {
      '思想政治理论课': '政治课程',
      '公共课': '公共课程',
      '专业课': '专业课程',
      '实践教学课': '实践课程',
      '校级双创课': '创新课程',
      '院级双创课': '创新课程',
      '其他': '基础学科'
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
          source: '专业预测表',
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
          
          // 应用来源2的category映射
          const originalCategory = courseInfo?.category || null;
          const mappedCategory = originalCategory ? 
            source2CourseTypeToCategoryMapping[originalCategory] || '基础学科' : 
            (record.Course_Type ? source2CourseTypeToCategoryMapping[record.Course_Type] || '基础学科' : '基础学科');
          
          source2Courses.push({
            source: 'academic_results',
            courseName: record.Course_Name,
            courseId: courseId,
            score: score,
            semester: courseInfo?.semester || record.Semester_Offered,
            category: mappedCategory, // 使用映射后的category
            credit: courseInfo?.credit || parseFloat(record.Credit) || null,
            courseType: record.Course_Type,
            courseAttribute: record.Course_Attribute,
            examType: record.Exam_Type,
            rawData: record
          });
        }
      });
    }

         // 合并数据，按照新的规则：先来源2，再来源1
     const allCourses: any[] = [];
     const processedCourseNames = new Set<string>();

     // 第一步：先置入来源2的数据
     // 规则：如果来源2中成绩为0或不存在，则不置入总表
     source2Courses.forEach(course => {
       if (course.score !== null && course.score !== undefined && course.score !== 0) {
         allCourses.push(course);
         processedCourseNames.add(course.courseName);
       }
     });

     // 第二步：再置入来源1的数据
     // 规则：
     // 1. 如果来源1成绩与来源2冲突，用来源1成绩覆盖
     // 2. 如果来源1成绩为null，不置入
     // 3. 如果来源1成绩为0，要置入总表
     source1Courses.forEach(course => {
       if (course.score !== null && course.score !== undefined) { // 成绩不为null才处理
         const existingIndex = allCourses.findIndex(c => c.courseName === course.courseName);
         
         if (existingIndex >= 0) {
           // 冲突情况：用来源1成绩覆盖
           allCourses[existingIndex] = {
             ...allCourses[existingIndex],
             score: course.score,
             source: '专业预测表 (覆盖)'
           };
         } else {
           // 新课程：直接添加
           allCourses.push({
             ...course,
             source: '专业预测表'
           });
           processedCourseNames.add(course.courseName);
         }
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