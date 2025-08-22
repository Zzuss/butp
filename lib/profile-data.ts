import { supabase } from './supabase'

// 接口定义
export interface ToeflScore {
  total: number;
  reading: number;
  listening: number;
  speaking: number;
  writing: number;
}

export interface IeltsScore {
  total: number;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}

export interface GreScore {
  total: number;
  math: number;
  verbal: number;
  writing: number;
}

export interface Award {
  id?: string;
  title: string;
  organization: string;
  level: string;
  date: string;
  colorIndex: number;
}

export interface Internship {
  id?: string;
  title: string;
  company: string;
  period: string;
  description: string;
  colorIndex: number;
}

export interface LanguageScore {
  id?: string;
  scoreType: 'toefl' | 'ielts' | 'gre';
  totalScore: number;
  readingScore?: number;
  listeningScore?: number;
  speakingScore?: number;
  writingScore?: number;
  mathScore?: number;
  verbalScore?: number;
}

// 语言成绩 CRUD 操作
export async function getUserLanguageScores(userHash: string): Promise<LanguageScore[]> {
  try {
    const { data, error } = await supabase
      .from('user_language_scores')
      .select('*')
      .eq('user_hash', userHash)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching language scores:', error);
      return [];
    }

    return data?.map(score => ({
      id: score.id,
      scoreType: score.score_type,
      totalScore: score.total_score,
      readingScore: score.reading_score,
      listeningScore: score.listening_score,
      speakingScore: score.speaking_score,
      writingScore: score.writing_score,
      mathScore: score.math_score,
      verbalScore: score.verbal_score
    })) || [];
  } catch (error) {
    console.error('Error fetching language scores:', error);
    return [];
  }
}

export async function saveLanguageScore(userHash: string, score: LanguageScore): Promise<boolean> {
  try {
    const scoreData = {
      user_hash: userHash,
      score_type: score.scoreType,
      total_score: score.totalScore,
      reading_score: score.readingScore,
      listening_score: score.listeningScore,
      speaking_score: score.speakingScore,
      writing_score: score.writingScore,
      math_score: score.mathScore,
      verbal_score: score.verbalScore
    };

    const { error } = await supabase
      .from('user_language_scores')
      .upsert(scoreData, {
        onConflict: 'user_hash,score_type'
      });

    if (error) {
      console.error('Error saving language score:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving language score:', error);
    return false;
  }
}

export async function deleteLanguageScore(userHash: string, scoreType: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_language_scores')
      .delete()
      .eq('user_hash', userHash)
      .eq('score_type', scoreType);

    if (error) {
      console.error('Error deleting language score:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting language score:', error);
    return false;
  }
}

// 获奖记录 CRUD 操作
export async function getUserAwards(userHash: string): Promise<Award[]> {
  try {
    const { data, error } = await supabase
      .from('user_awards')
      .select('*')
      .eq('user_hash', userHash)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching awards:', error);
      return [];
    }

    return data?.map(award => ({
      id: award.id,
      title: award.title,
      organization: award.organization,
      level: award.level,
      date: award.award_date,
      colorIndex: award.color_index
    })) || [];
  } catch (error) {
    console.error('Error fetching awards:', error);
    return [];
  }
}

