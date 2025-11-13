// API测试脚本
const baseUrl = 'http://localhost:3000';

async function testAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`✅ ${method} ${endpoint}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    console.log('');
    
    return { response, data };
  } catch (error) {
    console.log(`❌ ${method} ${endpoint}`);
    console.log(`   Error:`, error.message);
    console.log('');
    return { error };
  }
}

async function runTests() {
  console.log('🧪 开始API测试...\n');
  
  // 1. 测试文件列表API
  await testAPI('/api/admin/grades-import/files');
  
  // 2. 测试创建任务API
  const { data: taskData } = await testAPI('/api/admin/grades-import/create-task', 'POST');
  
  if (taskData && taskData.success) {
    const taskId = taskData.taskId;
    console.log(`📋 创建的任务ID: ${taskId}\n`);
    
    // 3. 测试任务状态查询
    await testAPI(`/api/admin/grades-import/task-status/${taskId}`);
    
    // 4. 测试触发处理
    await testAPI('/api/admin/grades-import/trigger-process', 'POST');
    
    // 5. 等待一段时间后再次查询状态
    console.log('⏳ 等待3秒后查询处理状态...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await testAPI(`/api/admin/grades-import/task-status/${taskId}`);
  }
  
  console.log('✅ API测试完成！');
}

// 运行测试
runTests().catch(console.error);
