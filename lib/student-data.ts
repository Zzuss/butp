import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseSecondary } from './supabaseSecondary';

// 硬编码 Supabase 配置（用于 API 路由）
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 缓存数据结构
interface CourseData {
  courseName: string;
  score: number | null;
  semester: number | null;
  category: string | null;
  courseId?: string;
  credit?: number | null;
}

interface StudentDataCache {
  [studentHash: string]: {
    originalScores: CourseData[];
    modifiedScores: CourseData[];
    source2Scores: CourseData[];
    lastUpdated: number;
  };
}

// 全局缓存对象
const studentDataCache: StudentDataCache = {};

/**
 * 将学号转换为SHA256哈希值
 * @param studentId 原始学号
 * @returns SHA256哈希值
 */
export function hashStudentId(studentId: string): string {
  return createHash('sha256').update(studentId).digest('hex');
}

/**
 * 检查学号哈希值是否在数据库中存在（检查所有可能的表）
 * @param hash 学号哈希值
 * @returns 是否有效
 */
export async function isValidStudentHashInDatabase(hash: string): Promise<boolean> {
  try {
    // 检查所有可能包含学生哈希值的表
    const tables = [
      'student_number_hash_mapping_rows',
      'academic_results', 
      'cohort_probability',
      'Cohort2023_Predictions_ai',
      'Cohort2023_Predictions_ee',
      'Cohort2023_Predictions_tewm',
      'Cohort2023_Predictions_iot',
      'student_profiles',
      'course_enrollments',
      'grade_records',
      'student_records'
    ];

    // 检查是否为本地开发环境
    const isLocalDev = process.env.NODE_ENV === 'development';
    
    if (isLocalDev) {
      console.log('本地开发模式：先查询主supabase，再查询supabaseSecondary');
      
      // 先查询主supabase数据库的所有表
      console.log('开始查询主supabase数据库...');
      for (const table of tables) {
        try {
          console.log(`Checking primary supabase table: ${table}`);
          
          // 尝试不同的字段名，因为不同表可能使用不同的字段名
          const possibleFields = ['SNH', 'student_hash', 'hash', 'student_id', 'id'];
          
          for (const field of possibleFields) {
            try {
              const { data, error } = await supabase
                .from(table)
                .select(`"${field}"`)  // 使用双引号包围字段名以处理大小写敏感问题
                .eq(`"${field}"`, hash)
                .limit(1);
              
              if (error) {
                // 如果字段不存在，会报错，这是正常的，继续尝试下一个字段
                console.log(`Field ${field} not found in primary table ${table}, trying next field...`);
                continue;
              }
              
              if (data && data.length > 0) {
                console.log(`Hash found in primary supabase table: ${table}, field: ${field}`);
                return true;
              }
            } catch (fieldError) {
              // 字段不存在或其他错误，继续尝试下一个字段
              console.log(`Error checking field ${field} in primary table ${table}:`, fieldError);
              continue;
            }
          }
        } catch (tableError) {
          console.error(`Error querying primary table ${table}:`, tableError);
          continue; // 继续检查下一个表
        }
      }
      
      // 再查询supabaseSecondary数据库的所有表
      console.log('主supabase未找到，开始查询supabaseSecondary数据库...');
    }
    
    // 查询supabaseSecondary数据库（本地开发模式的第二步，或生产环境的唯一步骤）
    for (const table of tables) {
      try {
        console.log(`Checking ${isLocalDev ? 'secondary' : ''} supabase table: ${table}`);
        
        // 尝试不同的字段名，因为不同表可能使用不同的字段名
        const possibleFields = ['SNH', 'student_hash', 'hash', 'student_id', 'id'];
        
        for (const field of possibleFields) {
          try {
            const { data, error } = await supabaseSecondary
              .from(table)
              .select(`"${field}"`)  // 使用双引号包围字段名以处理大小写敏感问题
              .eq(`"${field}"`, hash)
              .limit(1);
            
            if (error) {
              // 如果字段不存在，会报错，这是正常的，继续尝试下一个字段
              console.log(`Field ${field} not found in ${isLocalDev ? 'secondary' : ''} table ${table}, trying next field...`);
              continue;
            }
            
            if (data && data.length > 0) {
              console.log(`Hash found in ${isLocalDev ? 'secondary' : ''} supabase table: ${table}, field: ${field}`);
              return true;
            }
          } catch (fieldError) {
            // 字段不存在或其他错误，继续尝试下一个字段
            console.log(`Error checking field ${field} in ${isLocalDev ? 'secondary' : ''} table ${table}:`, fieldError);
            continue;
          }
        }
      } catch (tableError) {
        console.error(`Error querying ${isLocalDev ? 'secondary' : ''} table ${table}:`, tableError);
        continue; // 继续检查下一个表
      }
    }
    
    console.log('Hash not found in any table');
    return false;
  } catch (error) {
    console.error('Database query failed:', error);
    return false;
  }
}

  /**
   * 获取学生的原始课程数据（来源1：专业预测表）
   * @param studentHash 学生哈希值
   * @returns 原始课程数据
   */
  export async function getOriginalScores(studentHash: string): Promise<CourseData[]> {
    try {
      // 从四个专业预测表中查询数据
      const tables = ['Cohort2023_Predictions_ai', 'Cohort2023_Predictions_ee', 'Cohort2023_Predictions_tewm', 'Cohort2023_Predictions_iot'];
      let allData: any[] = [];
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('"Course_Name", "Grade", "Semester_Offered", "Course_Attribute", "Course_ID", "Credit"')  // 使用双引号包围字段名
            .eq('"SNH"', studentHash);
          
          if (!error && data) {
            allData = allData.concat(data);
          }
        } catch (tableError) {
          console.log(`Error querying table ${table}:`, tableError);
          continue;
        }
      }

      return allData.map((course: any) => ({
        courseName: course.Course_Name || '',
        score: course.Grade ? parseFloat(course.Grade) : null,
        semester: course.Semester_Offered ? parseInt(course.Semester_Offered) : null,
        category: course.Course_Attribute || null,
        courseId: course.Course_ID || undefined,
        credit: course.Credit ? parseFloat(course.Credit) : undefined
      }));
    } catch (error) {
      console.error('Error in getOriginalScores:', error);
      return [];
    }
  }

  /**
   * 获取学生的来源2课程数据（academic_results）
   * @param studentHash 学生哈希值
   * @returns 来源2课程数据
   */
  export async function getSource2Scores(studentHash: string): Promise<CourseData[]> {
    try {
      const { data, error } = await supabase
        .from('academic_results')
        .select('"Course_Name", "Grade", "Semester_Offered", "Course_Attribute", "Course_ID", "Credit"')  // 使用双引号包围字段名
        .eq('"SNH"', studentHash);

      if (error) {
        console.error('Error fetching source2 scores:', error);
        return [];
      }

      return (data || []).map(course => ({
        courseName: course.Course_Name || '',
        score: course.Grade ? parseFloat(course.Grade) : null,
        semester: course.Semester_Offered ? parseInt(course.Semester_Offered) : null,
        category: course.Course_Attribute || null,
        courseId: course.Course_ID || undefined,
        credit: course.Credit ? parseFloat(course.Credit) : undefined
      }));
    } catch (error) {
      console.error('Error in getSource2Scores:', error);
      return [];
    }
  }

