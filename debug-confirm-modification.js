#!/usr/bin/env node

/**
 * 调试"确认修改"功能的问题
 * 用于诊断海外读研界面点击确认修改后报错的问题
 */

const fs = require('fs')
const path = require('path')

function debugConfirmModification() {
  console.log('🔍 调试"确认修改"功能问题...')
  console.log('================================')

  try {
    // 1. 检查学业分析页面文件
    console.log('1️⃣ 检查学业分析页面文件...')
    const analysisPagePath = path.join(__dirname, 'app/analysis/page.tsx')
    if (fs.existsSync(analysisPagePath)) {
      const content = fs.readFileSync(analysisPagePath, 'utf8')
      
      // 查找handleConfirmModification函数
      if (content.includes('handleConfirmModification')) {
        console.log('✅ 找到handleConfirmModification函数')
        
        // 查找错误发生的位置
        const errorLine = content.includes('Failed to load all course data')
        if (errorLine) {
          console.log('✅ 找到错误日志: "Failed to load all course data"')
        } else {
          console.log('❌ 未找到错误日志')
        }
      } else {
        console.log('❌ 未找到handleConfirmModification函数')
      }
    } else {
      console.log('❌ 学业分析页面文件不存在')
    }

    // 2. 检查all-course-data API
    console.log('\n2️⃣ 检查all-course-data API...')
    const apiPath = path.join(__dirname, 'app/api/all-course-data/route.ts')
    if (fs.existsSync(apiPath)) {
      const apiContent = fs.readFileSync(apiPath, 'utf8')
      
      // 检查API的关键部分
      if (apiContent.includes('export async function POST')) {
        console.log('✅ API POST函数存在')
      }
      
      if (apiContent.includes('createSupabaseClient')) {
        console.log('✅ Supabase客户端创建函数存在')
      }
      
      if (apiContent.includes('Cohort2023_Predictions_ee')) {
        console.log('✅ 来源1数据表查询存在')
      }
      
      if (apiContent.includes('academic_results')) {
        console.log('✅ 来源2数据表查询存在')
      }
      
      // 检查错误处理
      if (apiContent.includes('return NextResponse.json({ error:')) {
        console.log('✅ API错误处理存在')
      }
    } else {
      console.log('❌ all-course-data API文件不存在')
    }

    // 3. 检查Supabase配置
    console.log('\n3️⃣ 检查Supabase配置...')
    const envPath = path.join(__dirname, '.env.local')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      
      if (envContent.includes('NEXT_PUBLIC_SUPABASE_URL')) {
        console.log('✅ 找到Supabase URL配置')
      } else {
        console.log('⚠️  未找到Supabase URL配置')
      }
      
      if (envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
        console.log('✅ 找到Supabase匿名密钥配置')
      } else {
        console.log('⚠️  未找到Supabase匿名密钥配置')
      }
    } else {
      console.log('⚠️  .env.local文件不存在')
    }

    // 4. 分析可能的问题
    console.log('\n4️⃣ 问题分析...')
    console.log('根据代码分析，可能的错误原因：')
    console.log('1. Supabase连接失败')
    console.log('2. 数据库查询错误')
    console.log('3. 传递给API的数据格式问题')
    console.log('4. 网络请求超时')
    console.log('5. 数据库权限问题')

    // 5. 建议的解决方案
    console.log('\n5️⃣ 建议的解决方案...')
    console.log('1. 检查浏览器控制台的详细错误信息')
    console.log('2. 检查网络请求的状态码和响应')
    console.log('3. 验证Supabase连接是否正常')
    console.log('4. 检查数据库表是否存在且有权限访问')
    console.log('5. 验证传递给API的数据格式是否正确')

    // 6. 调试步骤
    console.log('\n6️⃣ 调试步骤...')
    console.log('1. 在浏览器开发者工具中查看Network标签')
    console.log('2. 找到失败的API请求，查看状态码和响应')
    console.log('3. 在Console标签中查看完整的错误堆栈')
    console.log('4. 检查传递给API的modifiedScores数据格式')
    console.log('5. 验证studentHash是否正确')

    console.log('\n📊 调试总结:')
    console.log('================================')
    console.log('✅ 文件结构检查完成')
    console.log('✅ API代码检查完成')
    console.log('✅ 配置检查完成')
    console.log('✅ 问题分析完成')
    console.log('✅ 解决方案建议完成')
    console.log('✅ 调试步骤说明完成')

  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error.message)
    console.error('详细错误信息:', error)
  }
}

// 运行调试
debugConfirmModification()
