const XLSX = require('xlsx');
const fs = require('fs');

const filePath = './butp_academic_results.xlsx';

// 检查文件是否存在
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// 读取Excel文件
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// 获取表头
const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
console.log('Excel Headers:');
console.log(headers);

// 获取前5行数据作为示例
const data = XLSX.utils.sheet_to_json(worksheet, { raw: true });
console.log('\nSample Data (first 5 rows):');
console.log(JSON.stringify(data.slice(0, 5), null, 2));

// 获取行数
console.log(`\nTotal rows: ${data.length}`); 