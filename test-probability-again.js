// 使用Node.js内置的fetch

async function testProbabilityAPI() {
  try {
    console.log('测试概率API...');
    
    // 使用之前测试过的学号哈希
    const testHash = 'e516e372542c4a9fc1e77c3bbd352b34';
    
    const response = await fetch(`http://localhost:3000/api/predict-possibility?studentHash=${testHash}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 概率API响应成功:', data);
    } else {
      const error = await response.text();
      console.log('❌ 概率API响应失败:', response.status, error);
    }
  } catch (error) {
    console.error('❌ 概率API测试失败:', error.message);
  }
}

testProbabilityAPI(); 