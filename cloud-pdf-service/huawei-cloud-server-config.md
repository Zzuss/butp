# 华为云服务器配置指南

## 🎯 第一步：创建ECS实例

### 1.1 基础配置

**地域选择：**
- 推荐：华北-北京四、华东-上海一、华南-广州
- 原因：网络质量好，延迟低

**可用区：**
- 任意可用区即可
- 建议选择负载较低的可用区

**实例规格：**

| 配置等级 | 规格 | vCPU | 内存 | 价格/月 | 适用场景 |
|---------|------|------|------|---------|----------|
| **基础版** | s6.large.2 | 2核 | 4GB | ~35元 | 个人使用、轻量PDF |
| **标准版** | s6.xlarge.2 | 4核 | 8GB | ~70元 | 团队使用、中等负载 |
| **高性能版** | s6.2xlarge.2 | 8核 | 16GB | ~140元 | 高并发、大型PDF |

**推荐：标准版 (s6.xlarge.2)**

### 1.2 镜像选择

**操作系统：**
```
Ubuntu Server 22.04 LTS 64位
```

**为什么选择Ubuntu：**
- ✅ 软件包丰富，安装Chrome方便
- ✅ 社区支持好，文档完善
- ✅ 内存占用低，性能优秀
- ✅ 与部署脚本完美兼容

### 1.3 存储配置

**系统盘：**
```
类型：高IO (SSD)
大小：40GB
```

**数据盘：**
```
不需要额外数据盘（可选）
```

### 1.4 网络配置

**VPC网络：**
- 使用默认VPC即可
- 或创建新VPC：`pdf-service-vpc`

**子网：**
- 使用默认子网
- CIDR: 192.168.0.0/24

**安全组：**
创建新安全组 `pdf-service-sg`：

| 方向 | 协议 | 端口 | 源地址 | 说明 |
|------|------|------|--------|------|
| 入方向 | TCP | 22 | 0.0.0.0/0 | SSH管理 |
| 入方向 | TCP | 80 | 0.0.0.0/0 | HTTP访问 |
| 入方向 | TCP | 443 | 0.0.0.0/0 | HTTPS访问 |
| 入方向 | TCP | 8443 | 0.0.0.0/0 | PDF服务端口 |
| 出方向 | ALL | ALL | 0.0.0.0/0 | 允许所有出站 |

### 1.5 弹性公网IP

**带宽：**
```
类型：按流量计费
带宽：5Mbps (推荐) 或 10Mbps (高性能)
```

**费用预估：**
- 5Mbps: ~20-30元/月
- 10Mbps: ~40-50元/月

### 1.6 登录配置

**登录方式：**
```
✅ 密钥对登录 (推荐，更安全)
或
✅ 密码登录 (简单，但需设置复杂密码)
```

**密钥对创建：**
1. 创建新密钥对：`pdf-service-key`
2. 下载私钥文件：`pdf-service-key.pem`
3. 妥善保存私钥文件

## 🎯 第二步：购买配置

### 2.1 费用明细

**标准配置月费用：**
```
ECS实例 (s6.xlarge.2): ~70元
系统盘 (40GB SSD): ~8元
公网IP + 带宽 (5Mbps): ~25元
─────────────────────────
合计: ~103元/月
```

**年付优惠：**
- 选择年付可享受8-8.5折优惠
- 年费用约: ~900-1000元

### 2.2 购买流程

1. 登录华为云控制台
2. 进入 `产品` → `计算` → `弹性云服务器 ECS`
3. 点击 `立即购买`
4. 按上述配置选择参数
5. 确认订单并支付

## 🎯 第三步：初始化服务器

### 3.1 连接服务器

**Windows用户 (使用PuTTY)：**
```bash
# 下载PuTTY: https://www.putty.org/
# 转换密钥格式: 使用PuTTYgen转换.pem为.ppk
# 连接: 
Host: 服务器公网IP
Port: 22
Auth: 选择.ppk密钥文件
```

