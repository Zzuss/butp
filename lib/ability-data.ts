import { supabase } from './supabase'
import { sha256 } from './utils'

export async function getStudentAbilityData(studentId: string, year?: string | number): Promise<number[]> {
  try {
    let studentHash = studentId;
    if (studentId.length !== 64 || !/^[a-f0-9]{64}$/i.test(studentId)) {
      studentHash = await sha256(studentId);
    }

    // 验证哈希格式
    const trimmedHash = studentHash.trim();
    if (!/^[a-f0-9]{64}$/i.test(trimmedHash)) {
      throw new Error('无效的学生哈希值格式')
    }

    // 处理年份参数
    if (!year) {
      throw new Error('年份参数是必需的')
    }

    const yearNum = typeof year === 'string' ? parseInt(year) : year;
    if (isNaN(yearNum) || yearNum < 2018 || yearNum > 2050) {
      throw new Error(`无效的年份: ${year}`)
    }

    console.log('查询学生能力数据 - 原始ID:', studentId);
    console.log('查询学生能力数据 - 使用的哈希:', trimmedHash);
    console.log('查询学生能力数据 - 年份:', yearNum);

    // 参考 route.ts 的逻辑，在年份范围内查找数据
    let abilityData = null;
    let tableName = '';
    let effectiveYear = yearNum;
    let found = false;
    const queryLogs: Array<{ tableName: string; found: boolean; message: string }> = [];

    // 从 year-1 到 year+7 范围内查找
    for (let offset = -1; offset <= 7; offset++) {
      const currentYear = yearNum + offset;
      if (currentYear > 2050) break;

      const currentTableName = `Cohort${currentYear}_Predictions_all`;
      const result = await supabase
        .from(currentTableName)
        .select('C19, C20, C21, C22, C23')
        .eq('SNH', trimmedHash)
        .limit(1);

      const logEntry = {
        tableName: currentTableName,
        found: !result.error && !!result.data && result.data.length > 0,
        message: !result.error && result.data && result.data.length > 0 ? '找到学生数据' : (result.error?.message || 'No data')
      };
      queryLogs.push(logEntry);

      if (logEntry.found && result.data && result.data.length > 0) {
        console.log(`查询表 ${currentTableName} - ✅ ${logEntry.message}`);
        abilityData = result.data[0];
        tableName = currentTableName;
        effectiveYear = currentYear;
        found = true;
        break;
      } else {
        console.log(`查询表 ${currentTableName} - ❌ ${logEntry.message}`);
      }
    }

    // 检查是否找到了数据
    if (!found || !abilityData) {
      console.error('❌ 学生能力数据缺失!');
      console.error('📊 在指定年份的cohort表中找不到该学生数据');
      console.error('🔍 查询的哈希值:', trimmedHash);
      console.error('📅 年份:', yearNum);
      console.error('💡 可能原因: 学生哈希值不在该年份的预测表中，或年份不正确');
      throw new Error(`学生能力数据缺失: 在 ${yearNum} 年预测表及后续 7 年内找不到该学生数据`)
    }

    console.log('✅ 成功找到学生能力数据，使用表:', tableName);

    // 提取 C19, C20, C21, C22, C23 字段的值
    const extractValue = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
        return Number(value);
      }
      return 0;
    };

    return [
      extractValue(abilityData.C19),
      extractValue(abilityData.C20),
      extractValue(abilityData.C21),
      extractValue(abilityData.C22),
      extractValue(abilityData.C23)
    ];
  } catch (error) {
    console.error('❌ getStudentAbilityData 函数执行失败:', error)
    // 重新抛出错误，让上层知道数据缺失
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`获取学生能力数据失败: ${error}`)
  }
} 