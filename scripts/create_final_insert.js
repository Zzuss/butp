const fs = require('fs');
const path = require('path');

console.log('🚀 生成最终的一次性 INSERT 语句');

// 读取数据
const dataFile = path.join(__dirname, 'ai_ready_for_insert.json');
const allData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

console.log(`数据量: ${allData.length} 行`);

// 获取字段名
const fields = Object.keys(allData[0]);
const fieldsList = fields.join(', ');

// 生成VALUES行
const valueRows = allData.map(row => {
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

// 生成最终的INSERT语句
const insertSQL = `INSERT INTO cohort2023_predictions_ai (${fieldsList}) VALUES\n${valueRows.join(',\n')};`;

// 保存SQL
const sqlFile = path.join(__dirname, 'ai_final_single_insert.sql');
fs.writeFileSync(sqlFile, insertSQL, 'utf8');

console.log(`✅ 一次性INSERT语句已生成:`);
console.log(`- 文件: ai_final_single_insert.sql`);
console.log(`- 数据行数: ${allData.length} 行`);
console.log(`- SQL大小: ${Math.round(insertSQL.length / 1024)}KB`);
console.log(`- 完成后总计: ${36 + allData.length} 行`);

console.log(`\n🎯 现在执行这个SQL即可完成AI表数据导入！`);

