const fs = require('fs');
const path = require('path');

console.log('📦 分批准备数据进行高效插入');

// 读取准备好的数据
const allData = JSON.parse(fs.readFileSync(path.join(__dirname, 'ai_ready_for_insert.json'), 'utf8'));

console.log(`总数据: ${allData.length} 行`);

// 分批（20行一批，类似管理后台的高效方式）
const batchSize = 20;
const totalBatches = Math.ceil(allData.length / batchSize);

console.log(`分成 ${totalBatches} 批，每批 ${batchSize} 行`);

// 保存各批次
for (let i = 0; i < totalBatches; i++) {
  const start = i * batchSize;
  const end = Math.min(start + batchSize, allData.length);
  const batchData = allData.slice(start, end);
  
  const batchFile = path.join(__dirname, `batch_${i + 1}.json`);
  fs.writeFileSync(batchFile, JSON.stringify(batchData, null, 2), 'utf8');
  
  console.log(`批次 ${i + 1}: ${batchData.length} 行 -> batch_${i + 1}.json`);
}

console.log(`\n🚀 现在可以逐批直接插入数据库!`);

