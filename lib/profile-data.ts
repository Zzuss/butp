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

    if (score.id) {
      // 更新现有记录
      const { error } = await supabase
        .from('user_language_scores')
        .update(scoreData)
        .eq('id', score.id)
        .eq('user_hash', userHash);

      if (error) {
        console.error('Error updating language score:', error);
        return false;
      }
    } else {
      // 先检查是否已存在相同类型的成绩
      const { data: existingScores, error: fetchError } = await supabase
        .from('user_language_scores')
        .select('id')
        .eq('user_hash', userHash)
        .eq('score_type', score.scoreType);

      if (fetchError) {
        console.error('Error checking existing score:', fetchError);
        return false;
      }

      if (existingScores && existingScores.length > 0) {
        // 更新现有记录
        const { error } = await supabase
          .from('user_language_scores')
          .update(scoreData)
          .eq('id', existingScores[0].id);

        if (error) {
          console.error('Error updating existing language score:', error);
          return false;
        }
      } else {
        // 创建新记录
        const { error } = await supabase
          .from('user_language_scores')
          .insert({
            id: generateUUID(),
            ...scoreData
          })
          .select();

        if (error) {
          console.error('Error creating language score:', error);
          return false;
        }
      }
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
      ...(award.id ? {} : { id: generateUUID() }), // 只有新记录才生成UUID
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
        .insert(awardData)
        .select();

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
      ...(internship.id ? {} : { id: generateUUID() }), // 只有新记录才生成UUID
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
        .insert(internshipData)
        .select();

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
      ...(otherInfo.id ? {} : { id: generateUUID() }), // 只有新记录才生成UUID
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
        .insert(infoData)
        .select();

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

// 论文接口
export interface Paper {
  id?: string;
  paper_title: string;
  journal_name?: string;
  journal_category?: string;
  bupt_student_id?: string;
  full_name?: string;
  class?: string;
  author_type?: string;
  publish_date?: string;
  note?: string;
  colorIndex: number;
}

// 专利接口
export interface Patent {
  id?: string;
  patent_name: string;
  patent_number?: string;
  patent_date?: string;
  bupt_student_id?: string;
  class?: string;
  full_name?: string;
  category_of_patent_owner?: string;
  note?: string;
  colorIndex: number;
}

// 论文 CRUD 操作
export async function getUserPapers(userId: string): Promise<Paper[]> {
  try {
    const { data, error } = await supabase
      .from('student_papers')
      .select('*')
      .eq('bupt_student_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching papers:', error);
      return [];
    }

    return data?.map(paper => ({
      id: paper.id,
      paper_title: paper.paper_title,
      journal_name: paper.journal_name,
      journal_category: paper.journal_category,
      bupt_student_id: paper.bupt_student_id,
      full_name: paper.full_name,
      class: paper.class,
      author_type: paper.author_type,
      publish_date: paper.publish_date,
      note: paper.note,
      colorIndex: Math.floor(Math.random() * 10) // 随机分配颜色索引
    })) || [];
  } catch (error) {
    console.error('Error fetching papers:', error);
    return [];
  }
}

