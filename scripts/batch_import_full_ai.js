const fs = require('fs');
const path = require('path');

// 读取完整AI数据
const dataFile = path.join(__dirname, 'Cohort2023_Predictions_ai_full_data.json');
const fullData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

console.log(`AI表完整数据行数: ${fullData.length}`);

// 字段列表（按创建表时的顺序）
const fields = [
  'snh', 'major', 'grade', 'count', 'current_public', 'current_practice', 'current_math_science',
  'current_political', 'current_basic_subject', 'current_innovation', 'current_english',
  'current_basic_major', 'current_major', 'current_pred', 'current_prob1', 'current_prob2',
  'current_prob3', 'target1_min_required_score', 'target2_min_required_score',
  'moral_law', 'modern_chinese_history', 'marxism_basic', 'maogai', 'situation_policy1',
  'situation_policy2', 'situation_policy3', 'situation_policy4', 'situation_policy5',
  'xigai', 'physical_education', 'military_theory', 'mental_health', 'safety_education',
  'english_1', 'english_2', 'listening_1', 'listening_2', 'linear_algebra', 'advanced_math_a1',
  'advanced_math_a2', 'physics_c', 'discrete_math', 'probability_statistics', 'computation_method',
  'intro_computing_prog', 'electronic_system2', 'formal_lang_automata', 'data_structure',
  'database_system', 'digital_circuit', 'java_advanced', 'operating_system', 'ai_intro',
  'product_dev_mgmt', 'machine_learning', 'computational_innovation', 'ai_law',
  'software_engineering', 'data_mining', 'embedded_system', 'reasoning_agent',
  'visual_computing', 'neural_network_dl', 'intelligent_game', 'cognitive_robot',
  'nlp', 'military_training', 'sixiang_daode_shijian', 'zhongguo_jinxiandai_shijian',
  'makesi_shijian', 'maogai_shijian', 'physics_exp_c', 'data_structure2',
  'academic_communication1', 'academic_communication2', 'design_build_zhineng',
  'ai_major_internship', 'personal_dev_plan1', 'personal_dev_plan2', 'personal_dev_plan3',
  'graduation_project'
];

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

// 分批处理 - 每批15行
const batchSize = 15;
const totalBatches = Math.ceil(fullData.length / batchSize);

console.log(`总计 ${totalBatches} 批次，每批 ${batchSize} 行`);

// 生成所有批次的SQL
for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
  const startIndex = batchIndex * batchSize;
  const endIndex = Math.min(startIndex + batchSize, fullData.length);
  const batch = fullData.slice(startIndex, endIndex);
  
  console.log(`\n批次 ${batchIndex + 1}/${totalBatches}: 行 ${startIndex + 1}-${endIndex}`);
  
  // 为每批生成VALUES子句
  const valueRows = batch.map(row => {
    const values = fields.map(field => formatValue(row[field]));
    return `(${values.join(', ')})`;
  });
  
  // 生成完整的INSERT语句
  const sql = `INSERT INTO cohort2023_predictions_ai (${fields.join(', ')}) VALUES \n${valueRows.join(',\n')};`;
  
  // 保存SQL到文件
  const sqlFileName = `ai_import_batch_${String(batchIndex + 1).padStart(2, '0')}.sql`;
  const sqlFilePath = path.join(__dirname, sqlFileName);
  fs.writeFileSync(sqlFilePath, sql, 'utf8');
  
  console.log(`✓ ${sqlFileName} (${batch.length} 行)`);
}

console.log(`\n🎉 所有 ${totalBatches} 个批次SQL文件已生成！`);
console.log('\n文件列表：');
for (let i = 1; i <= totalBatches; i++) {
  console.log(`  - ai_import_batch_${String(i).padStart(2, '0')}.sql`);
}

console.log('\n下一步：执行这些SQL文件来导入数据');

