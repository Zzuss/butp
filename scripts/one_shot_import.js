const fs = require('fs');
const path = require('path');

console.log('🚀 一次性导入所有剩余AI数据 (仿照 admin/prediction 高效导入)');

// 读取所有剩余数据
const allData = JSON.parse(fs.readFileSync(path.join(__dirname, 'ai_ready_for_insert.json'), 'utf8'));

console.log(`数据量: ${allData.length} 行`);
console.log(`当前数据库已有: 35 行`);
console.log(`导入后总数: ${35 + allData.length} = 96 行 ✅`);

// 检查数据完整性
const sampleRow = allData[0];
const fieldCount = Object.keys(sampleRow).length;

console.log(`\n📊 数据检查:`);
console.log(`- 字段数: ${fieldCount}`);
console.log(`- 关键字段存在: maogai=${sampleRow.hasOwnProperty('maogai')}, xigai=${sampleRow.hasOwnProperty('xigai')}`);
console.log(`- 示例数据: ${sampleRow.major}, grade=${sampleRow.grade}`);

// 生成一个大的 INSERT 语句（类似管理后台的做法）
const fields = Object.keys(sampleRow);
const fieldsList = fields.join(', ');

// 生成所有VALUES行
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

// 生成完整INSERT语句
const fullInsertSQL = `INSERT INTO cohort2023_predictions_ai (${fieldsList}) VALUES\n${valueRows.join(',\n')};`;

// 保存SQL
const sqlFile = path.join(__dirname, 'ai_one_shot_insert.sql');
fs.writeFileSync(sqlFile, fullInsertSQL, 'utf8');

console.log(`\n✅ 高效导入SQL已生成:`);
console.log(`- 文件: ai_one_shot_insert.sql`);
console.log(`- 数据行数: ${allData.length} 行`);
console.log(`- SQL大小: ${Math.round(fullInsertSQL.length / 1024)}KB`);

console.log(`\n🎯 执行此SQL即可一次性完成AI表导入！`);
console.log(`📈 进度: 35 → 96 行 (完成!)`);

// 保存前几行作为验证
const preview = valueRows.slice(0, 3);
console.log(`\n📋 预览前3行:`);
preview.forEach((row, i) => {
  const shortRow = row.substring(0, 100) + '...';
  console.log(`  ${i+1}. ${shortRow}`);
});

