@echo off
echo 🔧 修复构建错误并重新部署...
echo.

REM 添加修复的文件
git add .

REM 提交修复
git commit -m "fix: 修复构建错误 - 移除未使用变量，修复导入错误，更新Next.js配置"

REM 推送到GitHub
git push origin main

echo.
echo ✅ 修复已推送到GitHub！
echo 🚀 Vercel将自动开始新的部署...
echo.
echo 请访问以下链接查看部署状态：
echo https://vercel.com/dashboard
echo.
pause 