export async function saveAward(userHash: string, award: Award): Promise<boolean> {
  try {
    const awardData = {
      user_hash: userHash,
      title: award.title,
      organization: award.organization,
      level: award.level,
      award_date: award.date,
      color_index: award.colorIndex
    };

    if (award.id) {
      // 更新现有记录
      const { error } = await supabase
        .from('user_awards')
        .update(awardData)
        .eq('id', award.id)
        .eq('user_hash', userHash);

      if (error) {
        console.error('Error updating award:', error);
        return false;
      }
    } else {
      // 创建新记录
      const { error } = await supabase
        .from('user_awards')
        .insert(awardData);

      if (error) {
        console.error('Error creating award:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving award:', error);
    return false;
  }
}

export async function deleteAward(userHash: string, awardId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_awards')
      .delete()
      .eq('id', awardId)
      .eq('user_hash', userHash);

    if (error) {
      console.error('Error deleting award:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting award:', error);
    return false;
  }
}

// 实习经历 CRUD 操作
export async function getUserInternships(userHash: string): Promise<Internship[]> {
  try {
    const { data, error } = await supabase
      .from('user_internships')
      .select('*')
      .eq('user_hash', userHash)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching internships:', error);
      return [];
    }

    return data?.map(internship => ({
      id: internship.id,
      title: internship.title,
      company: internship.company,
      period: internship.period,
      description: internship.description,
      colorIndex: internship.color_index
    })) || [];
  } catch (error) {
    console.error('Error fetching internships:', error);
    return [];
  }
}

export async function saveInternship(userHash: string, internship: Internship): Promise<boolean> {
  try {
    const internshipData = {
      user_hash: userHash,
      title: internship.title,
      company: internship.company,
      period: internship.period,
      description: internship.description,
      color_index: internship.colorIndex
    };

    if (internship.id) {
      // 更新现有记录
      const { error } = await supabase
        .from('user_internships')
        .update(internshipData)
        .eq('id', internship.id)
        .eq('user_hash', userHash);

      if (error) {
        console.error('Error updating internship:', error);
        return false;
      }
    } else {
      // 创建新记录
      const { error } = await supabase
        .from('user_internships')
        .insert(internshipData);

      if (error) {
        console.error('Error creating internship:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving internship:', error);
    return false;
  }
}

export async function deleteInternship(userHash: string, internshipId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_internships')
      .delete()
      .eq('id', internshipId)
      .eq('user_hash', userHash);

    if (error) {
      console.error('Error deleting internship:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting internship:', error);
    return false;
  }
}

// 辅助函数：转换分数格式
export function convertToToeflScore(languageScore: LanguageScore): ToeflScore {
  return {
    total: languageScore.totalScore,
    reading: languageScore.readingScore || 0,
    listening: languageScore.listeningScore || 0,
    speaking: languageScore.speakingScore || 0,
    writing: languageScore.writingScore || 0
  };
}

export function convertToIeltsScore(languageScore: LanguageScore): IeltsScore {
  return {
    total: languageScore.totalScore,
    listening: languageScore.listeningScore || 0,
    reading: languageScore.readingScore || 0,
    writing: languageScore.writingScore || 0,
    speaking: languageScore.speakingScore || 0
  };
}

export function convertToGreScore(languageScore: LanguageScore): GreScore {
  return {
    total: languageScore.totalScore,
    math: languageScore.mathScore || 0,
    verbal: languageScore.verbalScore || 0,
    writing: languageScore.writingScore || 0
  };
}

// 其他信息接口
export interface OtherInfo {
  id?: string;
  category: string; // 类别，如"MBTI"、"兴趣爱好"、"个人特质"等
  content: string; // 内容，如"INTJ"、"阅读、旅行"等
  colorIndex: number;
}

// 其他信息 CRUD 操作
export async function getUserOtherInfo(userHash: string): Promise<OtherInfo[]> {
  try {
    const { data, error } = await supabase
      .from('user_other_info')
      .select('*')
      .eq('user_hash', userHash)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching other info:', error);
      return [];
    }

    return data?.map(info => ({
      id: info.id,
      category: info.category,
      content: info.content,
      colorIndex: info.color_index
    })) || [];
  } catch (error) {
    console.error('Error fetching other info:', error);
    return [];
  }
}

export async function saveOtherInfo(userHash: string, otherInfo: OtherInfo): Promise<boolean> {
  try {
    const infoData = {
      user_hash: userHash,
      category: otherInfo.category,
      content: otherInfo.content,
      color_index: otherInfo.colorIndex
    };

    if (otherInfo.id) {
      // 更新现有记录
      const { error } = await supabase
        .from('user_other_info')
        .update(infoData)
        .eq('id', otherInfo.id)
        .eq('user_hash', userHash);

      if (error) {
        console.error('Error updating other info:', error);
        return false;
      }
    } else {
      // 创建新记录
      const { error } = await supabase
        .from('user_other_info')
        .insert(infoData);

      if (error) {
        console.error('Error creating other info:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving other info:', error);
    return false;
  }
}

export async function deleteOtherInfo(userHash: string, infoId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_other_info')
      .delete()
      .eq('id', infoId)
      .eq('user_hash', userHash);

    if (error) {
      console.error('Error deleting other info:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting other info:', error);
    return false;
  }
}

// 预定义的其他信息类别
export const OTHER_INFO_CATEGORIES = [
  'MBTI',
  '兴趣爱好',
  '个人特质',
  '技能专长',
  '职业规划',
  '价值观',
  '其他'
] as const;