**Windows用户 (使用PowerShell)：**
```powershell
# 如果使用密钥对
ssh -i "pdf-service-key.pem" ubuntu@服务器公网IP

# 如果使用密码
ssh ubuntu@服务器公网IP
```

**Mac/Linux用户：**
```bash
# 设置密钥权限
chmod 600 pdf-service-key.pem

# 连接服务器
ssh -i "pdf-service-key.pem" ubuntu@服务器公网IP
```

### 3.2 首次登录

连接成功后，您会看到：
```bash
Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-86-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

ubuntu@pdf-service:~$
```

### 3.3 基础配置

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 设置时区
sudo timedatectl set-timezone Asia/Shanghai

# 检查系统信息
uname -a
free -h
df -h
```

## 🎯 第四步：域名配置 (可选)

### 4.1 域名购买

**免费域名：**
- Freenom: .tk, .ml, .ga 等
- 有效期：1年免费
- 续费：可免费续费

**付费域名：**
- 华为云域名：.com ~50元/年
- 阿里云域名：.com ~55元/年
- 腾讯云域名：.com ~55元/年

### 4.2 DNS解析配置

**在域名注册商处设置：**
```
类型: A记录
主机记录: @
记录值: 服务器公网IP
TTL: 600
```

**可选的子域名：**
```
类型: A记录
主机记录: pdf
记录值: 服务器公网IP
TTL: 600
```

访问地址将是：
- 主域名：`https://yourdomain.com`
- 子域名：`https://pdf.yourdomain.com`

### 4.3 DNS生效检查

```bash
# 检查DNS解析
nslookup yourdomain.com
dig yourdomain.com

# 或使用在线工具
# https://tool.chinaz.com/dns/
```

## 🎯 第五步：防火墙配置

### 5.1 UFW防火墙设置

```bash
# 启用防火墙
sudo ufw enable

# 允许SSH
sudo ufw allow 22

# 允许HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 允许PDF服务端口
sudo ufw allow 8443

# 查看状态
sudo ufw status
```

### 5.2 安全强化

```bash
# 禁用root登录
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/g' /etc/ssh/sshd_config

# 重启SSH服务
sudo systemctl restart sshd

# 设置自动安全更新
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

## 🎯 第六步：监控配置

### 6.1 华为云监控

在华为云控制台中：
1. 进入 `管理与监控` → `云监控服务`
2. 找到您的ECS实例
3. 设置告警规则：
   - CPU使用率 > 80%
   - 内存使用率 > 90%
   - 磁盘使用率 > 85%

### 6.2 日志监控

```bash
# 安装日志分析工具
sudo apt install logwatch

# 配置每日日志报告
sudo nano /etc/cron.daily/logwatch
```

## ✅ 配置检查清单

- [ ] ECS实例创建完成 (s6.xlarge.2, Ubuntu 22.04)
- [ ] 安全组正确配置 (22, 80, 443, 8443端口开放)
- [ ] 弹性公网IP绑定 (5Mbps带宽)
- [ ] SSH连接成功
- [ ] 系统更新完成
- [ ] 时区设置为Asia/Shanghai
- [ ] 域名解析配置 (如果使用域名)
- [ ] 防火墙规则设置
- [ ] 监控告警配置

## 🚀 下一步

服务器配置完成后，您就可以运行PDF服务部署脚本了：

```bash
# 下载并运行部署脚本
wget https://raw.githubusercontent.com/your-repo/butp/main/cloud-pdf-service/deploy-huawei.sh

# 使用域名部署
bash deploy-huawei.sh yourdomain.com

# 或使用IP部署
bash deploy-huawei.sh
```

## 📞 技术支持

**华为云技术支持：**
- 官方文档：https://support.huaweicloud.com/
- 在线客服：华为云控制台右下角
- 技术论坛：https://bbs.huaweicloud.com/

**遇到问题？**
- 检查安全组配置
- 验证网络连通性
- 查看系统日志：`sudo journalctl -f`
