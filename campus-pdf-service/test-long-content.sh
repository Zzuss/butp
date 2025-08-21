#!/bin/bash

echo "🧪 测试长内容多页PDF生成..."

# 生成测试用的长HTML内容
cat > test-long.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>长内容测试页面</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 20px; 
            color: #333;
        }
        h1 { color: #2c3e50; page-break-after: avoid; }
        h2 { color: #34495e; page-break-after: avoid; margin-top: 30px; }
        .section { margin-bottom: 40px; }
        .highlight { background-color: #f39c12; color: white; padding: 10px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #3498db; color: white; }
    </style>
</head>
<body>
    <h1>长内容多页PDF测试文档</h1>
    <p class="highlight">这是一个测试长内容生成多页PDF的文档。应该能够正确分页而不被截断。</p>
    
    <div class="section">
        <h2>第一部分：概述</h2>
        <p>这里是第一部分的内容。Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    </div>

    <div class="section">
        <h2>第二部分：详细说明</h2>
        <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
        
        <table>
            <thead>
                <tr><th>项目</th><th>描述</th><th>状态</th></tr>
            </thead>
            <tbody>
                <tr><td>PDF生成</td><td>支持多页长内容</td><td>✅ 完成</td></tr>
                <tr><td>样式保持</td><td>保留所有CSS样式</td><td>✅ 完成</td></tr>
                <tr><td>分页优化</td><td>智能分页避免截断</td><td>🔄 测试中</td></tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>第三部分：大量内容填充</h2>
EOF

# 生成大量重复内容来测试多页
for i in {1..20}; do
cat >> test-long.html << EOF
        <h3>子节 $i</h3>
        <p>这是第 $i 个子节的内容。Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.</p>
        <p>Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.</p>
        <p>Ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
EOF
done

# 结束HTML
cat >> test-long.html << 'EOF'
    </div>
    
    <div class="section">
        <h2>结论</h2>
        <p class="highlight">如果您能看到这段文字，说明长内容多页PDF生成功能正常工作！</p>
        <p>这个测试文档包含了大量内容，应该会生成多页PDF文档，而不是被截断在第一页。</p>
    </div>
</body>
</html>
EOF

echo "📄 已生成测试HTML文件: test-long.html"

# 读取HTML内容
HTML_CONTENT=$(cat test-long.html)

# 构建JSON请求
JSON_DATA=$(jq -n \
  --arg html "$HTML_CONTENT" \
  --arg filename "test-long-content.pdf" \
  '{
    html: $html,
    viewportWidth: 1366,
    filename: $filename,
    pdfOptions: {
      printBackground: true,
      format: "A4",
      preferCSSPageSize: false,
      height: null,
      pageRanges: "",
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" }
    }
  }')

echo "🚀 开始测试长内容PDF生成..."

# 发送请求
curl -X POST http://localhost:8000/generate-pdf \
  -H "Content-Type: application/json" \
  -H "x-pdf-key: campus-pdf-2024-1755617095" \
  -d "$JSON_DATA" \
  -o test-long-content.pdf \
  -w "HTTP状态: %{http_code}\n响应时间: %{time_total}s\n文件大小: %{size_download} bytes\n"

# 检查结果
if [ -f "test-long-content.pdf" ]; then
    FILE_SIZE=$(stat -f%z test-long-content.pdf 2>/dev/null || stat -c%s test-long-content.pdf 2>/dev/null)
    
    if [ "$FILE_SIZE" -gt 1000 ]; then
        echo "✅ 长内容PDF生成成功!"
        echo "📄 文件大小: $FILE_SIZE bytes"
        echo "📍 文件位置: $(pwd)/test-long-content.pdf"
        
        # 检查PDF页数（如果有可用工具）
        if command -v pdfinfo >/dev/null 2>&1; then
            PAGES=$(pdfinfo test-long-content.pdf | grep "Pages:" | awk '{print $2}')
            echo "📊 PDF页数: $PAGES 页"
            
            if [ "$PAGES" -gt 1 ]; then
                echo "🎉 多页生成成功！内容没有被截断。"
            else
                echo "⚠️  只生成了1页，可能仍有截断问题。"
            fi
        else
            echo "💡 安装 pdfinfo 可以查看PDF页数：sudo apt-get install poppler-utils"
        fi
        
        echo ""
        echo "🔧 可以使用以下命令验证PDF内容："
        echo "  file test-long-content.pdf"
        echo "  ls -lh test-long-content.pdf"
        if command -v pdfinfo >/dev/null 2>&1; then
            echo "  pdfinfo test-long-content.pdf"
        fi
    else
        echo "❌ PDF文件太小，可能生成失败"
        echo "📝 查看服务日志: tail -f service.log"
    fi
else
    echo "❌ PDF文件未生成"
    echo "📝 查看服务日志: tail -f service.log"
fi

# 清理测试文件
rm -f test-long.html
