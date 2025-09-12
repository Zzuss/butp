/**
 * 数据导入管理工具
 * 优化数据导入过程，提高批量导入成功率
 */

import { createClient } from '@supabase/supabase-js';
import { applyMappingsToData } from './columnMappingService';
import { prepareTableStructure } from './tableStructureManager';

// 配置Supabase
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

/**
 * 导入结果接口
 */
interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  warnings: string[];
  details: {
    batchesProcessed: number;
    batchesSucceeded: number;
    batchesFailed: number;
    recordsProcessed: number;
  };
}

/**
 * 智能批量导入数据
 * 使用优化的错误处理策略，提高批量导入成功率
 * @param tableName 表名
 * @param data 要导入的数据
 * @param batchSize 批量大小
 * @returns 导入结果
 */
export async function smartBatchImport(
  tableName: string,
  data: any[],
  batchSize: number = 1000
): Promise<ImportResult> {
  if (!data || data.length === 0) {
    return {
      success: 0,
      failed: 0,
      errors: ['没有数据可以导入'],
      warnings: [],
      details: {
        batchesProcessed: 0,
        batchesSucceeded: 0,
        batchesFailed: 0,
        recordsProcessed: 0
      }
    };
  }
  
  // 初始化结果对象
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    warnings: [],
    details: {
      batchesProcessed: 0,
      batchesSucceeded: 0,
      batchesFailed: 0,
      recordsProcessed: 0
    }
  };
  
  try {
    console.log(`开始导入数据到表 ${tableName}，总记录数: ${data.length}`);
    
    // 1. 应用列名映射
    console.log('应用列名映射...');
    const mappedData = await applyMappingsToData(data, tableName);
    
    // 2. 准备表结构
    console.log('准备表结构...');
    const structureResult = await prepareTableStructure(tableName, mappedData);
    
    if (!structureResult.success) {
      result.errors.push(`表结构准备失败: ${structureResult.message}`);
      return result;
    }
    
    if (structureResult.addedColumns && structureResult.addedColumns.length > 0) {
      result.warnings.push(`已添加 ${structureResult.addedColumns.length} 个缺失的列: ${structureResult.addedColumns.join(', ')}`);
    }
    
    if (structureResult.recreated) {
      result.warnings.push(`表 ${tableName} 已重建`);
    }
    
    // 3. 分批导入数据
    const supabase = createClient(supabaseUrl, supabaseKey);
    const batches = [];
    
    // 将数据分成批次
    for (let i = 0; i < mappedData.length; i += batchSize) {
      batches.push(mappedData.slice(i, i + batchSize));
    }
    
    console.log(`数据已分成 ${batches.length} 个批次，每批 ${batchSize} 条记录`);
    
    // 4. 使用Promise.all进行并行批量导入
    // 注意：为了避免超出Supabase的并发限制，我们使用较小的并发数
    const MAX_CONCURRENT = 3;
    let currentBatch = 0;
    
    while (currentBatch < batches.length) {
      const batchPromises = [];
      const endBatch = Math.min(currentBatch + MAX_CONCURRENT, batches.length);
      
      // 创建当前并发批次的Promise
      for (let i = currentBatch; i < endBatch; i++) {
        batchPromises.push(processBatch(supabase, tableName, batches[i], i));
      }
      
      // 等待当前批次完成
      const batchResults = await Promise.all(batchPromises);
      
      // 处理结果
      for (const batchResult of batchResults) {
        result.details.batchesProcessed++;
        result.details.recordsProcessed += batchResult.processed;
        
        if (batchResult.success) {
          result.success += batchResult.processed;
          result.details.batchesSucceeded++;
        } else {
          result.failed += batchResult.failed;
          result.details.batchesFailed++;
          
          if (batchResult.error) {
            result.errors.push(`批次 ${batchResult.batchIndex} 失败: ${batchResult.error}`);
          }
        }
      }
      
      // 移动到下一组批次
      currentBatch = endBatch;
    }
    
    console.log(`导入完成。成功: ${result.success}, 失败: ${result.failed}`);
    return result;
  } catch (error) {
    console.error('导入数据失败:', error);
    result.errors.push(`导入过程出错: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

/**
 * 处理单个批次
 * @param supabase Supabase客户端
 * @param tableName 表名
 * @param batch 数据批次
 * @param batchIndex 批次索引
 * @returns 批次处理结果
 */
async function processBatch(
  supabase: any,
  tableName: string,
  batch: any[],
  batchIndex: number
): Promise<{
  success: boolean;
  processed: number;
  failed: number;
  error?: string;
  batchIndex: number;
}> {
  try {
    console.log(`处理批次 ${batchIndex}，记录数: ${batch.length}`);
    
    // 尝试批量插入
    const { error } = await supabase.from(tableName).insert(batch);
    
    if (error) {
      console.log(`批次 ${batchIndex} 批量插入失败，尝试单条插入: ${error.message}`);
      
      // 如果批量插入失败，尝试单条插入
      const singleResults = await processRecordsOneByOne(supabase, tableName, batch);
      
      return {
        success: singleResults.success > 0,
        processed: singleResults.success,
        failed: singleResults.failed,
        error: singleResults.failed > 0 ? `${singleResults.failed}/${batch.length} 条记录插入失败` : undefined,
        batchIndex
      };
    }
    
    console.log(`批次 ${batchIndex} 成功插入 ${batch.length} 条记录`);
    return {
      success: true,
      processed: batch.length,
      failed: 0,
      batchIndex
    };
  } catch (error) {
    console.error(`处理批次 ${batchIndex} 失败:`, error);
    
    // 尝试单条插入
    const singleResults = await processRecordsOneByOne(supabase, tableName, batch);
    
    return {
      success: singleResults.success > 0,
      processed: singleResults.success,
      failed: singleResults.failed,
      error: `批次处理异常: ${error instanceof Error ? error.message : String(error)}`,
      batchIndex
    };
  }
}

/**
 * 单条处理记录
 * @param supabase Supabase客户端
 * @param tableName 表名
 * @param records 记录数组
 * @returns 处理结果
 */
async function processRecordsOneByOne(
  supabase: any,
  tableName: string,
  records: any[]
): Promise<{
  success: number;
  failed: number;
}> {
  let success = 0;
  let failed = 0;
  
  for (const record of records) {
    try {
      const { error } = await supabase.from(tableName).insert(record);
      
      if (error) {
        console.log(`单条记录插入失败: ${error.message}`);
        failed++;
      } else {
        success++;
      }
    } catch (error) {
      console.log(`单条记录插入异常: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }
  
  console.log(`单条处理完成。成功: ${success}, 失败: ${failed}`);
  return { success, failed };
}

