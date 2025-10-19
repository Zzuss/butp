# 🔍 专业列表API调试指南

## 问题描述
健康检查正常，但获取专业列表失败，显示"网络错误: Failed to fetch"

## 🛠️ 调试工具

### 1. 增强的网页测试界面
访问 `/test-aliyun-prediction` 页面，现在包含：
- **增强调试信息**: 控制台显示详细的API调用过程
- **API路径测试按钮**: "🔍 调试API路径" - 自动测试多种可能的API路径
- **详细错误信息**: 显示错误代码和详细信息

### 2. 命令行专门调试脚本
```bash
# 使用专门的调试脚本
node scripts/test-majors-api.js http://你的服务器:8080
```

### 3. 手动curl测试
```bash
# 测试不同的API路径
curl -X GET "http://你的服务器:8080/api/majors" -H "Accept: application/json"
curl -X GET "http://你的服务器:8080/majors" -H "Accept: application/json"
curl -X GET "http://你的服务器:8080/api/v1/majors" -H "Accept: application/json"
```

## 🔍 调试步骤

### 第一步：使用网页调试
1. 打开浏览器开发者工具 (F12)
2. 切换到 Console 标签
3. 访问测试页面并点击"🔍 调试API路径"按钮
4. 查看控制台输出的详细信息

### 第二步：分析控制台输出
查找以下信息：
```
[手动测试] 测试路径: http://你的服务器:8080/api/majors
[手动测试] /api/majors - 状态: 404
[手动测试] /api/majors - 响应: 404 Not Found
```

### 第三步：使用命令行工具
```bash
node scripts/test-majors-api.js http://你的服务器:8080
```

## 🎯 可能的原因和解决方案

### 原因1: API路径不存在
**症状**: 返回404错误
**解决方案**: 
1. 检查服务器端是否实现了 `/api/majors` 路由
2. 可能使用了不同的路径，如 `/majors` 或 `/api/v1/majors`

### 原因2: API返回格式问题
**症状**: 请求成功但数据解析失败
**解决方案**: 检查返回的JSON格式是否正确

### 原因3: 服务器端错误
**症状**: 500错误或其他服务器错误
**解决方案**: 检查服务器日志

### 原因4: 跨域问题
**症状**: CORS错误
**解决方案**: 检查服务器端CORS配置

## 🛠️ 服务器端检查

### 1. 检查Flask API实现
确认是否有类似这样的路由：
```python
@app.route("/api/majors", methods=["GET"])
def get_majors():
    return jsonify({
        "success": True,
        "data": {
            "majors": ["物联网工程", "电信工程及管理", "其他专业"]
        }
    })
```

### 2. 检查服务器日志
```bash
# 查看Gunicorn日志
sudo journalctl -u prediction-api -f

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 3. 检查服务状态
```bash
# 检查服务是否运行
sudo systemctl status prediction-api
sudo systemctl status nginx

# 检查端口监听
sudo netstat -tlnp | grep :8080
sudo netstat -tlnp | grep :8001
```

## 📝 预期的API响应格式

专业列表API应该返回以下格式之一：

### 格式1 (推荐):
```json
{
  "success": true,
  "data": {
    "majors": ["物联网工程", "电信工程及管理"],
    "count": 2
  }
}
```

### 格式2:
```json
{
  "majors": ["物联网工程", "电信工程及管理"]
}
```

### 格式3:
```json
["物联网工程", "电信工程及管理"]
```

## 🚀 快速修复建议

### 如果API路径不存在
1. 在Flask应用中添加专业列表路由
2. 或者修改前端代码使用正确的路径

### 如果API格式不对
1. 修改服务器端返回正确的JSON格式
2. 或者修改前端代码适配现有格式

### 临时绕过方案
如果专业列表API暂时无法修复，可以：
1. 手动在前端代码中硬编码专业列表
2. 修改 `app/test-aliyun-prediction/page.tsx` 中的初始专业列表

## 📞 需要更多帮助？

如果问题仍然存在，请提供：
1. 浏览器控制台的完整错误信息
2. 命令行调试脚本的输出
3. 服务器端的日志信息
4. curl命令的测试结果

---

**提示**: 新的调试功能会自动尝试多种API路径和响应格式，大大提高了兼容性！
