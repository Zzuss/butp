const fs = require('fs');
const path = require('path');

console.log('🚀 智能批量插入 - 模拟 Supabase .insert() 方法\n');

// 读取第一批数据
const batch1File = path.join(__dirname, 'ai_insert_batch_01.json');
const batch1Data = JSON.parse(fs.readFileSync(batch1File, 'utf8'));

console.log(`第1批数据: ${batch1Data.length} 行`);

// 获取所有字段名
const fieldNames = Object.keys(batch1Data[0]);
console.log(`字段数: ${fieldNames.length}`);
console.log(`关键字段检查: maogai=${batch1Data[0].maogai}, xigai=${batch1Data[0].xigai}`);

// 生成简化的INSERT语句（只显示前3行作为示例）
function generateInsertSQL(tableName, data, showLimit = 3) {
  const fields = Object.keys(data[0]);
  const fieldsList = fields.join(', ');
  
  // 函数：格式化值
  function formatValue(value) {
    if (value === null || value === undefined || value === '') {
      return 'NULL';
    } else if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    } else {
      return value;
    }
  }
  
  // 生成VALUES行
  const limitedData = data.slice(0, showLimit);
  const valueRows = limitedData.map(row => {
    const values = fields.map(field => formatValue(row[field]));
    return `  (${values.join(', ')})`;
  });
  
  const sql = `INSERT INTO ${tableName} (${fieldsList}) VALUES\n${valueRows.join(',\n')};`;
  
  return sql;
}

// 生成示例SQL
const sampleSQL = generateInsertSQL('cohort2023_predictions_ai', batch1Data, 3);

console.log(`\n📄 第1批前3行示例SQL:`);
console.log(sampleSQL.substring(0, 500) + '...\n');

// 保存第1批完整SQL
const batch1SQL = generateInsertSQL('cohort2023_predictions_ai', batch1Data, batch1Data.length);
const batch1SQLFile = path.join(__dirname, 'ai_batch_1_insert.sql');
fs.writeFileSync(batch1SQLFile, batch1SQL, 'utf8');

console.log(`✅ 第1批完整SQL已生成: ai_batch_1_insert.sql`);
console.log(`   - 数据行数: ${batch1Data.length}`);
console.log(`   - SQL大小: ${Math.round(batch1SQL.length / 1024)}KB`);

// 处理第2批
const batch2File = path.join(__dirname, 'ai_insert_batch_02.json');
if (fs.existsSync(batch2File)) {
  const batch2Data = JSON.parse(fs.readFileSync(batch2File, 'utf8'));
  const batch2SQL = generateInsertSQL('cohort2023_predictions_ai', batch2Data, batch2Data.length);
  const batch2SQLFile = path.join(__dirname, 'ai_batch_2_insert.sql');
  fs.writeFileSync(batch2SQLFile, batch2SQL, 'utf8');
  
  console.log(`✅ 第2批完整SQL已生成: ai_batch_2_insert.sql`);
  console.log(`   - 数据行数: ${batch2Data.length}`);
  console.log(`   - SQL大小: ${Math.round(batch2SQL.length / 1024)}KB`);
}

console.log(`\n🎯 执行计划:`);
console.log(`1. 执行 ai_batch_1_insert.sql (50行)`);
console.log(`2. 执行 ai_batch_2_insert.sql (11行)`);
console.log(`3. 检查总数据量是否为96行`);
console.log(`4. 继续处理其他3个表`);

console.log(`\n✨ 相比传统方法的优势:`);
console.log(`- JSON数据格式清晰，易于调试`);
console.log(`- 分批处理，减少单次操作压力`);
console.log(`- 类似 Supabase .insert() 的工作流程`);
console.log(`- 更容易排查数据问题`);

