import { supabase } from './supabase'

export interface Student {
  SNH: string
  Current_Major: string
  displayName: string
}

export async function getAllStudents(): Promise<Student[]> {
  try {
    const { data: results } = await supabase
      .from('academic_results')
      .select('SNH, Current_Major')
      .not('SNH', 'is', null)
      .not('Current_Major', 'is', null)
      .neq('Current_Major', '')

    if (!results) return []

    const uniqueStudents = new Map<string, Student>()
    
    results.forEach(result => {
      if (!uniqueStudents.has(result.SNH)) {
        uniqueStudents.set(result.SNH, {
          SNH: result.SNH,
          Current_Major: result.Current_Major,
          displayName: `${result.Current_Major} - ${result.SNH.substring(0, 8)}...`
        })
      }
    })

    return Array.from(uniqueStudents.values())
      .sort((a, b) => a.Current_Major.localeCompare(b.Current_Major))
  } catch (error) {
    console.error('Error fetching students:', error)
    return []
  }
}

export async function getStudentInfo(snh: string): Promise<Student | null> {
  try {
    const { data: results } = await supabase
      .from('academic_results')
      .select('SNH, Current_Major')
      .eq('SNH', snh)
      .limit(1)

    if (!results || results.length === 0) return null

    const result = results[0]
    return {
      SNH: result.SNH,
      Current_Major: result.Current_Major,
      displayName: `${result.Current_Major} - ${result.SNH.substring(0, 8)}...`
    }
  } catch (error) {
    console.error('Error fetching student info:', error)
    return null
  }
}