/**
 * 初始化学生数据缓存
 * @param studentHash 学生哈希值
 * @returns 缓存数据
 */
export async function initializeStudentCache(studentHash: string): Promise<{
  originalScores: CourseData[];
  modifiedScores: CourseData[];
  source2Scores: CourseData[];
}> {
  // 检查缓存是否存在且未过期（24小时）
  const cache = studentDataCache[studentHash];
  const now = Date.now();
  const cacheExpiry = 24 * 60 * 60 * 1000; // 24小时

  if (cache && (now - cache.lastUpdated) < cacheExpiry) {
    console.log('Using cached data for student:', studentHash);
    return cache;
  }

  console.log('Initializing cache for student:', studentHash);

  // 并行获取原始数据和来源2数据
  const [originalScores, source2Scores] = await Promise.all([
    getOriginalScores(studentHash),
    getSource2Scores(studentHash)
  ]);

  // 初始化修改后的数据为原始数据的副本
  const modifiedScores = JSON.parse(JSON.stringify(originalScores));

  // 更新缓存
  studentDataCache[studentHash] = {
    originalScores,
    modifiedScores,
    source2Scores,
    lastUpdated: now
  };

  return {
    originalScores,
    modifiedScores,
    source2Scores
  };
}

/**
 * 更新学生的修改后数据
 * @param studentHash 学生哈希值
 * @param modifiedScores 修改后的课程数据
 */
export function updateModifiedScores(studentHash: string, modifiedScores: CourseData[]): void {
  if (studentDataCache[studentHash]) {
    studentDataCache[studentHash].modifiedScores = modifiedScores;
    studentDataCache[studentHash].lastUpdated = Date.now();
    console.log('Updated modified scores for student:', studentHash);
  }
}

/**
 * 获取学生的当前显示数据（根据编辑状态）
 * @param studentHash 学生哈希值
 * @param isEditMode 是否处于编辑模式
 * @returns 当前显示的数据
 */
export function getCurrentDisplayScores(studentHash: string, isEditMode: boolean): CourseData[] {
  const cache = studentDataCache[studentHash];
  if (!cache) {
    return [];
  }

  if (isEditMode && cache.modifiedScores.length > 0) {
    return cache.modifiedScores;
  }

  return cache.originalScores;
}

/**
 * 清除学生缓存
 * @param studentHash 学生哈希值
 */
export function clearStudentCache(studentHash: string): void {
  delete studentDataCache[studentHash];
  console.log('Cleared cache for student:', studentHash);
}

/**
 * 获取缓存统计信息
 * @param studentHash 学生哈希值
 * @returns 缓存统计信息
 */
