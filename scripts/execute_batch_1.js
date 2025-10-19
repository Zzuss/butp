const fs = require('fs');
const path = require('path');

// 读取第1批SQL文件
const sqlFile = path.join(__dirname, 'ai_batch_1_insert.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf8');

console.log('📊 第1批SQL统计:');
console.log(`- SQL文件大小: ${Math.round(sqlContent.length / 1024)}KB`);
console.log(`- 预估数据行数: ${(sqlContent.match(/\),/g) || []).length + 1} 行`);

// 由于SQL太大，分成两部分执行
// 找到中间位置
const lines = sqlContent.split('\n');
const valuesLines = lines.slice(1); // 跳过INSERT语句头
const midPoint = Math.floor(valuesLines.length / 2);

// 第一部分（前25行）
const firstHalf = [
  lines[0], // INSERT语句头
  ...valuesLines.slice(0, midPoint)
].join('\n');

// 修复第一部分的结尾
const firstHalfSQL = firstHalf.replace(/,$/, ';'); // 替换最后的逗号为分号

// 第二部分（后25行）
const secondHalf = [
  lines[0], // INSERT语句头
  ...valuesLines.slice(midPoint)
].join('\n');

// 保存两部分SQL
fs.writeFileSync(path.join(__dirname, 'ai_batch_1a.sql'), firstHalfSQL, 'utf8');
fs.writeFileSync(path.join(__dirname, 'ai_batch_1b.sql'), secondHalf, 'utf8');

console.log('\n✅ 已分割为两个更小的文件:');
console.log(`- ai_batch_1a.sql (前半部分)`);
console.log(`- ai_batch_1b.sql (后半部分)`);

console.log('\n🚀 现在可以分别执行这两个文件!');

