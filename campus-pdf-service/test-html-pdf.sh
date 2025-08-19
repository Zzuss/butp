#!/bin/bash

echo "🧪 测试HTML内容PDF生成..."

# 创建测试HTML内容
TEST_HTML='<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>BuTP PDF测试</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 40px; 
            background: white;
            color: #333;
        }
        .header { 
            color: #2563eb; 
            font-size: 32px; 
            margin-bottom: 30px; 
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
        }
        .content { 
            line-height: 1.8; 
            font-size: 16px;
            margin-bottom: 20px;
        }
        .success { 
            color: #16a34a; 
            font-weight: bold; 
            font-size: 18px;
            background: #f0fdf4;
            padding: 15px;
            border-left: 4px solid #16a34a;
            margin: 20px 0;
        }
        .info {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">BuTP 校内PDF服务测试</div>
    
    <div class="content">
        <p>这是一个校内PDF服务的功能测试页面。如果你能看到这个PDF，说明以下功能正常工作：</p>
        
        <ul>
            <li>✅ Node.js PDF服务运行正常</li>
            <li>✅ Puppeteer浏览器引擎工作正常</li>
            <li>✅ HTML到PDF转换功能正常</li>
            <li>✅ 中文字体渲染正常</li>
            <li>✅ CSS样式应用正常</li>
        </ul>
    </div>
    
    <div class="success">
        🎉 恭喜！校内PDF服务部署成功！
    </div>
    
    <div class="info">
        <h3>服务信息:</h3>
        <p><strong>服务地址:</strong> http://10.3.58.3:8000</p>
        <p><strong>生成时间:</strong> '$(date)'</p>
        <p><strong>服务器:</strong> jwc-ycsj</p>
        <p><strong>API版本:</strong> v1.0.0</p>
    </div>
    
    <div class="content">
        <h3>下一步测试:</h3>
        <ol>
            <li>测试从butp.tech前端调用此服务</li>
            <li>验证校园网和VPN环境的连通性</li>
            <li>确认用户认证信息正确传递</li>
            <li>测试不同页面的PDF生成效果</li>
        </ol>
    </div>
    
    <div class="footer">
        BuTP 校内PDF服务 | 部署于 jwc-ycsj 服务器
    </div>
</body>
</html>'

# 转义HTML内容用于JSON
ESCAPED_HTML=$(echo "$TEST_HTML" | sed 's/"/\\"/g' | tr -d '\n')

echo "正在生成测试PDF..."

# 调用PDF服务
curl -X POST http://localhost:8000/generate-pdf \
  -H "Content-Type: application/json" \
  -H "x-pdf-key: campus-pdf-2024-1755617095" \
  -d "{\"html\":\"$ESCAPED_HTML\",\"viewportWidth\":1366,\"filename\":\"test-html-butp.pdf\"}" \
  -o test-html-butp.pdf

# 检查结果
if [ -f "test-html-butp.pdf" ] && [ -s "test-html-butp.pdf" ]; then
    file_size=$(stat -c%s "test-html-butp.pdf")
    echo "✅ PDF生成成功!"
    echo "📄 文件大小: $file_size bytes"
    echo "📍 文件位置: $(pwd)/test-html-butp.pdf"
    
    # 检查是否是有效的PDF文件
    if file test-html-butp.pdf | grep -q "PDF"; then
        echo "✅ PDF文件格式验证通过"
    else
        echo "⚠️ 文件可能不是有效的PDF格式"
    fi
else
    echo "❌ PDF生成失败"
    echo "查看错误日志:"
    tail -10 service.log
fi
