import { supabase } from './supabase'
import { sha256 } from './utils'

export async function getStudentAbilityData(studentId: string): Promise<number[]> {
  try {
    let studentHash = studentId;
    if (studentId.length !== 64 || !/^[a-f0-9]{64}$/i.test(studentId)) {
      studentHash = await sha256(studentId);
    }

    console.log('查询学生能力数据 - 原始ID:', studentId);
    console.log('查询学生能力数据 - 使用的哈希:', studentHash);

    const { data, error } = await supabase
      .from('student_abilities_rada')
      .select('数理逻辑与科学基础, 专业核心技术, 人文与社会素养, 工程实践与创新应用, 职业发展与团队协作')
      .eq('SNH', studentHash)
      .limit(1)

    if (error) {
      console.error('❌ 查询学生能力数据时发生错误:', error)
      console.error('📝 错误详细信息:', JSON.stringify(error, null, 2))
      console.error('🔍 查询的哈希值:', studentHash)
      throw new Error(`数据库查询失败: ${error.message || '未知错误'}`)
    }

    if (!data || data.length === 0) {
      console.error('❌ 学生能力数据缺失!')
      console.error('📊 student_abilities_rada 表中找不到该学生数据')
      console.error('🔍 查询的哈希值:', studentHash)
      console.error('💡 可能原因: 2024级学生数据尚未录入能力评估表')
      throw new Error('学生能力数据缺失: student_abilities_rada 表中找不到该学生的能力评估数据')
    }

    const studentRecord = data[0];
    console.log('✅ 成功获取学生能力数据')
    return [
      studentRecord.数理逻辑与科学基础 || 50,
      studentRecord.专业核心技术 || 70,
      studentRecord.人文与社会素养 || 80,
      studentRecord.工程实践与创新应用 || 50,
      studentRecord.职业发展与团队协作 || 70
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