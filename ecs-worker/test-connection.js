const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function testConnection() {
  console.log('🔍 测试Supabase连接...')
  
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('URL:', supabaseUrl)
  console.log('Key类型:', supabaseKey ? (supabaseKey.includes('anon') ? 'ANON_KEY' : 'SERVICE_ROLE_KEY') : '未设置')
  console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : '未设置')
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 环境变量未正确设置')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // 测试基本连接
    console.log('📡 测试基本连接...')
    const { data, error } = await supabase
      .from('import_tasks')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ 连接失败:', error.message)
      return
    }
    
    console.log('✅ 基本连接成功')
    
    // 测试RPC函数
    console.log('🔧 测试RPC函数...')
    const { error: rpcError } = await supabase.rpc('truncate_results_old')
    
    if (rpcError) {
      console.error('⚠️ RPC函数测试失败:', rpcError.message)
      console.log('请确保数据库中存在 truncate_results_old 函数')
    } else {
      console.log('✅ RPC函数可用')
    }
    
    // 测试表权限
    console.log('🔐 测试表权限...')
    const tables = ['import_tasks', 'import_file_details', 'academic_results', 'academic_results_old']
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (tableError) {
        console.error(`❌ 表 ${table} 权限不足:`, tableError.message)
      } else {
        console.log(`✅ 表 ${table} 权限正常`)
      }
    }
    
    console.log('🎉 连接测试完成！')
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error)
  }
}

testConnection()
