#!/bin/bash

# 中文字体修复脚本 for 校内PDF服务

echo "🔧 开始修复中文字体渲染问题..."

# 检查系统类型
if [ -f /etc/debian_version ]; then
    echo "📋 检测到 Debian/Ubuntu 系统"
    SYSTEM="debian"
elif [ -f /etc/redhat-release ]; then
    echo "📋 检测到 RedHat/CentOS 系统"
    SYSTEM="redhat"
else
    echo "📋 未知系统类型，尝试通用修复"
    SYSTEM="unknown"
fi

# 安装中文字体
echo "📥 安装中文字体..."

if [ "$SYSTEM" = "debian" ]; then
    # Debian/Ubuntu 系统
    sudo apt-get update
    sudo apt-get install -y fonts-noto-cjk fonts-wqy-zenhei fonts-wqy-microhei
    sudo apt-get install -y xfonts-wqy ttf-wqy-zenhei ttf-wqy-microhei
    
elif [ "$SYSTEM" = "redhat" ]; then
    # RedHat/CentOS 系统
    sudo yum install -y wqy-zenhei-fonts wqy-microhei-fonts
    # 或者使用 dnf (较新的系统)
    sudo dnf install -y google-noto-cjk-fonts wqy-zenhei-fonts wqy-microhei-fonts 2>/dev/null || true
fi

# 刷新字体缓存
echo "🔄 刷新字体缓存..."
sudo fc-cache -fv

# 检查可用的中文字体
echo "🔍 检查已安装的中文字体:"
fc-list :lang=zh | head -10

# 创建字体测试HTML
echo "📝 创建字体测试页面..."
cat > font-test.html << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>中文字体测试</title>
    <style>
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            font-family: "Noto Sans CJK SC", "WenQuanYi Zen Hei", "WenQuanYi Micro Hei", "Microsoft YaHei", "SimHei", "SimSun", sans-serif;
            padding: 40px;
            line-height: 1.8;
            font-size: 16px;
            color: #333;
            background: white;
        }
        h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #1a1a1a;
        }
        .test-section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .font-name {
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <h1>🇨🇳 中文字体渲染测试</h1>
    
    <div class="test-section">
        <div class="font-name">默认字体 (font-family: 系统默认)</div>
        <p>这是一段中文测试文字。包含常用汉字：学生、成绩、分析、报告。</p>
        <p>数字和英文：Dashboard 2024, Score: 85.5, 平均分: 78.9</p>
    </div>
    
    <div class="test-section">
        <div class="font-name">Noto Sans CJK SC</div>
        <p style="font-family: 'Noto Sans CJK SC', sans-serif;">
            北京理工大学珠海学院学生成绩管理系统 Dashboard 页面导出测试。
        </p>
    </div>
    
    <div class="test-section">
        <div class="font-name">WenQuanYi Zen Hei (文泉驿正黑)</div>
        <p style="font-family: 'WenQuanYi Zen Hei', sans-serif;">
            包含各种中文字符：简体中文、繁體中文、数学符号：α β γ δ ∑ ∫
        </p>
    </div>
    
    <div class="test-section">
        <div class="font-name">SimHei (黑体)</div>
        <p style="font-family: 'SimHei', sans-serif;">
            课程名称：高等数学、线性代数、概率论与数理统计、数据结构
        </p>
    </div>
    
    <div class="test-section">
        <div class="font-name">混合内容测试</div>
        <p>
            <strong>学生信息：</strong>姓名：张三，学号：2021001，专业：计算机科学与技术<br/>
            <strong>成绩统计：</strong>平均分：85.6，通过率：95%，总学分：128<br/>
            <strong>English Mixed：</strong>This is a mixed content test with 中文字符 and numbers: 12345
        </p>
    </div>
    
    <div class="test-section">
        <div class="font-name">特殊字符测试</div>
        <p>
            标点符号：，。；？！""''（）【】<br/>
            数学符号：± × ÷ ≤ ≥ ≠ ∞ π √<br/>
            单位符号：℃ ℉ Ω μ λ Σ ∆<br/>
            货币符号：￥ $ € £ ¢
        </p>
    </div>
    
    <hr style="margin: 30px 0; border: 1px solid #eee;">
    
    <div style="text-align: center; color: #666; font-size: 14px;">
        <p>如果您能看到所有中文字符都正确显示，说明字体配置成功！</p>
        <p>测试时间：$(date)</p>
    </div>
</body>
</html>
EOF

echo "✅ 字体测试页面已创建: font-test.html"

# 测试字体渲染
echo "🧪 测试PDF生成..."
curl -X POST http://localhost:8000/generate-pdf \
  -H "Content-Type: application/json" \
  -H "x-pdf-key: campus-pdf-2024-1755617095" \
  -d '{
    "html": "'$(cat font-test.html | sed 's/"/\\"/g' | tr -d '\n')'",
    "viewportWidth": 1366,
    "filename": "font-test.pdf",
    "pdfOptions": {
      "format": "A4",
      "printBackground": true,
      "margin": {
        "top": "20mm",
        "right": "15mm",
        "bottom": "20mm",
        "left": "15mm"
      }
    }
  }' \
  -o font-test.pdf

if [ -f font-test.pdf ]; then
    echo "✅ 字体测试PDF生成成功: font-test.pdf"
    echo "📊 PDF文件大小: $(ls -lh font-test.pdf | awk '{print $5}')"
    echo ""
    echo "🔍 请检查 font-test.pdf 文件:"
    echo "   - 所有中文字符是否正确显示"
    echo "   - 是否还有空白字符"
    echo "   - 字体是否清晰可读"
else
    echo "❌ 字体测试PDF生成失败"
fi

echo ""
echo "🎯 修复完成！主要改进:"
echo "   ✅ 安装了多种中文字体"
echo "   ✅ 刷新了系统字体缓存"
echo "   ✅ 创建了字体测试文件"
echo "   ✅ 生成了测试PDF"
echo ""
echo "📋 如果仍有问题，请:"
echo "   1. 检查 font-test.pdf 的渲染效果"
echo "   2. 运行: fc-list :lang=zh"
echo "   3. 重启PDF服务: bash fix-multipage-service.sh"
