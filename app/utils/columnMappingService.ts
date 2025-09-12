/**
 * 列名映射服务
 * 用于管理和应用课程名称的不同表达方式的映射关系
 */

import { createClient } from '@supabase/supabase-js';
import { normalizeColumnName } from './columnNormalizer';

// 配置Supabase
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTEyNTE0OSwiZXhwIjoyMDY2NzAxMTQ5fQ.whnaPtFqNEuEWdWg7p5FLIgQprlYShc7yAx6FJ1e-5s';

// 列名映射表名称
const COLUMN_MAPPING_TABLE = 'column_name_mappings';

/**
 * 确保列名映射表存在
 * 如果不存在则创建表
 */
export async function ensureColumnMappingTableExists(): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // 检查表是否存在
    const { data: existsData, error: existsError } = await supabase
      .rpc('execute_sql', { 
        query: `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${COLUMN_MAPPING_TABLE}'
        ) as exists` 
      });
    
    if (existsError) {
      console.error('检查列名映射表失败:', existsError);
      return false;
    }
    
    const exists = existsData && existsData.length > 0 ? existsData[0].exists : false;
    
    if (!exists) {
      // 创建表
      const createSQL = `
        CREATE TABLE "${COLUMN_MAPPING_TABLE}" (
          id SERIAL PRIMARY KEY,
          original_name TEXT NOT NULL,
          normalized_name TEXT NOT NULL,
          source_table TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(original_name, source_table)
        );
      `;
      
      const { error: createError } = await supabase.rpc('execute_sql', { query: createSQL });
      
      if (createError) {
        console.error('创建列名映射表失败:', createError);
        return false;
      }
      
      console.log('列名映射表创建成功');
    }
    
    return true;
  } catch (error) {
    console.error('确保列名映射表存在失败:', error);
    return false;
  }
}

/**
 * 保存列名映射
 * @param mappings 列名映射数组
 * @param sourceTable 源表名
 * @returns 是否成功
 */
export async function saveColumnMappings(
  mappings: Array<{original: string, normalized: string}>,
  sourceTable?: string
): Promise<boolean> {
  try {
    // 确保表存在
    const tableExists = await ensureColumnMappingTableExists();
    if (!tableExists) {
      return false;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 批量插入映射
    const records = mappings.map(mapping => ({
      original_name: mapping.original,
      normalized_name: mapping.normalized,
      source_table: sourceTable || null
    }));
    
    // 使用upsert确保不会重复
    const { error } = await supabase
      .from(COLUMN_MAPPING_TABLE)
      .upsert(records, { 
        onConflict: 'original_name, source_table',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('保存列名映射失败:', error);
      return false;
    }
    
    console.log(`成功保存 ${mappings.length} 个列名映射`);
    return true;
  } catch (error) {
    console.error('保存列名映射失败:', error);
    return false;
  }
}

/**
 * 获取列名映射
 * @param sourceTable 源表名（可选）
 * @returns 列名映射对象
 */
export async function getColumnMappings(
  sourceTable?: string
): Promise<Record<string, string>> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let query = supabase
      .from(COLUMN_MAPPING_TABLE)
      .select('original_name, normalized_name');
    
    if (sourceTable) {
      query = query.eq('source_table', sourceTable);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('获取列名映射失败:', error);
      return {};
    }
    
    // 构建映射对象
    const mappings: Record<string, string> = {};
    data?.forEach(item => {
      mappings[item.original_name] = item.normalized_name;
    });
    
    return mappings;
  } catch (error) {
    console.error('获取列名映射失败:', error);
    return {};
  }
}

/**
 * 应用列名映射到数据
 * @param data 原始数据对象数组
 * @param sourceTable 源表名（可选）
 * @returns 应用映射后的数据对象数组
 */
export async function applyMappingsToData(
  data: any[],
  sourceTable?: string
): Promise<any[]> {
  if (!data || data.length === 0) {
    return data;
  }
  
  try {
    // 获取现有映射
    const existingMappings = await getColumnMappings(sourceTable);
    
    // 获取数据中的所有列名
    const dataColumns = Object.keys(data[0]);
    
    // 创建新的映射
    const newMappings: Array<{original: string, normalized: string}> = [];
    const allMappings: Record<string, string> = {...existingMappings};
    
    for (const col of dataColumns) {
      if (!existingMappings[col]) {
        const normalized = normalizeColumnName(col);
        if (normalized !== col) {
          newMappings.push({
            original: col,
            normalized
          });
          allMappings[col] = normalized;
        }
      }
    }
    
    // 保存新的映射
    if (newMappings.length > 0) {
      await saveColumnMappings(newMappings, sourceTable);
    }
    
    // 应用映射到数据
    return data.map(item => {
      const newItem: any = {};
      
      for (const key in item) {
        const mappedKey = allMappings[key] || key;
        newItem[mappedKey] = item[key];
      }
      
      return newItem;
    });
  } catch (error) {
    console.error('应用列名映射失败:', error);
    return data; // 出错时返回原始数据
  }
}

/**
 * 获取列名的所有变体
 * @param normalizedName 标准化的列名
 * @returns 该列名的所有变体
 */
export async function getColumnVariants(
  normalizedName: string
): Promise<string[]> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from(COLUMN_MAPPING_TABLE)
      .select('original_name')
      .eq('normalized_name', normalizedName);
    
    if (error) {
      console.error('获取列名变体失败:', error);
      return [normalizedName];
    }
    
    // 收集所有变体
    const variants = data?.map(item => item.original_name) || [];
    
    // 确保包含标准化名称本身
    if (!variants.includes(normalizedName)) {
      variants.push(normalizedName);
    }
    
    return variants;
  } catch (error) {
    console.error('获取列名变体失败:', error);
    return [normalizedName];
  }
}
