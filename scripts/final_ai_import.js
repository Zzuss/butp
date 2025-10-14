const fs = require('fs');
const path = require('path');

console.log('🎯 最终AI表导入方案 - 10行小批次');

// 读取剩余数据
const batch1File = path.join(__dirname, 'ai_insert_batch_01.json');
const batch2File = path.join(__dirname, 'ai_insert_batch_02.json');

const allRemainingData = [];

// 合并所有剩余数据
if (fs.existsSync(batch1File)) {
  const batch1 = JSON.parse(fs.readFileSync(batch1File, 'utf8'));
  allRemainingData.push(...batch1);
}

if (fs.existsSync(batch2File)) {
  const batch2 = JSON.parse(fs.readFileSync(batch2File, 'utf8'));
  allRemainingData.push(...batch2);
}

console.log(`剩余数据总数: ${allRemainingData.length} 行`);
console.log(`当前已导入: 35 行`);
console.log(`完成后总数: ${35 + allRemainingData.length} 行`);

// 创建小批次（10行一组）
const smallBatchSize = 10;
const totalSmallBatches = Math.ceil(allRemainingData.length / smallBatchSize);

console.log(`\n📦 生成 ${totalSmallBatches} 个小批次（每批${smallBatchSize}行）:`);

// 生成小批次INSERT语句
for (let i = 0; i < totalSmallBatches; i++) {
  const start = i * smallBatchSize;
  const end = Math.min(start + smallBatchSize, allRemainingData.length);
  const smallBatch = allRemainingData.slice(start, end);
  
  // 生成INSERT SQL
  const fields = Object.keys(smallBatch[0]);
  const fieldsList = fields.join(', ');
  
  const valueRows = smallBatch.map(row => {
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
    return `  (${values.join(', ')})`;
  });
  
  const insertSQL = `INSERT INTO cohort2023_predictions_ai (${fieldsList}) VALUES\n${valueRows.join(',\n')};`;
  
  // 保存小批次SQL
  const batchFileName = `mini_batch_${String(i + 1).padStart(2, '0')}.sql`;
  const batchFilePath = path.join(__dirname, batchFileName);
  fs.writeFileSync(batchFilePath, insertSQL, 'utf8');
  
  console.log(`  ✓ ${batchFileName} (${smallBatch.length}行, ${Math.round(insertSQL.length/1024)}KB)`);
}

console.log(`\n🚀 执行建议:`);
console.log(`1. 逐个执行 mini_batch_01.sql 到 mini_batch_${String(totalSmallBatches).padStart(2, '0')}.sql`);
console.log(`2. 每个批次只有${smallBatchSize}行，执行速度快`);
console.log(`3. 出现问题时容易定位具体批次`);
console.log(`4. 完成后检查总数据量`);

console.log(`\n📊 进度跟踪:`);
console.log(`- 当前: 35/96 行`);
console.log(`- 剩余: ${allRemainingData.length} 行（${totalSmallBatches}批次）`);
console.log(`- 目标: 96 行`);

