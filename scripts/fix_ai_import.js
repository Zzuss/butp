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

// 检查字段映射并修复数据
function fixFieldMapping(row) {
  const fixedRow = {};
  
  // 字段名映射修复
  const fieldMappingFix = {
    'data_structure': 'data_structure_main',
    'data_structure2': 'data_structure_algo'
  };
  
  correctFields.forEach(correctField => {
    // 直接映射
    if (row.hasOwnProperty(correctField)) {
      fixedRow[correctField] = row[correctField];
    } else {
      // 尝试反向映射修复
      let found = false;
      for (const [oldName, newName] of Object.entries(fieldMappingFix)) {
        if (newName === correctField && row.hasOwnProperty(oldName)) {
          fixedRow[correctField] = row[oldName];
          found = true;
          break;
        }
      }
      if (!found) {
        // 如果找不到，设为null
        fixedRow[correctField] = null;
      }
    }
  });
  
  return fixedRow;
}

// 修复所有数据行
const fixedData = fullData.map(row => fixFieldMapping(row));

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

// 生成一个完整的测试插入语句（前5行）
console.log('\n生成测试插入语句（前5行）...');

const testData = fixedData.slice(0, 5);
const valueRows = testData.map(row => {
  const values = correctFields.map(field => formatValue(row[field]));
  return `(${values.join(', ')})`;
});

const testSQL = `INSERT INTO cohort2023_predictions_ai (${correctFields.join(', ')}) VALUES \n${valueRows.join(',\n')};`;

// 保存测试SQL
const testSQLFile = path.join(__dirname, 'ai_test_insert.sql');
fs.writeFileSync(testSQLFile, testSQL, 'utf8');

console.log(`✓ 测试SQL已保存到: ai_test_insert.sql`);
console.log(`✓ 测试数据行数: ${testData.length}`);
console.log(`✓ 字段数: ${correctFields.length}`);

// 显示前2行数据的字段映射情况
console.log('\n前2行数据字段映射检查:');
console.log('原始字段数:', Object.keys(fullData[0]).length);
console.log('修复后字段数:', Object.keys(fixedData[0]).length);

// 检查关键字段
const keyFields = ['maogai', 'xigai', 'data_structure_main', 'data_structure_algo'];
keyFields.forEach(field => {
  console.log(`${field}: ${fixedData[0][field] !== undefined ? '✓存在' : '❌缺失'}`);
});

