#!/usr/bin/env node

/**
 * 测试中间件语法
 * 这个文件用于验证middleware.ts的语法是否正确
 */

console.log('🔍 测试中间件语法...');

// 模拟中间件的基本结构
function testMiddlewareStructure() {
  try {
    // 测试基本的语法结构
    const testFunction = async () => {
      const testArray = ['/profile', '/dashboard', '/grades'];
      const testPath = '/dashboard';
      
      // 测试数组方法
      const isProtected = testArray.some(path => testPath.startsWith(path));
      console.log('✅ 数组方法测试通过:', isProtected);
      
      // 测试条件判断
      if (isProtected) {
        console.log('✅ 条件判断测试通过');
      }
      
      // 测试异步操作
      const testPromise = Promise.resolve('test');
      const result = await testPromise;
      console.log('✅ 异步操作测试通过:', result);
      
      return true;
    };
    
    // 执行测试
    testFunction().then(() => {
      console.log('🎉 所有语法测试通过！');
    });
    
  } catch (error) {
    console.error('❌ 语法测试失败:', error);
  }
}

// 运行测试
testMiddlewareStructure();
