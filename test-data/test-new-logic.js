// 测试新的导入逻辑
const baseUrl = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    
    console.log(`${response.ok ? '✅' : '❌'} ${method} ${endpoint}`);
    if (!response.ok) {
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(data, null, 2));
    }
    console.log('');
    
    return { response, data, ok: response.ok };
  } catch (error) {
    console.log(`❌ ${method} ${endpoint}`);
    console.log(`   Error:`, error.message);
    console.log('');
    return { error, ok: false };
  }
}

async function checkDatabaseCounts() {
  // 这里需要你手动运行 node test-data/check-database.js 来查看数据库状态
  console.log('📊 请手动运行以下命令查看数据库状态:');
  console.log('   node test-data/check-database.js');
  console.log('');
}

async function testNewImportLogic() {
  console.log('🧪 测试新的导入逻辑...\n');
  
  // 1. 检查当前数据库状态
  console.log('📊 步骤1: 检查导入前的数据库状态');
  await checkDatabaseCounts();
  
  // 2. 检查文件列表
  console.log('📁 步骤2: 检查上传的文件');
  const { data: filesData, ok: filesOk } = await testAPI('/api/admin/grades-import/files');
  
  if (!filesOk || !filesData.files || filesData.files.length === 0) {
    console.log('❌ 没有找到上传的文件，请先在前端上传测试文件');
    console.log('   提示: 可以上传 test-data/test-grades-1.xlsx 和 test-data/test-grades-2.xlsx');
    return;
  }
  
  console.log(`✅ 找到 ${filesData.files.length} 个文件\n`);
  
  // 3. 创建导入任务
  console.log('📋 步骤3: 创建新的导入任务');
  const { data: taskData, ok: taskOk } = await testAPI('/api/admin/grades-import/create-task', 'POST');
  
  if (!taskOk || !taskData.success) {
    console.log('❌ 创建任务失败');
    return;
  }
  
  const taskId = taskData.taskId;
  console.log(`✅ 任务创建成功，ID: ${taskId}\n`);
  
  // 4. 触发处理
  console.log('⚡ 步骤4: 触发队列处理');
  await testAPI('/api/admin/grades-import/trigger-process', 'POST');
  
  // 5. 监控任务状态
  console.log('👀 步骤5: 监控任务状态 (最多等待60秒)');
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    attempts++;
    await sleep(2000);
    
    const { data: statusData, ok: statusOk } = await testAPI(`/api/admin/grades-import/task-status/${taskId}`);
    
    if (statusOk && statusData.success) {
      const task = statusData.task;
      console.log(`   [${attempts}] 状态: ${task.status} | 进度: ${task.progress}% | 文件: ${task.processedFiles}/${task.totalFiles}`);
      
      if (task.status === 'completed') {
        console.log('🎉 导入成功完成！');
        console.log(`   - 总文件数: ${task.totalFiles}`);
        console.log(`   - 总记录数: ${task.totalRecords}`);
        console.log(`   - 导入记录数: ${task.importedRecords}`);
        break;
      } else if (task.status === 'failed') {
        console.log('❌ 导入失败');
        console.log(`   错误信息: ${task.errorMessage}`);
        break;
      }
    } else {
      console.log(`   [${attempts}] ❌ 查询状态失败`);
    }
    
    if (attempts === maxAttempts) {
      console.log('⏰ 超时：任务可能仍在处理中');
    }
  }
  
  // 6. 最终状态检查
  console.log('\n📊 步骤6: 检查导入后的数据库状态');
  await checkDatabaseCounts();
  
  console.log('💡 预期结果:');
  console.log('   - academic_results 应该只包含新导入的 12 条记录');
  console.log('   - academic_results_old 应该包含之前的 25070 条记录');
  console.log('   - 这证明原子交换正确工作了');
  
  console.log('\n✅ 测试完成！');
}

// 运行测试
testNewImportLogic().catch(console.error);
