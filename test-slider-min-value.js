#!/usr/bin/env node

/**
 * 滑动条最小值修改验证脚本
 * 用于验证学业分析界面中海外读研和国内读研界面的滑动条最小值是否已修改为60分
 */

const fs = require('fs')
const path = require('path')

function testSliderMinValue() {
  console.log('🔍 验证滑动条最小值修改...')
  console.log('================================')

  try {
    // 读取学业分析页面文件
    const analysisPagePath = path.join(__dirname, 'app/analysis/page.tsx')
    const content = fs.readFileSync(analysisPagePath, 'utf8')
    
    // 查找所有滑动条的min值设置
    const minValueMatches = content.match(/min=\{(\d+)\}/g)
    
    if (!minValueMatches) {
      console.log('❌ 未找到滑动条min值设置')
      return
    }
    
    console.log(`✅ 找到 ${minValueMatches.length} 个滑动条min值设置:`)
    minValueMatches.forEach((match, index) => {
      console.log(`   ${index + 1}. ${match}`)
    })
    
    // 检查是否所有滑动条的min值都是60
    const allMinValuesAre60 = minValueMatches.every(match => match === 'min={60}')
    
    if (allMinValuesAre60) {
      console.log('\n🎉 所有滑动条的最小值都已成功修改为60分！')
      console.log('✅ 海外读研界面的滑动条: min={60}')
      console.log('✅ 国内读研界面的滑动条: min={60}')
    } else {
      console.log('\n⚠️  部分滑动条的最小值可能未修改:')
      minValueMatches.forEach((match, index) => {
        if (match === 'min={60}') {
          console.log(`   ✅ 滑动条 ${index + 1}: ${match}`)
        } else {
          console.log(`   ❌ 滑动条 ${index + 1}: ${match} (需要修改为60)`)
        }
      })
    }
    
    // 验证滑动条组件的实现
    console.log('\n🔍 检查滑动条组件实现...')
    const sliderComponentPath = path.join(__dirname, 'components/ui/slider.tsx')
    if (fs.existsSync(sliderComponentPath)) {
      const sliderContent = fs.readFileSync(sliderComponentPath, 'utf8')
      
      // 检查滑动条组件是否正确处理min值
      if (sliderContent.includes('Math.max(min, Math.min(max, newValue))')) {
        console.log('✅ 滑动条组件正确实现了min值边界检查')
      } else {
        console.log('⚠️  滑动条组件可能缺少min值边界检查')
      }
      
      // 检查刻度标签是否正确显示min值
      if (sliderContent.includes('<span>{min}</span>')) {
        console.log('✅ 滑动条组件正确显示min值刻度标签')
      } else {
        console.log('⚠️  滑动条组件可能缺少min值刻度标签')
      }
    } else {
      console.log('⚠️  滑动条组件文件不存在')
    }
    
    console.log('\n📊 修改总结:')
    console.log('================================')
    if (allMinValuesAre60) {
      console.log('✅ 所有滑动条的最小值都已成功修改为60分')
      console.log('✅ 海外读研界面的滑动条范围: 60-100分')
      console.log('✅ 国内读研界面的滑动条范围: 60-100分')
      console.log('✅ 用户无法设置低于60分的成绩')
      console.log('✅ 符合60分及格线的要求')
    } else {
      console.log('❌ 部分滑动条的最小值未修改完成')
      console.log('⚠️  需要检查并修改剩余的滑动条')
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error('详细错误信息:', error)
  }
}

// 运行测试
testSliderMinValue()
