#!/bin/bash

echo "🧪 测试简化版PDF服务..."

# 创建简单的测试HTML
cat > test.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>BuTP PDF测试</title>
    <style>
        body { 
            font-family: Arial, sans-serif;
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
    </style>
</head>
<body>
    <div class="header">BuTP 校内PDF服务测试</div>
    
    <div class="success">
        🎉 恭喜！校内PDF服务部署成功！
    </div>
    
    <div class="info">
        <h3>服务信息:</h3>
        <p><strong>服务地址:</strong> http://10.3.58.3:8000</p>
        <p><strong>生成时间:</strong> $(date)</p>
        <p><strong>服务器:</strong> jwc-ycsj</p>
    </div>
    
    <p>如果你能看到这个PDF，说明HTML内容PDF生成功能正常工作！</p>
</body>
</html>
EOF

echo "正在生成测试PDF..."

# 读取HTML内容并转义
HTML_CONTENT=$(cat test.html | sed 's/"/\\"/g' | tr '\n' ' ')

# 调用PDF服务
curl -X POST http://localhost:8000/generate-pdf \
  -H "Content-Type: application/json" \
  -H "x-pdf-key: campus-pdf-2024-1755617095" \
  -d "{\"html\":\"$HTML_CONTENT\",\"viewportWidth\":1366,\"filename\":\"test-simple.pdf\"}" \
  -o test-simple.pdf \
  -w "HTTP状态: %{http_code}\n响应时间: %{time_total}s\n"

# 检查结果
echo ""
if [ -f "test-simple.pdf" ] && [ -s "test-simple.pdf" ]; then
    file_size=$(stat -c%s "test-simple.pdf" 2>/dev/null || stat -f%z "test-simple.pdf")
    echo "✅ PDF生成成功!"
    echo "📄 文件大小: $file_size bytes"
    echo "📍 文件位置: $(pwd)/test-simple.pdf"
    
    # 检查是否是有效的PDF文件
    if file test-simple.pdf 2>/dev/null | grep -q "PDF"; then
        echo "✅ PDF文件格式验证通过"
    else
        echo "⚠️ 文件可能不是有效的PDF格式"
        echo "文件内容预览:"
        head -c 200 test-simple.pdf
    fi
else
    echo "❌ PDF生成失败"
    echo "文件大小: $(stat -c%s test-simple.pdf 2>/dev/null || echo "文件不存在")"
    echo "查看错误日志:"
    tail -10 service.log
fi

# 清理临时文件
rm -f test.html
