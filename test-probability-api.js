// 测试概率API
async function testProbabilityAPI() {
  const testHash = 'cb64325cede5fc8623b2df209060a4a9c007deed8039c4287b3f2e145e1677cb';
  
  console.log('🔍 测试概率API...');
  console.log('测试哈希值:', testHash.substring(0, 16) + '...');
  
  try {
    const response = await fetch(`http://localhost:3000/api/predict-possibility?studentHash=${testHash}`);
    
    console.log('📊 响应状态:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📋 响应数据:', JSON.stringify(data, null, 2));
      
      console.log('✅ API调用成功！');
      console.log('🎓 专业:', data.major);
      console.log('🇨🇳 国内读研概率:', data.domestic + '%');
      console.log('🌍 海外读研概率:', data.overseas + '%');
      console.log('🎯 毕业概率:', data.graduation + '%');
    } else {
      const errorData = await response.json();
      console.log('❌ API调用失败');
      console.log('🚫 错误信息:', errorData.error);
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

testProbabilityAPI(); 