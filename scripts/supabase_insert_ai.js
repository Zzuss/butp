const fs = require('fs');
const path = require('path');

console.log('🚀 直接使用 Supabase .insert() 方法导入数据');

// 读取所有剩余数据
const batch1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'ai_insert_batch_01.json'), 'utf8'));
const batch2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'ai_insert_batch_02.json'), 'utf8'));

// 合并数据
const allData = [...batch1, ...batch2];
console.log(`总数据量: ${allData.length} 行`);
console.log(`当前数据库已有: 35 行`);
console.log(`导入完成后总数: ${35 + allData.length} 行`);

// 检查数据格式
console.log(`\n📋 数据检查:`);
console.log(`- 字段数: ${Object.keys(allData[0]).length}`);
console.log(`- maogai字段: ${allData[0].maogai || 'NULL'}`);
console.log(`- xigai字段: ${allData[0].xigai || 'NULL'}`);

// 保存完整数据用于直接insert
const outputFile = path.join(__dirname, 'ai_ready_for_insert.json');
fs.writeFileSync(outputFile, JSON.stringify(allData, null, 2), 'utf8');

console.log(`\n✅ 数据已准备完毕:`);
console.log(`- 文件: ai_ready_for_insert.json`);
console.log(`- 格式: JSON数组，可直接用于 .insert()`);
console.log(`- 大小: ${Math.round(JSON.stringify(allData).length / 1024)}KB`);

console.log(`\n🎯 现在可以直接使用 MCP Supabase 工具进行批量插入!`);

