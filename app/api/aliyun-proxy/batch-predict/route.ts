import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * 阿里云批量预测API代理
 * 处理包含多个专业学生的成绩文件，按专业分组后分别调用预测
 */

const ALIYUN_SERVER = process.env.NEXT_PUBLIC_PREDICTION_API_URL || 'http://8.152.102.160:8080';

// 专业配置
const MAJOR_CONFIGS: { [key: string]: any } = {
  '2021': {
    majors: ['物联网工程', '电信工程及管理', '电子商务及法律']
  },
  '2022': {
    majors: ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程']
  },
  '2023': {
    majors: ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程']
  },
  '2024': {
    majors: ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程']
  }
};

// 专业代码映射
const MAJOR_CODE_MAP: { [key: string]: string } = {
  '智能科学与技术': 'ai',
  '电子信息工程': 'ee',
  '物联网工程': 'iot',
  '电信工程及管理': 'tewm',
  '电子商务及法律': 'ebl'
};

interface MajorGroupData {
  major: string;
  students: any[];
  fileName: string;
}

// 按专业分组学生数据
function groupStudentsByMajor(data: any[], year: string): MajorGroupData[] {
  const config = MAJOR_CONFIGS[year];
  if (!config) {
    throw new Error(`不支持的年级: ${year}`);
  }

  const majorGroups: { [major: string]: any[] } = {};
  
  // 初始化各专业分组
  config.majors.forEach((major: string) => {
    majorGroups[major] = [];
  });

  // 分组学生数据
  data.forEach(student => {
    const currentMajor = student.Current_Major || student['专业'] || '';
    
    // 查找匹配的专业（支持模糊匹配）
    let targetMajor = null;
    for (const major of config.majors) {
      if (currentMajor.includes(major) || major.includes(currentMajor)) {
        targetMajor = major;
        break;
      }
    }
    
    if (targetMajor && majorGroups[targetMajor]) {
      majorGroups[targetMajor].push(student);
    } else {
      console.warn(`学生专业不匹配: ${currentMajor}`);
    }
  });

  // 转换为数组格式
  const result: MajorGroupData[] = [];
  Object.entries(majorGroups).forEach(([major, students]) => {
    if (students.length > 0) {
      const majorCode = MAJOR_CODE_MAP[major] || major.toLowerCase();
      result.push({
        major,
        students,
        fileName: `Cohort${year}_${majorCode}_scores.xlsx`
      });
    }
  });

  return result;
}

