import { NextRequest, NextResponse } from 'next/server'
import { queryAcademicResults, getFromCache, type AcademicResultRecord } from '@/lib/academic__data'

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

    // 1. 优先从统一缓存获取数据（方案A：统一数据源）
    // 只需要 semester、course_name、category、credit 和 grade 字段，缓存中已包含
    const unifiedCacheKey = `academic_results_data_${trimmedHash}`;
    let cachedAcademicData = getFromCache<AcademicResultRecord[]>(unifiedCacheKey);
    
    let source2Data: AcademicResultRecord[] = [];
    
    if (cachedAcademicData) {
      console.log('从统一缓存获取学术成绩数据，记录数量:', cachedAcademicData.length);
      source2Data = cachedAcademicData;
    } else {
      // 缓存未命中，调用统一查询函数
      console.log('统一缓存未命中，调用 queryAcademicResults 查询数据');
      source2Data = await queryAcademicResults(trimmedHash);
    }
    
    // 按学期排序
    source2Data.sort((a, b) => {
      const semesterA = a.Semester_Offered || '';
      const semesterB = b.Semester_Offered || '';
      return semesterA.localeCompare(semesterB);
    });

    // 2. 直接从缓存中复制所需字段，不进行任何改动或映射
    const source2Courses: any[] = [];
    if (source2Data) {
      source2Data.forEach((record: AcademicResultRecord) => {
        // 转换成绩格式（仅做基本类型转换，确保是数字）
        let score = null;
        if (record.Grade !== null && record.Grade !== undefined) {
          if (typeof record.Grade === 'number') {
            score = record.Grade;
          } else {
            const gradeStr = record.Grade.toString();
            if (gradeStr.includes('.')) {
              score = parseFloat(gradeStr);
            } else {
              score = parseInt(gradeStr);
            }
          }
        }
        
        // 转换学分格式（仅做基本类型转换，确保是数字）
        let credit = null;
        if (record.Credit !== null && record.Credit !== undefined) {
          if (typeof record.Credit === 'number') {
            credit = record.Credit;
          } else {
            credit = parseFloat(String(record.Credit)) || null;
          }
        }
        
        source2Courses.push({
          source: 'academic_results',
          courseName: record.Course_Name,        // 直接复制
          courseId: record.Course_ID,            // 直接复制
          score: score,                          // 仅做基本类型转换
          semester: record.Semester_Offered,    // 直接复制
          category: record.Course_Type,          // 直接复制，不映射
          credit: credit,                        // 仅做基本类型转换
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