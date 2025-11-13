const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 读取CSV文件
const csvPath = path.join(__dirname, 'sample-grades.csv');
const csvData = fs.readFileSync(csvPath, 'utf8');

// 解析CSV
const lines = csvData.trim().split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1).map(line => {
  const values = line.split(',');
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] || '';
  });
  return row;
});

// 创建工作簿
const wb = XLSX.utils.book_new();

// 创建工作表
const ws = XLSX.utils.json_to_sheet(rows);

// 添加工作表到工作簿
XLSX.utils.book_append_sheet(wb, ws, 'Grades');

// 写入Excel文件
const excelPath1 = path.join(__dirname, 'test-grades-1.xlsx');
const excelPath2 = path.join(__dirname, 'test-grades-2.xlsx');

XLSX.writeFile(wb, excelPath1);
XLSX.writeFile(wb, excelPath2);

console.log('测试Excel文件已创建:');
console.log('- test-grades-1.xlsx');
console.log('- test-grades-2.xlsx');
console.log('每个文件包含', rows.length, '条测试记录');
