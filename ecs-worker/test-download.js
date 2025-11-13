const axios = require('axios')

// 测试下载API是否可用
async function testDownloadApis() {
  const testFileId = 'test-file-id'
  const sources = [
    'https://butp.tech',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ]
  
  console.log('🔍 测试下载API可用性...\n')
  
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    const testUrl = `${source}/api/admin/grades-import/download/${testFileId}`
    
    try {
      console.log(`📡 测试源 ${i + 1}: ${source}`)
      
      const response = await axios({
        method: 'GET',
        url: testUrl,
        timeout: 5000,
        validateStatus: function (status) {
          // 404是预期的（因为文件不存在），但说明API可达
          return status === 404 || (status >= 200 && status < 300)
        }
      })
      
      if (response.status === 404) {
        console.log(`✅ 源 ${i + 1} 可用 (API响应404，说明服务正常)\n`)
      } else {
        console.log(`✅ 源 ${i + 1} 可用 (状态码: ${response.status})\n`)
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ 源 ${i + 1} 不可用 (连接被拒绝)\n`)
      } else if (error.code === 'ENOTFOUND') {
        console.log(`❌ 源 ${i + 1} 不可用 (域名解析失败)\n`)
      } else {
        console.log(`❌ 源 ${i + 1} 不可用 (${error.message})\n`)
      }
    }
  }
}

// 测试文件列表API
async function testFileListApi() {
  const sources = [
    'https://butp.tech',
    'http://localhost:3000'
  ]
  
  console.log('📋 测试文件列表API...\n')
  
  for (const source of sources) {
    try {
      const response = await axios({
        method: 'GET',
        url: `${source}/api/admin/grades-import/files`,
        timeout: 5000
      })
      
      console.log(`✅ ${source} 文件列表API可用`)
      console.log(`   文件数量: ${response.data.files?.length || 0}`)
      if (response.data.files?.length > 0) {
        console.log(`   示例文件ID: ${response.data.files[0].id}`)
      }
      console.log('')
      
    } catch (error) {
      console.log(`❌ ${source} 文件列表API不可用: ${error.message}\n`)
    }
  }
}

async function runTests() {
  await testDownloadApis()
  await testFileListApi()
  
  console.log('🎯 建议:')
  console.log('1. 确保本地开发服务器运行: npm run dev')
  console.log('2. 确保线上服务已部署最新代码')
  console.log('3. 上传修复后的ECS文件并重启服务')
}

runTests().catch(console.error)
