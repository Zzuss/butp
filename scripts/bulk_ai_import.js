const fs = require('fs');
const path = require('path');

console.log('合并剩余AI数据批次...');

// 读取所有批次文件并合并
let totalInserted = 0;
const batchFiles = [];

// 查找所有批次文件
for (let i = 2; i <= 10; i++) {
  const fileName = `ai_final_batch_${String(i).padStart(2, '0')}.sql`;
  const filePath = path.join(__dirname, fileName);
  if (fs.existsSync(filePath)) {
    batchFiles.push(fileName);
  }
}

console.log(`找到 ${batchFiles.length} 个剩余批次文件`);

// 读取批次2内容并保存为单独文件测试
if (batchFiles.length > 0) {
  const batch2Path = path.join(__dirname, 'ai_final_batch_02.sql');
  const batch2Content = fs.readFileSync(batch2Path, 'utf8');
  
  // 提取VALUES部分（去掉INSERT语句头部）
  const insertStart = batch2Content.indexOf('VALUES') + 6;
  const valuesOnly = batch2Content.substring(insertStart).trim();
  
  // 计算这批有多少行
  const valueRowCount = (valuesOnly.match(/\),/g) || []).length + 1;
  
  console.log(`\n批次2信息:`);
  console.log(`- 数据行数: ${valueRowCount}`);
  console.log(`- 字符长度: ${batch2Content.length}`);
  
  // 保存批次2为独立执行文件
  fs.writeFileSync(path.join(__dirname, 'execute_batch_2.sql'), batch2Content, 'utf8');
  console.log('✓ 批次2已准备好执行');
}

console.log('\n建议: 逐个执行批次文件以避免查询过长的问题');
console.log('当前进度: 15/96 行已导入');
console.log('剩余: 81 行待导入');