// 生成专业Excel文件
function generateMajorExcel(majorData: MajorGroupData): Buffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(majorData.students);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Scores');
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// 调用阿里云预测API
async function callAliyunPrediction(majorData: MajorGroupData, config: any = {}): Promise<any> {
  try {
    console.log(`[批量预测] 开始预测专业: ${majorData.major} (${majorData.students.length}名学生)`);
    
    const excelBuffer = generateMajorExcel(majorData);
    
    const formData = new FormData();
    const excelBlob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    formData.append('scores_file', excelBlob, majorData.fileName);
    formData.append('major', majorData.major);
    formData.append('config', JSON.stringify({
      min_grade: config.min_grade || 60,
      max_grade: config.max_grade || 90,
      with_uniform_inverse: config.with_uniform_inverse || 1
    }));

    const response = await fetch(`${ALIYUN_SERVER}/api/predict`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NextJS-BatchProxy/1.0',
      },
    });

    console.log(`[批量预测] ${majorData.major} API响应状态: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`预测失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // 先获取原始文本，然后处理无效的JSON值
    const responseText = await response.text();
    console.log(`[批量预测] ${majorData.major} 原始响应长度: ${responseText.length} 字符`);
    
    let result;
    try {
      // 直接尝试解析JSON
      result = JSON.parse(responseText);
    } catch (jsonError) {
      console.log(`[批量预测] ${majorData.major} JSON解析失败，尝试修复...`);
      
      // 修复常见的无效JSON值
      let fixedText = responseText
        .replace(/:\s*NaN\b/g, ': null')          // NaN -> null
        .replace(/:\s*Infinity\b/g, ': null')     // Infinity -> null
        .replace(/:\s*-Infinity\b/g, ': null')    // -Infinity -> null
        .replace(/:\s*undefined\b/g, ': null');   // undefined -> null
      
      try {
        result = JSON.parse(fixedText);
        console.log(`[批量预测] ${majorData.major} JSON修复成功`);
      } catch (fixError) {
        console.error(`[批量预测] ${majorData.major} JSON修复失败:`, fixError);
        console.log(`[批量预测] ${majorData.major} 问题响应片段:`, responseText.substring(0, 500));
        throw new Error(`JSON解析失败: ${fixError.message}`);
      }
    }
    
    console.log(`[批量预测] ${majorData.major} 预测完成`);
    
    return {
      success: true,
      major: majorData.major,
      studentCount: majorData.students.length,
      result: result.data || result,
      fileName: majorData.fileName
    };

  } catch (error) {
    console.error(`[批量预测] ${majorData.major} 预测失败:`, error);
    return {
      success: false,
      major: majorData.major,
      studentCount: majorData.students.length,
      error: error.message,
      fileName: majorData.fileName
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('scores_file') as File;
    const year = formData.get('year') as string;
    const maxConcurrent = parseInt(formData.get('maxConcurrent') as string) || 2;
    const configStr = formData.get('config') as string;
    
    let config = {};
    if (configStr) {
      try {
        config = JSON.parse(configStr);
      } catch (error) {
        console.warn('配置参数解析失败，使用默认配置');
      }
    }

    if (!file) {
      return NextResponse.json({ error: '请选择成绩文件' }, { status: 400 });
    }

    if (!year || !MAJOR_CONFIGS[year]) {
      return NextResponse.json({ error: `不支持的年级: ${year}` }, { status: 400 });
    }

    console.log(`[批量预测] 开始处理 ${year} 级成绩文件: ${file.name}`);

    // 读取Excel文件
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      return NextResponse.json({ error: 'Excel文件中没有找到工作表' }, { status: 400 });
    }

    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`[批量预测] 读取到 ${data.length} 条学生记录`);

    // 按专业分组
    const majorGroups = groupStudentsByMajor(data, year);
    console.log(`[批量预测] 分组结果: ${majorGroups.length} 个专业`);
    
    majorGroups.forEach(group => {
      console.log(`  - ${group.major}: ${group.students.length} 名学生`);
    });

    if (majorGroups.length === 0) {
      return NextResponse.json({ 
        error: '未找到有效的专业数据，请检查文件格式和专业字段' 
      }, { status: 400 });
    }

    const batchId = `batch_${Date.now()}`;
    console.log(`[批量预测] 开始并行预测，批次ID: ${batchId}，并发数: ${maxConcurrent}`);

    // 并行处理预测
    const results: any[] = [];
    const errors: any[] = [];
    const processPromises: Promise<void>[] = [];
    
    let currentIndex = 0;
    const activeProcesses = new Set<string>();

    const processNext = async (): Promise<void> => {
      if (currentIndex >= majorGroups.length) {
        return;
      }

      const majorData = majorGroups[currentIndex++];
      activeProcesses.add(majorData.major);

      try {
        const result = await callAliyunPrediction(majorData, config);
        
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      } catch (error) {
        errors.push({
          success: false,
          major: majorData.major,
          studentCount: majorData.students.length,
          error: error.message,
          fileName: majorData.fileName
        });
      } finally {
        activeProcesses.delete(majorData.major);
        
        // 继续处理下一个专业
        if (currentIndex < majorGroups.length) {
          await processNext();
        }
      }
    };

    // 启动并发处理
    for (let i = 0; i < Math.min(maxConcurrent, majorGroups.length); i++) {
      processPromises.push(processNext());
    }

    // 等待所有预测完成
    await Promise.all(processPromises);

    console.log(`[批量预测] 所有专业预测完成`);
    console.log(`  - 成功: ${results.length} 个专业`);
    console.log(`  - 失败: ${errors.length} 个专业`);

    // 生成统计信息
    const totalStudents = majorGroups.reduce((sum, group) => sum + group.students.length, 0);
    const successfulStudents = results.reduce((sum, result) => sum + result.studentCount, 0);
    
    const summary = {
      batchId,
      year,
      originalFile: file.name,
      totalMajors: majorGroups.length,
      successfulMajors: results.length,
      failedMajors: errors.length,
      totalStudents,
      successfulStudents,
      processingTime: Date.now()
    };

    return NextResponse.json({
      success: true,
      message: `批量预测完成: ${results.length}/${majorGroups.length} 个专业成功处理`,
      data: {
        summary,
        results,
        errors,
        majorGroups: majorGroups.map(g => ({
          major: g.major,
          studentCount: g.students.length,
          fileName: g.fileName
        }))
      }
    });

  } catch (error) {
    console.error('[批量预测] API错误:', error);
    return NextResponse.json({
      success: false,
      error: '批量预测失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