export function getCacheInfo(studentHash: string): {
  hasCache: boolean;
  originalCount: number;
  modifiedCount: number;
  source2Count: number;
  hasModifications: boolean;
  modifiedCoursesCount: number;
  lastUpdated: number | null;
} {
  const cache = studentDataCache[studentHash];
  if (!cache) {
    return {
      hasCache: false,
      originalCount: 0,
      modifiedCount: 0,
      source2Count: 0,
      hasModifications: false,
      modifiedCoursesCount: 0,
      lastUpdated: null
    };
  }

  // 计算修改的课程数量
  const modifiedCoursesCount = cache.modifiedScores.filter((course, index) => {
    const originalCourse = cache.originalScores[index];
    return originalCourse && course.score !== originalCourse.score;
  }).length;

  return {
    hasCache: true,
    originalCount: cache.originalScores.length,
    modifiedCount: cache.modifiedScores.length,
    source2Count: cache.source2Scores.length,
    hasModifications: modifiedCoursesCount > 0,
    modifiedCoursesCount,
    lastUpdated: cache.lastUpdated
  };
}

/**
 * 检查学号哈希值是否有效（格式检查）
 * @param hash 学号哈希值
 * @returns 是否符合哈希格式
 */
export function isValidStudentHash(hash: string): boolean {
  // 检查是否符合64位十六进制字符串格式（SHA256）
  return /^[a-f0-9]{64}$/i.test(hash);
}

/**
 * 检查原始学号是否有效（通过检查其哈希值格式）
 * @param studentId 原始学号
 * @returns 是否有效
 */
export function isValidStudentId(studentId: string): boolean {
  const hashedId = hashStudentId(studentId);
  return isValidStudentHash(hashedId);
}

/**
 * 从数据库获取学生信息
 * @param hash 学号哈希值
 * @returns 学生信息对象
 */
export async function getStudentInfoByHash(hash: string): Promise<{ id: string; name: string; major: string; year?: string } | null> {
  try {
    const { data, error } = await supabase
      .from('academic_results')
      .select('"SNH", "Current_Major"')  // 使用双引号包围字段名
      .eq('"SNH"', hash)
      .limit(1);
    
    if (error) {
      console.error('Error fetching student info:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      const student = data[0];
      return {
        id: hash,
        name: `学生 ${hash.substring(0, 8)}`, // 使用哈希前8位作为显示名
        major: student.Current_Major || '未知专业',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Database query failed:', error);
    return null;
  }
}

/**
 * 获取原始学号对应的学生信息（通过哈希化并查询数据库）
 * @param studentId 原始学号
 * @returns 学生信息对象，包含哈希值
 */
export async function getStudentInfoById(studentId: string): Promise<{ id: string; hash: string; name: string; major: string } | null> {
  const hash = hashStudentId(studentId);
  const info = await getStudentInfoByHash(hash);
  
  if (info) {
    return {
      ...info,
      hash: hash,
    };
  }
  
  return null;
}

/**
 * 通过学号从映射表中查找对应的哈希值
 * @param studentNumber 学号
 * @returns 哈希值或null
 */
export async function getHashByStudentNumber(studentNumber: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseSecondary
      .from('student_number_hash_mapping_rows')
      .select('student_hash')
      .eq('student_number', studentNumber)
      .limit(1);
    if (error) {
      console.error('Error querying student number mapping:', error);
      return null;
    }
    if (data && data.length > 0) {
      return data[0].student_hash;
    }
    return null;
  } catch (error) {
    console.error('Database query failed:', error);
    return null;
  }
}

/**
 * 验证CAS认证的学号是否在数据库中存在（优先使用映射表）
 * @param studentId CAS返回的原始学号
 * @returns 验证结果和哈希值
 */
export async function validateCasStudentId(studentId: string): Promise<{ isValid: boolean; hash: string; studentInfo?: { id: string; name: string; major: string; year?: string } | null }> {
  console.log('Validating CAS student ID:', { originalId: studentId });
  
  // 首先尝试从映射表中查找哈希值
  const mappedHash = await getHashByStudentNumber(studentId);
  
  if (mappedHash) {
    console.log('Found hash in mapping table:', { hash: mappedHash });
    
    // 验证映射的哈希值是否在数据库中存在
    const isValid = await isValidStudentHashInDatabase(mappedHash);
    
    if (isValid) {
      const studentInfo = await getStudentInfoByHash(mappedHash);
      return {
        isValid: true,
        hash: mappedHash,
        studentInfo: studentInfo
      };
    }
  }
  
  // 如果映射表中没有找到，回退到原有的哈希化方式
  console.log('No mapping found, falling back to generated hash');
  const generatedHash = hashStudentId(studentId);
  
  console.log('Generated hash:', { generatedHash });
  
  const isValid = await isValidStudentHashInDatabase(generatedHash);
  
  if (isValid) {
    const studentInfo = await getStudentInfoByHash(generatedHash);
    return {
      isValid: true,
      hash: generatedHash,
      studentInfo: studentInfo
    };
  }
  
  return {
    isValid: false,
    hash: mappedHash || generatedHash
  };
}