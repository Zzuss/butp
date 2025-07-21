@echo off
chcp 65001 > nul
echo.
echo ===============================================
echo        🔧 修复构建错误并重新部署
echo ===============================================
echo.

echo 📋 已修复的问题：
echo ✅ 移除了未使用的 CourseResult 类型导入
echo ✅ 修复了 TypeScript 编译错误
echo.

echo 📝 提交修复...
git add .
git commit -m "fix: 移除未使用的CourseResult类型导入，修复构建错误"

echo.
echo 📤 推送到GitHub...
git push origin main

echo.
echo ===============================================
echo           🎉 修复完成！
echo ===============================================
echo.
echo 🔄 Vercel将在几分钟内自动重新构建
echo 📊 请查看Vercel Dashboard确认构建成功
echo 🌐 构建成功后访问 https://butp.tech
echo.
echo 💡 这次应该会构建成功了！
echo.
pause 