# 🚀 5分钟快速配置指南

## 第一步：创建服务器 (2分钟)

### 华为云控制台操作：

1. **访问**：https://console.huaweicloud.com/ecm/?region=cn-north-4#/ecs/createVm
2. **快速配置**：

```
地域：北京四 (cn-north-4)
实例规格：s6.xlarge.2 (4核8GB) - 推荐
镜像：Ubuntu Server 22.04 LTS 64位
系统盘：高IO(SSD) 40GB
网络：默认VPC
安全组：新建 - 全部开放 (0.0.0.0/0)
带宽：按流量计费 5Mbps
登录方式：密码登录 (设置强密码)
```

3. **立即购买** → 支付

## 第二步：连接服务器 (1分钟)

### Windows用户：
```powershell
# 在PowerShell中执行
ssh ubuntu@你的服务器IP
# 输入密码
```

### 连接成功标志：
```
ubuntu@ecs-xxxx:~$
```

## 第三步：一键部署 (2分钟)

### 复制粘贴执行：

```bash
# 更新系统
sudo apt update -y

# 下载部署脚本
curl -O https://raw.githubusercontent.com/your-repo/butp/main/cloud-pdf-service/deploy-huawei.sh

# 运行部署 (使用IP访问)
bash deploy-huawei.sh

# 或使用域名 (如果你有域名)
# bash deploy-huawei.sh yourdomain.com
```

## 第四步：验证部署 (30秒)

```bash
# 检查服务状态
curl http://localhost/health

# 预期返回
{
  "status": "healthy",
  "service": "huawei-cloud-pdf-service"
}
```

## 第五步：前端配置 (30秒)

在您的项目中设置环境变量：

```bash
# .env.local
NEXT_PUBLIC_CAMPUS_PDF_SERVICE_URL=http://你的服务器IP/generate-pdf
```

## 🎉 完成！

现在您的PDF服务已经部署在华为云上，可以为全球用户提供服务了！

---

## 💡 配置建议

### 最小化配置 (省钱)：
- 实例：s6.large.2 (2核4GB) ~35元/月
- 带宽：1Mbps ~10元/月
- **总计：~45元/月**

### 推荐配置 (平衡)：
- 实例：s6.xlarge.2 (4核8GB) ~70元/月  
- 带宽：5Mbps ~25元/月
- **总计：~95元/月**

### 高性能配置 (土豪)：
- 实例：s6.2xlarge.2 (8核16GB) ~140元/月
- 带宽：10Mbps ~50元/月
- **总计：~190元/月**

---

## 🔧 常见问题

### Q: 连接超时？
A: 检查安全组是否开放22端口

### Q: 部署失败？
A: 确保选择Ubuntu 22.04，其他系统可能不兼容

### Q: PDF生成慢？
A: 升级到更高配置的实例

### Q: 想要HTTPS？
A: 购买域名，然后使用：`bash deploy-huawei.sh yourdomain.com`

---

## 📞 需要帮助？

如果遇到任何问题，请提供：
1. 服务器IP地址
2. 错误信息截图
3. 执行的命令

我们会立即协助解决！