// 生成UUID的辅助函数
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function savePaper(userId: string, userName: string, paper: Paper): Promise<boolean> {
  try {
    // 验证必要参数
    if (!userId || userId.trim() === '') {
      console.error('User ID is required for saving paper');
      return false;
    }
    
    if (!userName || userName.trim() === '') {
      console.error('User name is required for saving paper');
      return false;
    }
    
    if (!paper.paper_title || paper.paper_title.trim() === '') {
      console.error('Paper title is required');
      return false;
    }
    // 处理日期格式：如果是月份格式(YYYY-MM)，转换为完整日期格式(YYYY-MM-01)
    let formattedDate = null;
    if (paper.publish_date && paper.publish_date.trim() !== '') {
      const dateValue = paper.publish_date.trim();
      // 检查是否为月份格式 (YYYY-MM)
      if (/^\d{4}-\d{2}$/.test(dateValue)) {
        formattedDate = `${dateValue}-01`; // 添加第一天
      } else {
        formattedDate = dateValue;
      }
    }

    // 辅助函数：将空字符串转换为null
    const emptyToNull = (value: string | undefined | null): string | null => {
      if (!value || value.trim() === '') {
        return null;
      }
      return value.trim();
    };

    const paperData = {
      ...(paper.id ? {} : { id: generateUUID() }), // 只有新记录才生成UUID
      paper_title: paper.paper_title,
      journal_name: emptyToNull(paper.journal_name),
      journal_category: emptyToNull(paper.journal_category),
      bupt_student_id: userId, // 自动填入用户的学号
      full_name: userName, // 自动填入用户的真实姓名
      class: emptyToNull(paper.class),
      author_type: emptyToNull(paper.author_type),
      publish_date: formattedDate,
      note: emptyToNull(paper.note)
    };

    if (paper.id) {
      // 更新现有记录
      const { error } = await supabase
        .from('student_papers')
        .update(paperData)
        .eq('id', paper.id)
        .eq('bupt_student_id', userId);

      if (error) {
        console.error('Error updating paper:', error);
        return false;
      }
    } else {
      // 创建新记录 - 让数据库自动生成UUID
      const { error } = await supabase
        .from('student_papers')
        .insert(paperData)
        .select(); // 添加select()来获取插入后的数据，包括生成的UUID

      if (error) {
        console.error('Error creating paper:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving paper:', error);
    return false;
  }
}

export async function deletePaper(userId: string, paperId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('student_papers')
      .delete()
      .eq('id', paperId)
      .eq('bupt_student_id', userId);

    if (error) {
      console.error('Error deleting paper:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting paper:', error);
    return false;
  }
}

// 专利 CRUD 操作
export async function getUserPatents(userId: string): Promise<Patent[]> {
  try {
    const { data, error } = await supabase
      .from('student_patents')
      .select('*')
      .eq('bupt_student_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patents:', error);
      return [];
    }

    return data?.map(patent => ({
      id: patent.id,
      patent_name: patent.patent_name,
      patent_number: patent.patent_number,
      patent_date: patent.patent_date,
      bupt_student_id: patent.bupt_student_id,
      class: patent.class,
      full_name: patent.full_name,
      category_of_patent_owner: patent.category_of_patent_owner,
      note: patent.note,
      colorIndex: Math.floor(Math.random() * 10) // 随机分配颜色索引
    })) || [];
  } catch (error) {
    console.error('Error fetching patents:', error);
    return [];
  }
}

export async function savePatent(userId: string, userName: string, patent: Patent): Promise<boolean> {
  try {
    // 处理日期格式：如果是月份格式(YYYY-MM)，转换为完整日期格式(YYYY-MM-01)
    let formattedPatentDate = null;
    if (patent.patent_date && patent.patent_date.trim() !== '') {
      const dateValue = patent.patent_date.trim();
      // 检查是否为月份格式 (YYYY-MM)
      if (/^\d{4}-\d{2}$/.test(dateValue)) {
        formattedPatentDate = `${dateValue}-01`; // 添加第一天
      } else {
        formattedPatentDate = dateValue;
      }
    }

    // 辅助函数：将空字符串转换为null
    const emptyToNull = (value: string | undefined | null): string | null => {
      if (!value || value.trim() === '') {
        return null;
      }
      return value.trim();
    };

    const patentData = {
      ...(patent.id ? {} : { id: generateUUID() }), // 只有新记录才生成UUID
      patent_name: patent.patent_name,
      patent_number: emptyToNull(patent.patent_number),
      patent_date: formattedPatentDate,
      bupt_student_id: userId, // 自动填入用户的学号
      class: emptyToNull(patent.class),
      full_name: userName, // 自动填入用户的真实姓名
      category_of_patent_owner: emptyToNull(patent.category_of_patent_owner),
      note: emptyToNull(patent.note)
    };

    if (patent.id) {
      // 更新现有记录
      const { error } = await supabase
        .from('student_patents')
        .update(patentData)
        .eq('id', patent.id)
        .eq('bupt_student_id', userId);

      if (error) {
        console.error('Error updating patent:', error);
        return false;
      }
    } else {
      // 创建新记录 - 让数据库自动生成UUID
      const { error } = await supabase
        .from('student_patents')
        .insert(patentData)
        .select(); // 添加select()来获取插入后的数据，包括生成的UUID

      if (error) {
        console.error('Error creating patent:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving patent:', error);
    return false;
  }
}

export async function deletePatent(userId: string, patentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('student_patents')
      .delete()
      .eq('id', patentId)
      .eq('bupt_student_id', userId);

    if (error) {
      console.error('Error deleting patent:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting patent:', error);
    return false;
  }
}

