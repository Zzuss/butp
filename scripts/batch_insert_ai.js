const fs = require('fs');
const path = require('path');

// 模拟 supabase.from().insert() 的批量导入逻辑
// 读取完整AI数据
const dataFile = path.join(__dirname, 'Cohort2023_Predictions_ai_full_data.json');
const fullData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

console.log('🚀 使用批量 insert 方式导入AI表数据');
console.log(`总数据量: ${fullData.length} 行`);
console.log('当前已导入: 35 行');
console.log('剩余待导入: 61 行\n');

// 字段映射修复函数
function fixFieldMapping(row) {
  const fixedRow = {};
  
  // 正确的字段列表
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

// 修复所有数据并跳过已导入的前35行
const fixedData = fullData.map(row => fixFieldMapping(row));
const remainingData = fixedData.slice(35); // 跳过前35行

console.log(`待导入数据: ${remainingData.length} 行`);

// 分批处理 - 每批50行（比1000行小一些更安全）
const batchSize = 50;
const totalBatches = Math.ceil(remainingData.length / batchSize);

console.log(`分成 ${totalBatches} 批，每批最多 ${batchSize} 行\n`);

// 生成所有批次的JSON数据
for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
  const startIndex = batchIndex * batchSize;
  const endIndex = Math.min(startIndex + batchSize, remainingData.length);
  const batch = remainingData.slice(startIndex, endIndex);
  
  console.log(`批次 ${batchIndex + 1}/${totalBatches}: 第 ${startIndex + 36}-${endIndex + 35} 行 (${batch.length}行)`);
  
  // 保存每批数据为JSON文件
  const jsonFileName = `ai_insert_batch_${String(batchIndex + 1).padStart(2, '0')}.json`;
  const jsonFilePath = path.join(__dirname, jsonFileName);
  fs.writeFileSync(jsonFilePath, JSON.stringify(batch, null, 2), 'utf8');
  
  console.log(`  ✓ ${jsonFileName}`);
}

console.log(`\n📋 总结:`);
console.log(`- 已生成 ${totalBatches} 个批次JSON文件`);
console.log(`- 每个文件包含最多 ${batchSize} 行数据`);
console.log(`- 使用 Supabase .insert() 方法导入更快更稳定`);
console.log(`- 完成后AI表将有 ${fullData.length} 行数据`);

console.log('\n🔄 下一步: 使用 MCP Supabase 工具逐批执行 insert 操作');

