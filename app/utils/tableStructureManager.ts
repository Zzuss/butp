/**
 * 表结构管理工具
 * 用于在导入数据前预先检测和修复表结构差异
 */

import { createClient } from '@supabase/supabase-js';
import { normalizeColumnName } from './columnNormalizer';

// 配置Supabase
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTEyNTE0OSwiZXhwIjoyMDY2NzAxMTQ5fQ.whnaPtFqNEuEWdWg7p5FLIgQprlYShc7yAx6FJ1e-5s';

/**
 * 获取表的当前列结构
 * @param tableName 表名
 * @returns 表的列名数组，如果表不存在则返回空数组
 */
export async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { data, error } = await supabase
      .rpc('execute_sql', { 
        query: `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}'` 
      });
    
    if (error) {
      console.log(`获取表结构失败: ${error.message}`);
      return [];
    }
    
    return data ? data.map((row: any) => row.column_name) : [];
  } catch (error) {
    console.error('获取表结构失败:', error);
    return [];
  }
}

/**
 * 检查表是否存在
 * @param tableName 表名
 * @returns 表是否存在
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { data, error } = await supabase
      .rpc('execute_sql', { 
        query: `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${tableName}'
        ) as exists` 
      });
    
    if (error) {
      console.log(`检查表是否存在失败: ${error.message}`);
      return false;
    }
    
    return data && data.length > 0 ? data[0].exists : false;
  } catch (error) {
    console.error('检查表是否存在失败:', error);
    return false;
  }
}

/**
 * 分析数据列结构
 * @param data 数据对象数组
 * @returns 列名和类型的映射
 */
export function analyzeDataColumns(data: any[]): Record<string, string> {
  if (!data || data.length === 0) {
    return {};
  }
  
  const columnTypes: Record<string, string> = {};
  const sampleRow = data[0];
  
  // 从第一行数据推断列类型
  for (const key in sampleRow) {
    const value = sampleRow[key];
    let type = 'text'; // 默认为text类型
    
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        type = 'bigint';
      } else {
        type = 'double precision';
      }
    } else if (value === null || value === undefined) {
      // 对于null/undefined值，根据字段名推断类型
      if (key.includes('count') || key.includes('pred') || key.includes('score') || key.includes('target')) {
        type = 'bigint';
      } else if (key.includes('current_') || key.includes('prob')) {
        type = 'double precision';
      }
    }
    
    columnTypes[key] = type;
  }
  
  return columnTypes;
}

/**
 * 预先准备表结构
 * 检测并修复表结构差异，确保所有必要的列都存在
 * @param tableName 表名
 * @param data 要导入的数据
 * @param forceRecreate 是否强制重建表
 * @returns 处理结果
 */
