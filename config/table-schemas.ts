/**
 * 表结构配置文件
 * 用于管理不同预测表的字段映射，避免字段不存在的错误
 */

// 基础字段（所有预测表都应该有的）
export const BASE_FIELDS = [
  'SNH',
  'major', 
  'grade',
  'count',
  'trent_pubent',
  't_pract',
  't_math',
  'h_sent_polit',
  't_basic_snt',
  'innovrent_e',
  'enght_basic',
  'rrent_maj',
  'rrent_prin_req',
  'quilin_requi'
];

// 通用课程字段（所有预测表都应该有的）
export const COMMON_COURSE_FIELDS = [
  "思想道德与法治",
  "中国近现代史纲要",
  "马克思主义基本原理",
  "毛泽东思想和中国特色社会主义理论体系概论",
  "形势与政策1",
  "形势与政策2",
  "形势与政策3",
  "形势与政策4",
  "形势与政策5",
  "习近平新时代中国特色社会主义思想概论",
  "体育基础",
  "军事理论",
  "大学生心理健康",
  "安全教育",
  "综合英语（上）",
  "综合英语（下）",
  "进阶听说（上）",
  "进阶听说（下）",
  "线性代数",
  "高等数学A(上)",
  "高等数学A(下)",
  "大学物理D（上）",
  "大学物理D（下）",
  "工程数学",
  "概率论与随机过程",
  "程序设计基础",
  "数据设计",
  "Java高级语言程序设计",
  "软件工程",
  "电子信息工程专业导论",
  "电子系统基础",
  "电子电路基础",
  "信号与系统",
  "数字电路设计",
  "数字信号处理",
  "计算机网络",
  "人工智能导论",
  "产品开发与管理",
  "电磁场与电磁波",
  "通信原理I",
  "多媒体基础",
  "数字音频基础",
  "信息论",
  "机器学习",
  "高级变换",
  "图形与视频处理",
  "交互式媒体设计",
  "3D图形程序设计",
  "深度学习与计算视觉",
  "军训",
  "思想道德与法治（实践环节）",
  "毛泽东思想和中国特色社会主义理论体系概论实",
  "物理实验C",
  "电路实验",
  "学术交流技能1",
  "学术交流技能2",
  "Design & Build实训（电子）",
  "通信原理实验",
  "电子工艺实习",
  "电子信息工程专业实习",
  "个人发展计划1",
  "个人发展计划2",
  "个人发展计划3",
  "毕业设计"
];

// 表名到字段的映射
export const TABLE_FIELD_MAPPING: Record<string, string[]> = {
  // 电子信息工程专业预测表
  'Cohort2023_Predictions_ee': [...BASE_FIELDS, ...COMMON_COURSE_FIELDS],
  
  // 物联网专业预测表（如果有的话）
  'Cohort_predictions_iot': [...BASE_FIELDS, ...COMMON_COURSE_FIELDS],
  
  // 其他专业预测表可以在这里添加
  'Cohort2023_Predictions_cs': [...BASE_FIELDS, ...COMMON_COURSE_FIELDS], // 计算机科学
  'Cohort2023_Predictions_me': [...BASE_FIELDS, ...COMMON_COURSE_FIELDS], // 机械工程
};

// 获取表的字段列表
export function getFieldsByTable(tableName: string): string[] {
  // 如果表名在映射中存在，使用预定义的字段
  if (TABLE_FIELD_MAPPING[tableName]) {
    return TABLE_FIELD_MAPPING[tableName];
  }
  
  // 如果表名不在映射中，使用通用字段
  console.warn(`⚠️  表 ${tableName} 未在配置中定义，使用通用字段`);
  return [...BASE_FIELDS, ...COMMON_COURSE_FIELDS];
}

// 验证字段是否存在于表中
export async function validateTableFields(supabase: any, tableName: string, fields: string[]): Promise<string[]> {
  try {
    // 查询表的实际结构
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', tableName)
      .eq('table_schema', 'public');
    
    if (error) {
      console.warn(`⚠️  无法验证表 ${tableName} 的字段，使用配置字段`);
      return fields;
    }
    
    const existingColumns = data?.map(col => col.column_name) || [];
    console.log(`✅ 表 ${tableName} 实际存在的字段:`, existingColumns.slice(0, 5), '...');
    
    // 过滤出实际存在的字段
    const validFields = fields.filter(field => existingColumns.includes(field));
    const invalidFields = fields.filter(field => !existingColumns.includes(field));
    
    if (invalidFields.length > 0) {
      console.warn(`⚠️  表 ${tableName} 中不存在的字段:`, invalidFields);
    }
    
    return validFields;
  } catch (error) {
    console.warn(`⚠️  验证表 ${tableName} 字段失败:`, error);
    return fields;
  }
}
