import { supabase } from './supabase'
import { sha256 } from './utils'

export async function getStudentAbilityData(studentId: string, year?: string | number): Promise<number[]> {
  try {
    let studentHash = studentId;
    if (studentId.length !== 64 || !/^[a-f0-9]{64}$/i.test(studentId)) {
      studentHash = await sha256(studentId);
    }

    console.log('查询学生能力数据 - 原始ID:', studentId);
    console.log('查询学生能力数据 - 使用的哈希:', studentHash);

    // 使用固定的能力数据表名
    const tableName = 'student_abilities_rada'

    const { data, error } = await supabase
      .from(tableName)
      .select('数理逻辑与科学基础, 专业核心技术, 人文与社会素养, 工程实践与创新应用, 职业发展与团队协作')
      .eq('SNH', studentHash)
      .limit(1)

    if (error) {
      console.error('❌ 查询学生能力数据时发生错误:', error)
      console.error('📝 错误详细信息:', JSON.stringify(error, null, 2))
      console.error('🔍 查询的哈希值:', studentHash)
      console.error('🔢 使用的表名:', tableName)
      throw new Error(`数据库查询失败: ${error.message || '未知错误'}`)
    }

    if (!data || data.length === 0) {
      console.error('❌ 学生能力数据缺失!')
      console.error(`📊 ${tableName} 表中找不到该学生数据`)
      console.error('🔍 查询的哈希值:', studentHash)
      console.error('💡 可能原因: 对应年级的能力评估表尚未录入该学生数据')
      throw new Error(`学生能力数据缺失: ${tableName} 表中找不到该学生的能力评估数据`)
    }

    const studentRecord = data[0];
    console.log('✅ 成功获取学生能力数据')
    return [
      studentRecord.数理逻辑与科学基础 || 0,
      studentRecord.专业核心技术 || 0,
      studentRecord.人文与社会素养 || 0,
      studentRecord.工程实践与创新应用 || 0,
      studentRecord.职业发展与团队协作 || 0
    ]
  } catch (error) {
    console.error('❌ getStudentAbilityData 函数执行失败:', error)
    // 重新抛出错误，让上层知道数据缺失
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`获取学生能力数据失败: ${error}`)
  }
} 