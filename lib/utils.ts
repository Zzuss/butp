import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 计算北邮GPA
 * 百分制成绩转换绩点成绩的公式为：绩点成绩=4 - 3 * (100-X)² /1600 （60≦X≦100）
 * 其中 X 为课程百分制成绩, 100 分绩点为 4，60 分绩点为 1，60 分以下绩点为 0
 * @param score 百分制成绩
 * @returns 绩点成绩
 */
export function calculateBUPTGPA(score: number): number {
  if (score >= 60) {
    return 4 - 3 * Math.pow(100 - score, 2) / 1600
  }
  return 0
}

/**
 * 根据北邮绩点获取对应的等级
 * @param gpa 绩点成绩
 * @returns 等级
 */
export function getGradeFromGPA(gpa: number): string {
  if (gpa >= 3.5) return 'A+'
  if (gpa >= 3.0) return 'A'
  if (gpa >= 2.8) return 'B+'
  if (gpa >= 2.6) return 'B'
  if (gpa >= 2.4) return 'C+'
  if (gpa >= 2.0) return 'C'
  if (gpa >= 1.0) return 'D'
  return 'F'
}