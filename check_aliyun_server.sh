#!/bin/bash
# 检查阿里云服务器状态的脚本

echo "=== 阿里云服务器代码检查 ==="

# 1. 检查run_prediction_direct.py是否包含年级参数
echo "1. 检查算法文件是否支持年级参数..."
curl -s "http://8.152.102.160:8080/health" || echo "❌ API服务不可访问"

# 2. 检查目录结构
echo -e "\n2. 请在阿里云服务器上执行以下命令："
echo "ls -la /path/to/function/"
echo "cat /path/to/function/run_prediction_direct.py | grep -A 5 'argparse'"
echo "ls -la /path/to/function/education-plan2024/"

# 3. 检查服务状态
echo -e "\n3. 检查API服务状态："
echo "ps aux | grep python"
echo "systemctl status prediction-api"  # 根据实际服务名调整
echo "netstat -tulpn | grep 8080"

# 4. 检查日志
echo -e "\n4. 检查服务日志："
echo "journalctl -u prediction-api -f"  # 根据实际服务名调整
echo "tail -f /var/log/prediction-api.log"  # 根据实际日志路径调整

echo -e "\n=== 正确的重启命令 ==="
echo "sudo systemctl stop prediction-api"
echo "sudo systemctl start prediction-api"
echo "# 或者"  
echo "sudo systemctl restart prediction-api"
echo "# 或者如果是手动启动的Python进程"
echo "sudo pkill -f 'python.*api_server.py'"
echo "cd /path/to/function && nohup python api_server.py > api.log 2>&1 &"
