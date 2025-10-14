const fs = require('fs');
const path = require('path');

console.log('🚀 直接一次性导入所有AI剩余数据');

// 读取两个批次的数据
const batch1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'ai_insert_batch_01.json'), 'utf8'));
const batch2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'ai_insert_batch_02.json'), 'utf8'));

// 合并所有数据
const allData = [...batch1, ...batch2];
console.log(`总数据量: ${allData.length} 行`);

// 生成INSERT语句
const fields = Object.keys(allData[0]);
const fieldsList = fields.join(', ');

console.log(`字段数: ${fields.length}`);
console.log(`关键字段检查: maogai存在=${fields.includes('maogai')}, xigai存在=${fields.includes('xigai')}`);

// 生成VALUES部分
const valueRows = allData.map((row, index) => {
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

const insertSQL = `INSERT INTO cohort2023_predictions_ai (${fieldsList}) VALUES\n${valueRows.join(',\n')};`;

// 保存SQL文件
const outputFile = path.join(__dirname, 'ai_final_insert.sql');
fs.writeFileSync(outputFile, insertSQL, 'utf8');

console.log(`\n✅ 生成完整INSERT语句:`);
console.log(`- 文件: ai_final_insert.sql`);
console.log(`- 数据行数: ${allData.length}`);
console.log(`- SQL大小: ${Math.round(insertSQL.length / 1024)}KB`);
console.log(`- 完成后AI表总数: ${35 + allData.length}/96 行`);

// 显示前2行数据示例
console.log(`\n📋 数据示例 (前2行):`);
console.log(`第1行: snh=${allData[0].snh.substring(0,8)}..., major=${allData[0].major}, maogai=${allData[0].maogai}`);
console.log(`第2行: snh=${allData[1].snh.substring(0,8)}..., major=${allData[1].major}, xigai=${allData[1].xigai}`);

console.log(`\n🎯 下一步: 执行 ai_final_insert.sql 完成AI表数据导入!`);

