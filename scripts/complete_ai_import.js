const fs = require('fs');
const path = require('path');

// 读取完整AI数据
const dataFile = path.join(__dirname, 'Cohort2023_Predictions_ai_full_data.json');
const fullData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

console.log(`AI表完整数据行数: ${fullData.length}`);

// 正确的字段列表（按实际数据库表结构）
const correctFields = [
  'snh', 'major', 'grade', 'count', 'current_public', 'current_practice', 'current_math_science',
  'current_political', 'current_basic_subject', 'current_innovation', 'current_english',
  'current_basic_major', 'current_major', 'current_pred', 'current_prob1', 'current_prob2',
  'current_prob3', 'target1_min_required_score', 'target2_min_required_score',
  'moral_law', 'modern_chinese_history', 'marxism_basic', 'maogai', 'situation_policy1',
  'situation_policy2', 'situation_policy3', 'situation_policy4', 'situation_policy5',
  'xigai', 'physical_education', 'military_theory', 'mental_health', 'safety_education',
  'english_1', 'english_2', 'listening_1', 'listening_2', 'linear_algebra', 'advanced_math_a1',
  'advanced_math_a2', 'physics_c', 'discrete_math', 'probability_statistics', 'computation_method',
  'intro_computing_prog', 'electronic_system2', 'formal_lang_automata', 'data_structure_main',
  'database_system', 'digital_circuit', 'java_advanced', 'operating_system', 'ai_intro',
  'product_dev_mgmt', 'machine_learning', 'computational_innovation', 'ai_law',
  'software_engineering', 'data_mining', 'embedded_system', 'reasoning_agent',
  'visual_computing', 'neural_network_dl', 'intelligent_game', 'cognitive_robot',
  'nlp', 'military_training', 'sixiang_daode_shijian', 'zhongguo_jinxiandai_shijian',
  'makesi_shijian', 'maogai_shijian', 'physics_exp_c', 'intro_computing_prog_design',
  'data_structure_algo', 'academic_communication1', 'academic_communication2', 'design_build_zhineng',
  'ai_major_internship', 'personal_dev_plan1', 'personal_dev_plan2', 'personal_dev_plan3',
  'graduation_project'
];

// 修复字段映射函数
function fixFieldMapping(row) {
  const fixedRow = {};
  
  correctFields.forEach(correctField => {
    if (row.hasOwnProperty(correctField)) {
      fixedRow[correctField] = row[correctField];
    } else if (correctField === 'data_structure_main' && row.hasOwnProperty('data_structure')) {
      fixedRow[correctField] = row['data_structure'];
    } else if (correctField === 'data_structure_algo' && row.hasOwnProperty('data_structure2')) {
      fixedRow[correctField] = row['data_structure2'];
    } else {
      fixedRow[correctField] = null;
    }
  });
  
  return fixedRow;
}

// 函数：转换值为SQL格式
function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  } else if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  } else if (typeof value === 'number') {
    return isNaN(value) ? 'NULL' : value;
  } else {
    return `'${String(value).replace(/'/g, "''")}'`;
  }
}

// 修复所有数据并跳过已导入的前5行
const fixedData = fullData.map(row => fixFieldMapping(row));
const remainingData = fixedData.slice(5); // 跳过前5行

console.log(`剩余需要导入的数据行数: ${remainingData.length}`);

// 分批处理 - 每批10行
const batchSize = 10;
const totalBatches = Math.ceil(remainingData.length / batchSize);

console.log(`总计 ${totalBatches} 个批次，每批最多 ${batchSize} 行`);

// 生成所有批次的SQL
for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
  const startIndex = batchIndex * batchSize;
  const endIndex = Math.min(startIndex + batchSize, remainingData.length);
  const batch = remainingData.slice(startIndex, endIndex);
  
  console.log(`\n批次 ${batchIndex + 1}/${totalBatches}: 剩余数据第 ${startIndex + 1}-${endIndex} 行 (共${batch.length}行)`);
  
  // 为每批生成VALUES子句
  const valueRows = batch.map(row => {
    const values = correctFields.map(field => formatValue(row[field]));
    return `(${values.join(', ')})`;
  });
  
  // 生成完整的INSERT语句
  const sql = `INSERT INTO cohort2023_predictions_ai (${correctFields.join(', ')}) VALUES \n${valueRows.join(',\n')};`;
  
  // 保存SQL到文件
  const sqlFileName = `ai_final_batch_${String(batchIndex + 1).padStart(2, '0')}.sql`;
  const sqlFilePath = path.join(__dirname, sqlFileName);
  fs.writeFileSync(sqlFilePath, sql, 'utf8');
  
  console.log(`✓ ${sqlFileName} (${batch.length} 行)`);
}

console.log(`\n🎉 所有 ${totalBatches} 个剩余数据批次SQL文件已生成！`);
console.log(`📊 进度: 已导入 5 行，待导入 ${remainingData.length} 行，总共 ${fullData.length} 行`);

console.log('\n生成的文件列表：');
for (let i = 1; i <= totalBatches; i++) {
  console.log(`  - ai_final_batch_${String(i).padStart(2, '0')}.sql`);
}

