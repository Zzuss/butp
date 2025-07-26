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
      .select('ability_1, ability_2, ability_3, ability_4, ability_5, ability_6, ability_7, ability_8, ability_9')
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
      data.ability_1 || 50,
      data.ability_2 || 70,
      data.ability_3 || 80,
      data.ability_4 || 50,
      data.ability_5 || 70,
      data.ability_6 || 80,
      data.ability_7 || 50,
      data.ability_8 || 70,
      data.ability_9 || 80
    ]
  } catch (error) {
    console.error('Error in getStudentAbilityData:', error)
    return [50, 70, 80, 50, 70, 80, 50, 70, 80] // 默认值：一半50，四分之一70，四分之一80
  }
} 