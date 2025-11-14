// 数据库检查脚本
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 检查数据库状态...\n');
  
  try {
    // 1. 检查任务表
    const { data: tasks, error: tasksError } = await supabase
      .from('import_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (tasksError) {
      console.log('❌ 任务表查询失败:', tasksError.message);
    } else {
      console.log(`📋 最近的导入任务 (${tasks.length}条):`);
      tasks.forEach(task => {
        console.log(`   - ${task.id}: ${task.status} (${task.processed_files}/${task.total_files} 文件)`);
      });
      console.log('');
    }
    
    // 2. 检查文件详情表
    const { data: files, error: filesError } = await supabase
      .from('import_file_details')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (filesError) {
      console.log('❌ 文件详情表查询失败:', filesError.message);
    } else {
      console.log(`📁 最近的文件处理记录 (${files.length}条):`);
      files.forEach(file => {
        console.log(`   - ${file.file_name}: ${file.status} (${file.imported_count}/${file.records_count} 记录)`);
      });
      console.log('');
    }
    
    // 3. 检查主表记录数
    const { count: mainCount, error: mainError } = await supabase
      .from('academic_results')
      .select('*', { count: 'exact', head: true });
    
    if (mainError) {
      console.log('❌ 主表查询失败:', mainError.message);
    } else {
      console.log(`📊 主表 academic_results 记录数: ${mainCount}`);
    }
    
    // 4. 检查影子表记录数
    const { count: shadowCount, error: shadowError } = await supabase
      .from('academic_results_old')
      .select('*', { count: 'exact', head: true });
    
    if (shadowError) {
      console.log('❌ 影子表查询失败:', shadowError.message);
    } else {
      console.log(`📊 影子表 academic_results_old 记录数: ${shadowCount}`);
    }
    
    console.log('\n✅ 数据库检查完成！');
    
  } catch (error) {
    console.log('❌ 数据库连接失败:', error.message);
  }
}

// 运行检查
checkDatabase();
