import { supabase } from './supabase'
import { sha256 } from './utils'

export async function getStudentAbilityData(studentId: string): Promise<number[]> {
  try {
    let studentHash = studentId;
    if (studentId.length !== 64 || !/^[a-f0-9]{64}$/i.test(studentId)) {
      studentHash = await sha256(studentId);
    }

    const { data, error } = await supabase
      .from('student_abilities_rada')
      .select('数理逻辑与科学基础, 专业核心技术, 人文与社会素养, 工程实践与创新应用, 职业发展与团队协作')
      .eq('SNH', studentHash)
      .single()

    if (error) {
      console.error('Error fetching student ability data:', error)
      return [50, 70, 80, 50, 70] // 默认值：五项能力
    }

    if (!data) {
      return [50, 70, 80, 50, 70] // 默认值：五项能力
    }

    return [
      data.数理逻辑与科学基础 || 50,
      data.专业核心技术 || 70,
      data.人文与社会素养 || 80,
      data.工程实践与创新应用 || 50,
      data.职业发展与团队协作 || 70
    ]
  } catch (error) {
    console.error('Error in getStudentAbilityData:', error)
    return [50, 70, 80, 50, 70] // 默认值：五项能力
  }
} 