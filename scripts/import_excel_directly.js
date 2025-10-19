const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 直接从Excel读取完整数据
function importTableDirectly(excelFileName) {
  const excelPath = path.join(__dirname, '..', 'haha', excelFileName);
  const analysisPath = path.join(__dirname, `${excelFileName.replace('.xlsx', '')}_analysis.json`);
  
  console.log(`\n=== 开始处理 ${excelFileName} ===`);
  
  // 读取分析结果获取字段映射
  const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
  console.log(`字段数: ${analysis.fieldCount}, 预期数据行数: ${analysis.rowCount}`);
  
  // 读取Excel数据
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (data.length === 0) {
    console.log('文件无数据');
    return [];
  }
  
  const headers = data[0];
  const rows = data.slice(1);
  console.log(`实际Excel数据行数: ${rows.length}`);
  console.log(`Excel表头数量: ${headers.length}`);
  
  // 转换数据格式
  const transformedData = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const transformedRow = {};
    
    // 使用分析结果中的字段映射
    analysis.fields.forEach(fieldMapping => {
      const originalHeaderIndex = headers.indexOf(fieldMapping.original);
      if (originalHeaderIndex !== -1) {
        let value = row[originalHeaderIndex];
        
        // 数据类型转换
        if (fieldMapping.type === 'INTEGER') {
          value = value && !isNaN(value) ? parseInt(value) : null;
        } else if (fieldMapping.type === 'REAL') {
          value = value && !isNaN(value) ? parseFloat(value) : null;
        } else {
          value = value !== undefined && value !== null ? String(value) : null;
          // 处理空字符串
          if (value === '' || value === 'null' || value === 'undefined') {
            value = null;
          }
        }
        
        transformedRow[fieldMapping.normalized] = value;
      } else {
        console.warn(`警告: 找不到原始表头 "${fieldMapping.original}"`);
        transformedRow[fieldMapping.normalized] = null;
      }
    });
    
    transformedData.push(transformedRow);
  }
  
  console.log(`转换完成，得到 ${transformedData.length} 行数据`);
  
  // 保存完整数据到文件
  const outputFile = path.join(__dirname, `${excelFileName.replace('.xlsx', '')}_full_data.json`);
  fs.writeFileSync(outputFile, JSON.stringify(transformedData, null, 2), 'utf8');
  console.log(`完整数据已保存到: ${outputFile}`);
  
  return transformedData;
}

// 处理AI表
console.log('开始重新导入AI表完整数据...');
const aiData = importTableDirectly('Cohort2023_Predictions_ai.xlsx');

console.log(`\n总结:`);
console.log(`- AI表实际行数: ${aiData.length}`);
console.log(`- 已保存完整数据到 JSON 文件`);

if (aiData.length > 0) {
  console.log('\n前2行数据预览:');
  console.log(JSON.stringify(aiData.slice(0, 2), null, 2));
}

