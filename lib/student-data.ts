import { createHash } from 'crypto';
import { supabase } from './supabase';

/**
 * 将学号转换为SHA256哈希值
 * @param studentId 原始学号
 * @returns SHA256哈希值
 */
export function hashStudentId(studentId: string): string {
  return createHash('sha256').update(studentId).digest('hex');
}

/**
 * 检查学号哈希值是否在数据库中存在（检查所有包含SNH字段的表）
 * @param hash 学号哈希值
 * @returns 是否有效
 */
export async function isValidStudentHashInDatabase(hash: string): Promise<boolean> {
  try {
    // 检查所有包含SNH字段的表（只检查实际存在的表）
    const tables = ['academic_results', 'cohort_probability'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('SNH')
          .eq('SNH', hash)
          .limit(1);
        
        if (error) {
          console.error(`Error checking student hash in ${table}:`, error);
          continue; // 继续检查下一个表
        }
        
        if (data && data.length > 0) {
          console.log(`Hash found in table: ${table}`);
          return true;
        }
      } catch (tableError) {
        console.error(`Error querying table ${table}:`, tableError);
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
      .select('SNH, Current_Major')
      .eq('SNH', hash)
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
 * 验证CAS认证的学号是否在数据库中存在
 * @param studentId CAS返回的原始学号
 * @returns 验证结果和哈希值
 */
export async function validateCasStudentId(studentId: string): Promise<{ isValid: boolean; hash: string; studentInfo?: { id: string; name: string; major: string; year?: string } | null }> {
  const hash = hashStudentId(studentId);
  
  console.log('Validating CAS student ID:', {
    originalId: studentId,
    generatedHash: hash
  });
  
  const isValid = await isValidStudentHashInDatabase(hash);
  
  if (isValid) {
    const studentInfo = await getStudentInfoByHash(hash);
    return {
      isValid: true,
      hash: hash,
      studentInfo: studentInfo
    };
  }
  
  return {
    isValid: false,
    hash: hash
  };
}