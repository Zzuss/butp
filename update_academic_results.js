// 导入必要的库
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// 初始化Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 读取Excel文件
async function readExcelFile(filePath) {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: true });
    console.log(`Successfully read ${data.length} rows from Excel file`);
    return data;
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
}

// 转换Excel数据为数据库格式
function transformExcelData(excelData) {
  return excelData.map(row => {
    // 将Excel列名映射到数据库列名
    return {
      SNH: row.SNH || null,
      Semester_Offered: row.Semester_Offered || null,
      Current_Major: row.Current_Major || null,
      Course_ID: row.Course_ID || null,
      Course_Name: row.Course_Name || null,
      Grade: row.Grade || null,
      Grade_Remark: row.Grade_Remark || null,
      Course_Type: row.Course_Type || null,
      Course_Attribute: row.Course_Attribute || null,
      Hours: row.Hours || null,
      Credit: row.Credit || null,
      Offering_Unit: row.Offering_Unit || null,
      Tags: row.Tags || null,
      Description: row.Description || null,
      Exam_Type: row.Exam_Type || null,
      Assessment_Method: row.Assessment_Method || null
    };
  });
}

// 更新数据库
async function updateDatabase(data) {
  try {
    // 清空现有表数据
    console.log('Deleting existing data from academic_results table...');
    const { error: deleteError } = await supabase
      .from('academic_results')
      .delete()
      .neq('SNH', 'dummy_value_that_doesnt_exist');
    
    if (deleteError) {
      console.error('Error deleting existing data:', deleteError);
      throw deleteError;
    }
    
    console.log('Successfully deleted existing data');
    
    // 由于数据量大，我们将分批插入数据
    const batchSize = 1000; // 每批1000条记录
    const totalBatches = Math.ceil(data.length / batchSize);
    console.log(`Total data rows: ${data.length}, will be processed in ${totalBatches} batches`);
    
    // 处理每个批次
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, data.length);
      const batchData = data.slice(start, end);
      
      console.log(`Processing batch ${i + 1}/${totalBatches} (rows ${start + 1} to ${end})...`);
      
      // 插入数据
      const { error: insertError } = await supabase
        .from('academic_results')
        .insert(batchData);
      
      if (insertError) {
        console.error(`Error inserting batch ${i + 1}:`, insertError);
        throw insertError;
      }
      
      console.log(`Successfully inserted batch ${i + 1}/${totalBatches}`);
      
      // 添加短暂延迟，避免API限制
      if (i < totalBatches - 1) {
        console.log('Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`Successfully updated academic_results table with ${data.length} rows`);
  } catch (error) {
    console.error('Error updating database:', error);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    const filePath = './butp_academic_results.xlsx';
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    
    // 读取Excel数据
    const excelData = await readExcelFile(filePath);
    
    // 转换数据 - 导入全部数据，不再采样
    console.log(`Preparing to import all ${excelData.length} rows...`);
    const transformedData = transformExcelData(excelData);
    
    // 更新数据库
    await updateDatabase(transformedData);
    
    console.log('Database update completed successfully');
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// 执行主函数
main(); 