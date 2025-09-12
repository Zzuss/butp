/**
 * 列名标准化工具
 * 用于处理Excel文件中课程名称的微小差异，确保数据库操作的一致性
 */

/**
 * 课程名称缩写映射表
 * 将长课程名称映射为简短的缩写形式，避免数据库字段名过长问题
 */
const courseNameMapping: Record<string, string> = {
  // 只映射最长的三个课程名称
  '毛泽东思想和中国特色社会主义理论体系概论': '毛概',
  '毛泽东思想和中国特色社会主义理论体系概论（实践环节）': '毛概（实践环节）',
  '毛泽东思想和中国特色社会主义理论体系概论（实践环节））': '毛概（实践环节）', // 修复重复括号的版本
  '习近平新时代中国特色社会主义思想概论': '习概'
};

/**
 * 标准化列名
 * 处理常见的差异，如括号格式、多余空格、重复括号等，并应用课程名称缩写
 * @param columnName 原始列名
 * @returns 标准化后的列名
 */
export function normalizeColumnName(columnName: string): string {
  if (!columnName) return columnName;
  
  let normalized = columnName;
  
  // 1. 修复重复的括号 - 如 "课程（实践环节））" -> "课程（实践环节）"
  normalized = fixRepeatedBrackets(normalized);
  
  // 2. 统一括号格式 - 将英文括号替换为中文括号，保持一致性
  normalized = standardizeBrackets(normalized);
  
  // 3. 移除括号内多余的空格 - 如 "课程（ 实践环节 ）" -> "课程（实践环节）"
  normalized = removeExcessSpacesInBrackets(normalized);
  
  // 4. 移除首尾空格
  normalized = normalized.trim();
  
  // 5. 处理连续多个空格为单个空格
  normalized = normalized.replace(/\s+/g, ' ');
  
  // 6. 应用课程名称缩写映射
  normalized = applyCourseNameMapping(normalized);
  
  return normalized;
}

/**
 * 应用课程名称缩写映射
 * 将长课程名称替换为简短的缩写形式
 * @param columnName 列名
 * @returns 应用缩写映射后的列名
 */
function applyCourseNameMapping(columnName: string): string {
  // 直接匹配
  if (courseNameMapping[columnName]) {
    return courseNameMapping[columnName];
  }
  
  // 尝试移除星号后匹配
  const nameWithoutStar = columnName.replace(/\*$/, '');
  if (courseNameMapping[nameWithoutStar]) {
    return courseNameMapping[nameWithoutStar];
  }
  
  // 如果没有匹配，返回原名称
  return columnName;
}

/**
 * 修复重复的括号
 * @param text 输入文本
 * @returns 修复后的文本
 */
function fixRepeatedBrackets(text: string): string {
  // 修复重复的右括号 - 如 "课程（实践环节））" -> "课程（实践环节）"
  let result = text;
  while (result.includes('））')) {
    result = result.replace('））', '）');
  }
  while (result.includes('))')) {
    result = result.replace('))', ')');
  }
  
  // 修复重复的左括号 - 如 "课程（（实践环节）" -> "课程（实践环节）"
  while (result.includes('（（')) {
    result = result.replace('（（', '（');
  }
  while (result.includes('((')) {
    result = result.replace('((', '(');
  }
  
  return result;
}

/**
 * 统一括号格式
 * @param text 输入文本
 * @returns 标准化括号后的文本
 */
function standardizeBrackets(text: string): string {
  // 将英文括号替换为中文括号
  return text.replace(/\(/g, '（').replace(/\)/g, '）');
}

/**
 * 移除括号内多余的空格
 * @param text 输入文本
 * @returns 处理后的文本
 */
function removeExcessSpacesInBrackets(text: string): string {
  // 匹配中文括号内的内容
  const chineseBracketPattern = /（([^（）]*)）/g;
  let result = text;
  
  // 处理中文括号
  result = result.replace(chineseBracketPattern, (match, content) => {
    return `（${content.trim().replace(/\s+/g, ' ')}）`;
  });
  
  // 匹配英文括号内的内容
  const englishBracketPattern = /\(([^()]*)\)/g;
  
  // 处理英文括号
  result = result.replace(englishBracketPattern, (match, content) => {
    return `(${content.trim().replace(/\s+/g, ' ')})`;
  });
  
  return result;
}

/**
 * 创建列名映射
 * 生成原始列名到标准化列名的映射
 * @param columns 原始列名数组
 * @returns 映射对象，键为原始列名，值为标准化列名
 */
export function createColumnMapping(columns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  for (const column of columns) {
    const normalized = normalizeColumnName(column);
    mapping[column] = normalized;
  }
  
  return mapping;
}

/**
 * 应用列名映射到数据对象
 * 将数据对象的键名从原始列名转换为标准化列名
 * @param data 原始数据对象数组
 * @param mapping 列名映射
 * @returns 转换后的数据对象数组
 */
export function applyColumnMapping(data: any[], mapping: Record<string, string>): any[] {
  return data.map(item => {
    const newItem: any = {};
    
    for (const key in item) {
      const normalizedKey = mapping[key] || key;
      newItem[normalizedKey] = item[key];
    }
    
    return newItem;
  });
}

/**
 * 检测并生成列名差异报告
 * 比较两组列名，找出差异并生成报告
 * @param sourceColumns 源列名数组
 * @param targetColumns 目标列名数组
 * @returns 差异报告对象
 */
export function detectColumnDifferences(sourceColumns: string[], targetColumns: string[]): {
  missing: string[],
  different: Array<{original: string, normalized: string}>,
  report: string
} {
  const normalizedSourceColumns = sourceColumns.map(normalizeColumnName);
  const normalizedTargetColumns = targetColumns.map(normalizeColumnName);
  
  // 找出缺失的列
  const missing = normalizedSourceColumns.filter(col => !normalizedTargetColumns.includes(col));
  
  // 找出标准化后不同的列
  const different = sourceColumns.map((col, index) => {
    const normalized = normalizedSourceColumns[index];
    return { original: col, normalized };
  }).filter(item => item.original !== item.normalized);
  
  // 生成报告
  let report = `列名差异报告:\n`;
  
  if (missing.length > 0) {
    report += `\n缺失的列 (${missing.length}):\n${missing.join('\n')}\n`;
  }
  
  if (different.length > 0) {
    report += `\n需要标准化的列 (${different.length}):\n`;
    different.forEach(item => {
      report += `原始: "${item.original}" -> 标准化: "${item.normalized}"\n`;
    });
  }
  
  if (missing.length === 0 && different.length === 0) {
    report += `\n没有发现列名差异。`;
  }
  
  return { missing, different, report };
}