export async function prepareTableStructure(
  tableName: string, 
  data: any[], 
  forceRecreate: boolean = false
): Promise<{ 
  success: boolean, 
  message: string, 
  addedColumns?: string[], 
  recreated?: boolean 
}> {
  try {
    if (!data || data.length === 0) {
      return { success: false, message: '没有数据可以导入' };
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const exists = await tableExists(tableName);
    
    // 分析数据列结构
    const dataColumns = Object.keys(data[0]);
    const normalizedDataColumns = dataColumns.map(normalizeColumnName);
    const columnTypes = analyzeDataColumns(data);
    
    // 如果表不存在或强制重建，则创建表
    if (!exists || forceRecreate) {
      // 生成创建表SQL
      const columns = dataColumns.map(key => {
        const normalizedKey = normalizeColumnName(key);
        return `"${normalizedKey}" ${columnTypes[key] || 'text'}`;
      }).join(',\n  ');
      
      const dropSQL = `DROP TABLE IF EXISTS "${tableName}";`;
      const createSQL = `CREATE TABLE "${tableName}" (\n  ${columns}\n);`;
      
      // 执行SQL
      await supabase.rpc('execute_sql', { query: dropSQL });
      await supabase.rpc('execute_sql', { query: createSQL });
      
      console.log(`表 ${tableName} ${exists ? '重建' : '创建'}成功`);
      return { 
        success: true, 
        message: `表 ${tableName} ${exists ? '重建' : '创建'}成功`,
        recreated: true 
      };
    }
    
    // 如果表存在且不强制重建，则检查列差异
    const tableColumns = await getTableColumns(tableName);
    const normalizedTableColumns = tableColumns.map(normalizeColumnName);
    
    // 找出缺失的列
    const missingColumns = normalizedDataColumns.filter(col => 
      !normalizedTableColumns.includes(col)
    );
    
    if (missingColumns.length === 0) {
      return { success: true, message: '表结构已经符合要求，无需修改' };
    }
    
    // 为缺失的列生成ALTER TABLE语句
    const addedColumns: string[] = [];
    for (const normalizedCol of missingColumns) {
      // 找到对应的原始列名
      const originalCol = dataColumns.find(col => 
        normalizeColumnName(col) === normalizedCol
      ) || normalizedCol;
      
      const type = columnTypes[originalCol] || 'text';
      const alterSQL = `ALTER TABLE "${tableName}" ADD COLUMN "${normalizedCol}" ${type};`;
      
      try {
        await supabase.rpc('execute_sql', { query: alterSQL });
        addedColumns.push(normalizedCol);
      } catch (error) {
        console.error(`添加列 ${normalizedCol} 失败:`, error);
      }
    }
    
    if (addedColumns.length > 0) {
      return { 
        success: true, 
        message: `成功添加 ${addedColumns.length} 个缺失的列`,
        addedColumns 
      };
    } else if (missingColumns.length > 0) {
      // 如果有缺失的列但没有成功添加任何列，尝试重建表
      return await prepareTableStructure(tableName, data, true);
    }
    
    return { success: true, message: '表结构已经符合要求，无需修改' };
  } catch (error) {
    console.error('准备表结构失败:', error);
    return { 
      success: false, 
      message: `准备表结构失败: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * 创建标准化的表结构
 * 创建一个新表，使用标准化的列名
 * @param tableName 表名
 * @param data 数据对象数组
 * @returns 处理结果
 */
export async function createNormalizedTable(
  tableName: string, 
  data: any[]
): Promise<{
  success: boolean,
  message: string,
  columnMapping?: Record<string, string>
}> {
  try {
    if (!data || data.length === 0) {
      return { success: false, message: '没有数据可以处理' };
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // 获取原始列名
    const originalColumns = Object.keys(data[0]);
    
    // 创建列名映射
    const columnMapping: Record<string, string> = {};
    const normalizedColumns: string[] = [];
    
    for (const col of originalColumns) {
      const normalizedCol = normalizeColumnName(col);
      columnMapping[col] = normalizedCol;
      normalizedColumns.push(normalizedCol);
    }
    
    // 分析数据列类型
    const columnTypes = analyzeDataColumns(data);
    
    // 生成创建表SQL
    const columns = originalColumns.map(key => {
      const normalizedKey = normalizeColumnName(key);
      return `"${normalizedKey}" ${columnTypes[key] || 'text'}`;
    }).join(',\n  ');
    
    const dropSQL = `DROP TABLE IF EXISTS "${tableName}";`;
    const createSQL = `CREATE TABLE "${tableName}" (\n  ${columns}\n);`;
    
    // 执行SQL
    await supabase.rpc('execute_sql', { query: dropSQL });
    await supabase.rpc('execute_sql', { query: createSQL });
    
    console.log(`标准化表 ${tableName} 创建成功`);
    
    return { 
      success: true, 
      message: `标准化表 ${tableName} 创建成功`,
      columnMapping 
    };
  } catch (error) {
    console.error('创建标准化表失败:', error);
    return { 
      success: false, 
      message: `创建标准化表失败: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}
