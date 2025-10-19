import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { studentHash, modifiedScores, source2Scores } = await request.json()

    // 1. 验证输入数据
    if (!studentHash) {
      return NextResponse.json({ error: 'Student hash is required' }, { status: 400 })
    }

    if (!modifiedScores || !Array.isArray(modifiedScores)) {
      return NextResponse.json({ error: 'Modified scores are required and must be an array' }, { status: 400 })
    }

    if (!source2Scores || !Array.isArray(source2Scores)) {
      return NextResponse.json({ error: 'Source2 scores are required and must be an array' }, { status: 400 })
    }

    const trimmedHash = studentHash.trim();

    if (!/^[a-f0-9]{64}$/i.test(trimmedHash)) {
      return NextResponse.json({ error: 'Invalid hash format' }, { status: 400 })
    }

    console.log(`🔍 开始整合数据，学生: ${trimmedHash.slice(0, 8)}...`)
    console.log(`📊 来源1数据数量: ${modifiedScores.length}`)
    console.log(`📊 来源2数据数量: ${source2Scores.length}`)

    // 2. 处理来源2数据（直接使用前端传递的缓存数据）
    let source2Data = source2Scores;
    console.log(`✅ 来源2数据已从缓存获取，数量: ${source2Data.length}`)

    // 3. 课程信息映射（使用硬编码映射表）
    console.log(`🔍 使用硬编码映射表获取课号...`)

    // 来源1 category 到9个特征值的映射表
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

    // 来源2 课程类型到类别的映射表
    const source2CourseTypeToCategoryMapping: Record<string, string> = {
      '思想政治理论课': '政治课程',
      '公共课': '公共课程',
      '专业课': '专业课程',
      '实践教学课': '实践课程',
      '校级双创课': '创新课程',
      '院级双创课': '创新课程',
      '其他': '基础学科'
    };

    // 课程名称到课程编号的映射表（四个专业完整版）
    const courseNameToIdMapping: Record<string, string> = {
      // ===== 政治理论课程 =====
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
      
      // ===== 数学与自然科学基础 =====
      "线性代数": "3412110079",
      "高等数学A(上)": "3412110019",
      "高等数学A(下)": "3412110029",
      "高等数学B(上)": "3412110039",
      "高等数学B(下)": "3412110049",
      "高等数学C(上)": "3412110059",
      "高等数学C(下)": "3412110069",
      "大学物理D（上）": "3412120019",
      "大学物理D（下）": "3412120029",
      "大学物理E（上）": "3412120039",
      "大学物理E（下）": "3412120049",
      "工程数学": "3412110129",
      "概率论与随机过程": "3412110099",
      "复变函数与积分变换": "3412110109",
      "数学建模": "3412110119",
      "物理实验C": "3412130049",
      "物理实验D": "3412130059",
      
      // ===== 英语课程 =====
      "综合英语（上）": "3312110316",
      "综合英语（下）": "3312110326",
      "进阶听说（上）": "3312110336",
      "进阶听说（下）": "3312110346",
      "学术英语": "3312110356",
      "专业英语": "3312110366",
      "英语口语": "3312110376",
      "英语写作": "3312110386",
      
      // ===== 计算机基础课程 =====
      "程序设计基础": "3132100090",
      "数据结构": "3132100100",
      "算法设计与分析": "3132100110",
      "计算机组成原理": "3132100120",
      "操作系统": "3132100130",
      "数据库原理": "3132100140",
      "计算机网络原理": "3132100150",
      "软件工程": "3512163043",
      "数据设计": "3512156011",
      "Java高级语言程序设计": "3512142011",
      "C++程序设计": "3512142021",
      "Python程序设计": "3512142031",
      "Web开发技术": "3512142041",
      "移动应用开发": "3512142051",
      
      // ===== 电子信息工程专业课程 =====
      "电子信息工程专业导论": "3112191070",
      "电子系统基础": "3112191110",
      "电子电路基础": "3112190019",
      "模拟电子技术": "3112190029",
      "数字电子技术": "3112190039",
      "信号与系统": "B304BY0010",
      "数字信号处理": "3512155023",
      "通信原理I": "3112100140",
      "通信原理II": "3112100150",
      "电磁场与电磁波": "3122101058",
      "天线与电波传播": "3122101068",
      "微波技术": "3122101078",
      "光纤通信": "3122101088",
      "移动通信": "3122101098",
      "卫星通信": "3122101108",
      "数字电路设计": "3512142023",
      "VLSI设计": "3512142033",
      "嵌入式系统设计": "3512142043",
      "FPGA设计": "3512142053",
      "电路实验": "3122108005",
      "通信原理实验": "3112100990",
      "电子工艺实习": "3112199020",
      "Design & Build实训（电子）": "3122106831",
      "电子信息工程专业实习": "3512190007",
      
      // ===== 计算机科学与技术专业课程 =====
      "计算机科学导论": "3212191070",
      "离散数学": "3212190019",
      "数字逻辑": "3212190029",
      "计算机体系结构": "3212190039",
      "编译原理": "3212190049",
      "软件测试": "3212190059",
      "软件项目管理": "3212190069",
      "计算机科学专业实习": "3512190008",
      
      // ===== 物联网工程专业课程 =====
      "物联网工程导论": "3312191070",
      "传感器技术": "3312190019",
      "RFID技术": "3312190029",
      "无线传感器网络": "3312190039",
      "物联网安全": "3312190049",
      "物联网应用开发": "3312190059",
      "智能家居系统": "3312190069",
      "工业物联网": "3312190079",
      "物联网工程专业实习": "3512190009",
      
      // ===== 人工智能专业课程 =====
      "人工智能导论": "3912120120",
      "机器学习": "3512152011",
      "深度学习": "3512152021",
      "神经网络": "3512152031",
      "计算机视觉": "3512152041",
      "自然语言处理": "3512152051",
      "知识表示与推理": "3512152061",
      "专家系统": "3512152071",
      "智能机器人": "3512152081",
      "人工智能专业实习": "3512190010",
      
      // ===== 专业基础课程 =====
      "计算机网络": "3112191080",
      "信息安全": "3112191090",
      "数字图像处理": "3512152091",
      "模式识别": "3512152101",
      "数据挖掘": "3512152111",
      "信息论": "3112191960",
      "编码理论": "3112191970",
      "现代通信技术": "3112191980",
      
      // ===== 专业课程 =====
      "产品开发与管理": "3512156071",
      "多媒体基础": "3512153031",
      "数字音频基础": "3512159421",
      "高级变换": "3512171801",
      "图形与视频处理": "3512162301",
      "交互式媒体设计": "3512153051",
      "3D图形程序设计": "3512154053",
      "深度学习与计算视觉": "3512172411",
      "虚拟现实技术": "3512153061",
      "增强现实技术": "3512153071",
      "游戏开发": "3512153081",
      "数字媒体技术": "3512153091",
      
      // ===== 实践课程 =====
      "军训": "2122110003",
      "毕业设计": "3512165214",
      
      // ===== 公共课程 =====
      "体育基础": "3812150010",
      "军事理论": "2122110002",
      "大学生心理健康": "2122120000",
      "安全教育": "2122100090",
      "学术交流技能1": "3312110219",
      "学术交流技能2": "3312110229",
      "个人发展计划1": "3512130011",
      "个人发展计划2": "3512140013",
      "个人发展计划3": "3512150011",
      "创新创业基础": "3512152121",
      "创新思维与方法": "3512152131",
      "创业实践": "3512152141",
      
      // ===== 素质教育课程 =====
      "人文社科类": "3512152151",
      "艺术类": "3512152161",
      "理工类": "3512152171",
      "创新创业类": "3512152181",
      "社会实践": "3512152191",
      "志愿服务": "3512152201"
    };

    // 处理来源1数据（使用前端传递的修改数据）
    const source1Courses: any[] = [];
    if (modifiedScores && Array.isArray(modifiedScores) && modifiedScores.length > 0) {
      modifiedScores.forEach((course: any) => {
        // 当前成绩就是修改后的成绩
        const currentScore = typeof course.score === 'string' ? parseFloat(course.score) : course.score;
        
        // 应用来源1的category映射（直接从course.category获取）
        const originalCategory = course.category || null;
        const mappedCategory = originalCategory ? source1CategoryToFeatureMapping[originalCategory] || '基础学科' : '基础学科';
        
        source1Courses.push({
          source: '专业预测表',
          courseName: course.courseName,
          score: currentScore,
          semester: course.semester || null,
          category: mappedCategory, // 使用映射后的category
          credit: course.credit || null,
          rawData: course
        });
      });
    }
    
    console.log(`✅ 来源1数据处理完成，课程数量: ${source1Courses.length}`)

    // 添加缓存信息到响应中
    const cacheInfo = {
      hasModifications: modifiedScores && Array.isArray(modifiedScores) && modifiedScores.length > 0,
      modifiedCoursesCount: modifiedScores && Array.isArray(modifiedScores) ? modifiedScores.length : 0,
      cacheKey: `${trimmedHash}_${modifiedScores && Array.isArray(modifiedScores) && modifiedScores.length > 0 ? 
        btoa(unescape(encodeURIComponent(JSON.stringify(modifiedScores)))).slice(0, 8) : 'original'}`
    };

    // 处理来源2数据（使用硬编码映射表获取课号）
    const source2Courses: any[] = [];
    if (source2Data) {
      source2Data.forEach((record: any) => {
        // 前端传递的数据已经格式化，直接使用
        if (record.source === 'academic_results') {
          source2Courses.push(record);
        } else {
          // 如果数据格式不标准，进行基本转换
          let score = null;
          if (record.Grade || record.score) {
            const gradeStr = (record.Grade || record.score).toString();
            if (gradeStr.includes('.')) {
              score = parseFloat(gradeStr);
            } else {
              score = parseInt(gradeStr);
            }
          }
          
          const courseName = record.Course_Name || record.courseName;
          // 优先使用硬编码映射表的课号，如果没有则使用原始数据
          const courseId = courseNameToIdMapping[courseName] || record.Course_ID || record.courseId;
          
          source2Courses.push({
            source: 'academic_results',
            courseName: courseName,
            courseId: courseId, // 使用硬编码映射表的课号
            score: score,
            semester: record.Semester_Offered || record.semester,
            category: record.category || '基础学科',
            credit: record.Credit || record.credit,
            courseType: record.Course_Type || record.courseType,
            courseAttribute: record.Course_Attribute || record.courseAttribute,
            examType: record.Exam_Type || record.examType,
            rawData: record
          });
        }
      });
    }
    
    console.log(`✅ 来源2数据处理完成，课程数量: ${source2Courses.length}`)

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

    console.log(`✅ 数据整合完成，总课程数: ${allCourses.length}`)
    
    return NextResponse.json({
      success: true,
      data: {
        studentInfo: {
          SNH: trimmedHash,
          major: source2Data?.[0]?.Current_Major || source2Data?.[0]?.currentMajor,
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
        courseMapping: courseNameToIdMapping, // 恢复使用硬编码映射表
        courseInfo: {}, // 不再需要courseIdToInfoMap
        cacheInfo: cacheInfo
      }
    });

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 