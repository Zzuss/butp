const fs = require('fs');
const path = require('path');

// 读取AI表的数据
const dataFile = path.join(__dirname, 'ai_data_for_import.json');
const allData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

console.log(`总数据行数: ${allData.length}`);
console.log('前3行已导入，开始从第4行导入...');

// 准备批量插入的SQL - 从第4行开始（索引3）
const remainingData = allData.slice(3);
console.log(`剩余需要导入的行数: ${remainingData.length}`);

// 生成批量插入SQL
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
  'intro_computing_prog', 'electronic_system2', 'formal_lang_automata', 'data_structure_main',
  'database_system', 'digital_circuit', 'java_advanced', 'operating_system', 'ai_intro',
  'product_dev_mgmt', 'machine_learning', 'computer_networks', 'software_engineering',
  'design_build_training_ai', 'ai_major_internship', 'graduation_design', 'physics_experiment_c',
  'intro_computing_prog_design', 'data_structure_algo', 'software_engineering_training',
  'innovation_entrepreneurship1', 'innovation_entrepreneurship2', 'innovation_entrepreneurship3',
  'innovation_entrepreneurship4', 'innovation_entrepreneurship5', 'innovation_entrepreneurship6',
  'innovation_entrepreneurship7', 'innovation_entrepreneurship8', 'innovation_entrepreneurship9',
  'innovation_entrepreneurship10', 'innovation_entrepreneurship11', 'innovation_entrepreneurship12',
  'innovation_entrepreneurship13', 'innovation_entrepreneurship14', 'innovation_entrepreneurship15',
  'innovation_entrepreneurship16', 'innovation_entrepreneurship17', 'innovation_entrepreneurship18',
  'innovation_entrepreneurship19', 'innovation_entrepreneurship20', 'innovation_entrepreneurship21',
  'innovation_entrepreneurship22', 'innovation_entrepreneurship23', 'innovation_entrepreneurship24',
  'innovation_entrepreneurship25', 'innovation_entrepreneurship26', 'innovation_entrepreneurship27',
  'innovation_entrepreneurship28'
];

// 分批处理，每批10行
const batchSize = 10;
const batches = [];

for (let i = 0; i < remainingData.length; i += batchSize) {
  batches.push(remainingData.slice(i, i + batchSize));
}

console.log(`分成 ${batches.length} 批处理`);

// 生成每批的SQL
batches.forEach((batch, batchIndex) => {
  console.log(`\n=== 第 ${batchIndex + 1} 批 (${batch.length} 行) ===`);
  
  const valueRows = batch.map(row => {
    const values = fields.map(field => {
      const value = row[field];
      if (value === null || value === undefined || value === '') {
        return 'NULL';
      } else if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      } else {
        return value;
      }
    });
    return `(${values.join(', ')})`;
  });
  
  const sql = `INSERT INTO cohort2023_predictions_ai (${fields.join(', ')}) VALUES \n${valueRows.join(',\n')};`;
  
  // 保存SQL到文件
  const sqlFile = path.join(__dirname, `ai_batch_${batchIndex + 1}.sql`);
  fs.writeFileSync(sqlFile, sql, 'utf8');
  console.log(`SQL已保存到: ai_batch_${batchIndex + 1}.sql`);
});

console.log('\n所有批次SQL文件已生成完成！');