/**
 * 导入数据到表，自动处理表结构差异
 * @param tableName 表名
 * @param data 要导入的数据
 * @param options 导入选项
 * @returns 导入结果
 */
export async function importDataToTable(
  tableName: string,
  data: any[],
  options: {
    batchSize?: number;
    forceRecreate?: boolean;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<ImportResult> {
  const { batchSize = 1000, forceRecreate = false, onProgress } = options;
  
  try {
    // 如果强制重建表，先准备表结构
    if (forceRecreate) {
      console.log(`强制重建表 ${tableName}`);
      const structureResult = await prepareTableStructure(tableName, data, true);
      
      if (!structureResult.success) {
        return {
          success: 0,
          failed: data.length,
          errors: [`表结构准备失败: ${structureResult.message}`],
          warnings: [],
          details: {
            batchesProcessed: 0,
            batchesSucceeded: 0,
            batchesFailed: 0,
            recordsProcessed: 0
          }
        };
      }
    }
    
    // 使用智能批量导入
    return await smartBatchImport(tableName, data, batchSize);
  } catch (error) {
    console.error('导入数据失败:', error);
    
    return {
      success: 0,
      failed: data.length,
      errors: [`导入过程出错: ${error instanceof Error ? error.message : String(error)}`],
      warnings: [],
      details: {
        batchesProcessed: 0,
        batchesSucceeded: 0,
        batchesFailed: 0,
        recordsProcessed: 0
      }
    };
  }
}
