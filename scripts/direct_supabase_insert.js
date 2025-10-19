const fs = require('fs');
const path = require('path');

console.log('🚀 直接使用 Supabase .insert() 方式导入AI表剩余数据');

// 读取准备好的数据
const dataFile = path.join(__dirname, 'ai_ready_for_insert.json');
const allData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

console.log(`📊 数据统计:`);
console.log(`- 总数据量: ${allData.length} 行`);
console.log(`- 字段数: ${Object.keys(allData[0] || {}).length}`);
console.log(`- 当前数据库已有: 36 行`);
console.log(`- 导入后总计: ${36 + allData.length} 行`);

// 检查数据质量
const sampleRow = allData[0];
console.log(`\n🔍 数据质量检查:`);
console.log(`- 样本SNH: ${sampleRow.snh?.substring(0, 16)}...`);
console.log(`- 样本专业: ${sampleRow.major}`);
console.log(`- maogai字段存在: ${sampleRow.hasOwnProperty('maogai')}`);
console.log(`- xigai字段存在: ${sampleRow.hasOwnProperty('xigai')}`);
console.log(`- grade样本值: ${sampleRow.grade}`);

// 数据验证
const requiredFields = ['snh', 'major', 'grade', 'count', 'maogai', 'xigai'];
const missingFields = requiredFields.filter(field => !sampleRow.hasOwnProperty(field));

if (missingFields.length > 0) {
  console.log(`❌ 缺少必要字段: ${missingFields.join(', ')}`);
  process.exit(1);
}

console.log(`✅ 数据验证通过，所有必要字段都存在`);

// 输出准备导入的信息
console.log(`\n📋 准备导入信息:`);
console.log(`- 表名: cohort2023_predictions_ai`);
console.log(`- 导入方式: 直接 .insert() 批量导入`);
console.log(`- 数据格式: JSON 对象数组`);

// 显示前3行数据的字段情况（简化版本）
console.log(`\n👀 前3行数据预览:`);
allData.slice(0, 3).forEach((row, index) => {
  console.log(`${index + 1}. SNH: ${row.snh.substring(0, 8)}..., Major: ${row.major}, Grade: ${row.grade}`);
});

console.log(`\n🎯 现在可以直接使用 MCP Supabase 工具执行批量插入!`);
console.log(`📝 命令: 使用 cohort2023_predictions_ai 表的 .insert() 方法`);

// 保存简化的元信息供参考
const metaInfo = {
  tableName: 'cohort2023_predictions_ai',
  totalRows: allData.length,
  fieldsCount: Object.keys(sampleRow).length,
  sampleFields: Object.keys(sampleRow).slice(0, 10),
  readyForInsert: true
};

fs.writeFileSync(path.join(__dirname, 'ai_insert_meta.json'), JSON.stringify(metaInfo, null, 2), 'utf8');
console.log(`📄 元信息已保存到: ai_insert_meta.json`);

