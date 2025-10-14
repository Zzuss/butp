const fs = require('fs');
const path = require('path');

console.log('🔄 分割大SQL为3个部分进行高效导入');

// 读取完整SQL
const sqlFile = path.join(__dirname, 'ai_one_shot_insert.sql');
const fullSQL = fs.readFileSync(sqlFile, 'utf8');

console.log(`原始SQL大小: ${Math.round(fullSQL.length / 1024)}KB`);

// 拆分成行
const lines = fullSQL.split('\n');
const header = lines[0]; // INSERT语句头
const valueLines = lines.slice(1, -1); // VALUES行（去掉最后的分号行）

console.log(`VALUES行数: ${valueLines.length}`);

// 分成3部分，每部分约20行
const part1Lines = valueLines.slice(0, 20);
const part2Lines = valueLines.slice(20, 40);  
const part3Lines = valueLines.slice(40);

// 生成3个分割的SQL
function createPartSQL(partLines, isLast = false) {
  const adjustedLines = partLines.map((line, index) => {
    if (isLast && index === partLines.length - 1) {
      // 最后一部分的最后一行去掉逗号
      return line.replace(/,$/, '');
    }
    return line;
  });
  
  return header + '\n' + adjustedLines.join('\n') + ';';
}

const part1SQL = createPartSQL(part1Lines);
const part2SQL = createPartSQL(part2Lines);
const part3SQL = createPartSQL(part3Lines, true);

// 保存3个部分
fs.writeFileSync(path.join(__dirname, 'ai_part1.sql'), part1SQL, 'utf8');
fs.writeFileSync(path.join(__dirname, 'ai_part2.sql'), part2SQL, 'utf8');
fs.writeFileSync(path.join(__dirname, 'ai_part3.sql'), part3SQL, 'utf8');

console.log(`\n✅ 分割完成:`);
console.log(`- ai_part1.sql: ${part1Lines.length} 行 (${Math.round(part1SQL.length/1024)}KB)`);
console.log(`- ai_part2.sql: ${part2Lines.length} 行 (${Math.round(part2SQL.length/1024)}KB)`);
console.log(`- ai_part3.sql: ${part3Lines.length} 行 (${Math.round(part3SQL.length/1024)}KB)`);

console.log(`\n🚀 现在可以依次执行3个小文件完成导入！`);
console.log(`📊 进度: 36 → 56 → 76 → 96 行`);

