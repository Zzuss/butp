import { supabase } from './supabase'
import { sha256 } from './utils'

export async function getStudentAbilityData(studentId: string): Promise<number[]> {
  try {
    let studentHash = studentId;
    if (studentId.length !== 64 || !/^[a-f0-9]{64}$/i.test(studentId)) {
      studentHash = await sha256(studentId);
    }

    const { data, error } = await supabase
      .from('cohort_predictions')
      .select('current_public, current_practice, current_math_science, current_political, current_basic_subject, current_innovation, current_english, current_basic_major, current_major')
      .eq('SNH', studentHash)
      .single()

    if (error) {
      console.error('Error fetching student ability data:', error)
      return [50, 70, 80, 50, 70, 80, 50, 70, 80] // 默认值：一半50，四分之一70，四分之一80
    }

    if (!data) {
      return [50, 70, 80, 50, 70, 80, 50, 70, 80] // 默认值：一半50，四分之一70，四分之一80
    }

    return [
      data.current_public || 50,
      data.current_practice || 70,
      data.current_math_science || 80,
      data.current_political || 50,
      data.current_basic_subject || 70,
      data.current_innovation || 80,
      data.current_english || 50,
      data.current_basic_major || 70,
      data.current_major || 80
    ]
  } catch (error) {
    console.error('Error in getStudentAbilityData:', error)
    return [50, 70, 80, 50, 70, 80, 50, 70, 80] // 默认值：一半50，四分之一70，四分之一80
  }
} 