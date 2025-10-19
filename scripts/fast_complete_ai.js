// 快速完成AI表数据导入
const fs = require('fs');
const path = require('path');

console.log('🚀 快速完成AI表剩余数据导入...');
console.log('当前进度: 35/96 行已导入');
console.log('剩余批次: 4-10 (共61行)\n');

// 合并剩余批次(4-10)的SQL
let combinedSQL = '';
const remainingBatches = [4, 5, 6, 7, 8, 9, 10];

remainingBatches.forEach((batchNum, index) => {
  const fileName = `ai_final_batch_${String(batchNum).padStart(2, '0')}.sql`;
  const filePath = path.join(__dirname, fileName);
  
  if (fs.existsSync(filePath)) {
    const batchContent = fs.readFileSync(filePath, 'utf8');
    
    if (index === 0) {
      // 第一个批次保留完整的INSERT语句
      combinedSQL += batchContent.trim();
    } else {
      // 后续批次只提取VALUES部分
      const valuesStart = batchContent.indexOf('VALUES') + 6;
      const valuesContent = batchContent.substring(valuesStart).trim();
      
      // 移除末尾的分号
      const cleanValues = valuesContent.replace(/;$/, '');
      combinedSQL += ',\n' + cleanValues;
    }
  }
});

// 确保SQL以分号结尾
if (!combinedSQL.endsWith(';')) {
  combinedSQL += ';';
}

// 保存合并的SQL
const outputFile = path.join(__dirname, 'ai_remaining_data.sql');
fs.writeFileSync(outputFile, combinedSQL, 'utf8');

console.log('✅ 已生成合并SQL文件: ai_remaining_data.sql');
console.log(`📊 SQL文件大小: ${Math.round(combinedSQL.length / 1024)}KB`);

// 估算数据行数
const estimatedRows = (combinedSQL.match(/\),/g) || []).length + 1;
console.log(`📈 预估数据行数: ${estimatedRows} 行`);
console.log(`🎯 完成后总数据: ${35 + estimatedRows}/96 行`);

console.log('\n📝 执行建议:');
console.log('1. 如果SQL文件太大，可以分2-3次执行');
console.log('2. 执行完成后检查数据总数是否为96行');
console.log('3. 然后继续处理其他3个表的数据导入');

