import { supabase } from './supabase'

export interface AbilityData {
  current_public: number
  current_practice: number
  current_math_science: number
  current_political: number
  current_basic_subject: number
  current_innovation: number
  current_english: number
  current_basic_major: number
  current_major: number
}

export async function getStudentAbilityData(studentId: string): Promise<AbilityData | null> {
  try {
    const { data, error } = await supabase
      .from('cohort_predictions')
      .select(`
        current_public,
        current_practice,
        current_math_science,
        current_political,
        current_basic_subject,
        current_innovation,
        current_english,
        current_basic_major,
        current_major
      `)
      .eq('SNH', studentId)
      .single()

    if (error) {
      console.error('Error fetching ability data:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching ability data:', error)
    return null
  }
} 