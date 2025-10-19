const fs = require('fs');
const path = require('path');

// 读取分析结果
const analysisFile = path.join(__dirname, 'cohort2023_predictions_ai_analysis.json');
const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));

console.log('=== 准备导入数据 ===');
console.log(`表名: ${analysis.tableName}`);
console.log(`字段数量: ${analysis.fieldCount}`);
console.log(`数据行数: ${analysis.rowCount}`);

// 转换数据格式
const transformedData = analysis.jsonData.map((row, index) => {
  const transformedRow = {};
  
  // 手动处理重复字段名问题
  const fieldMapping = {
    'intro_computing_prog': 'intro_computing_prog',
    '计算导论与程序设计课程设计': 'intro_computing_prog_design', 
    'data_structure': 'data_structure_main',
    '数据结构与算法课程设计': 'data_structure_algo'
  };
  
  analysis.fields.forEach(field => {
    let value = row[field.original];
    let normalizedFieldName = field.normalized;
    
    // 处理重复字段名
    if (field.original === '计算导论与程序设计课程设计') {
      normalizedFieldName = 'intro_computing_prog_design';
    } else if (field.original === '数据结构与算法课程设计') {
      normalizedFieldName = 'data_structure_algo';
    } else if (field.original === '数据结构*') {
      normalizedFieldName = 'data_structure_main';
    }
    
    // 数据类型转换
    if (field.type === 'INTEGER') {
      value = value === '' || value === null || value === undefined ? null : parseInt(value);
      if (isNaN(value)) value = null;
    } else if (field.type === 'REAL') {
      value = value === '' || value === null || value === undefined ? null : parseFloat(value);
      if (isNaN(value)) value = null;
    } else {
      value = value === '' || value === null || value === undefined ? null : String(value);
    }
    
    transformedRow[normalizedFieldName] = value;
  });
  
  return transformedRow;
});

// 输出为JSON，让用户可以检查数据
const outputFile = path.join(__dirname, 'ai_data_for_import.json');
fs.writeFileSync(outputFile, JSON.stringify(transformedData.slice(0, 5), null, 2)); // 只输出前5行样本检查

console.log(`\n=== 数据转换完成 ===`);
console.log(`转换后的数据样本已保存到: ${outputFile}`);
console.log(`总共处理了 ${transformedData.length} 行数据`);

// 生成SQL插入语句
const fieldNames = Object.keys(transformedData[0]);
console.log(`\n=== 字段列表 (${fieldNames.length}个) ===`);
fieldNames.forEach(name => console.log(`  ${name}`));

// 生成插入SQL语句模板
const insertSQL = `INSERT INTO ${analysis.tableName} (${fieldNames.join(', ')}) VALUES `;
console.log(`\n=== INSERT SQL 模板 ===`);
console.log(insertSQL);
console.log('-- 需要为每行数据生成VALUES (?, ?, ?, ...)');

// 保存完整的转换数据
const fullDataFile = path.join(__dirname, 'ai_full_data_for_import.json');
fs.writeFileSync(fullDataFile, JSON.stringify(transformedData, null, 2));
console.log(`\n完整数据已保存到: ${fullDataFile}`);
console.log('准备好进行数据导入！');

