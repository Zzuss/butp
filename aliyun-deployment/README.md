# 预测算法阿里云部署方案

基于Docker的完整部署解决方案，将Python机器学习预测算法部署到阿里云服务器，并提供HTTP API接口。

## 🎯 部署架构

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js前端   │───▶│ Nginx反向代理 │───▶│  Flask API服务  │───▶│   预测算法模型   │
│  (Vercel部署)   │    │   (80/443)    │    │    (8000端口)   │    │ (CatBoost/XGB) │
└─────────────────┘    └──────────────┘    └─────────────────┘    └─────────────────┘
          │                     │                     │                     │
          └─────────────────────┼─────────────────────┼─────────────────────┘
                                │                     │
                         ┌──────────────┐    ┌─────────────────┐
                         │ Redis缓存    │    │   日志系统      │
                         │ (可选)       │    │   监控告警      │
                         └──────────────┘    └─────────────────┘
```

## 📋 功能特性

### 🔧 核心功能
- **学生去向预测**: 支持保研/出国/就业预测
- **成绩逆推计算**: 计算达成目标所需最低分数
- **多专业支持**: 物联网工程、电信工程及管理、智能科学与技术、电子信息工程
- **批量处理**: 支持单专业和多专业批量预测
- **Excel文件处理**: 直接上传Excel成绩文件

### 🚀 技术特点
- **Docker容器化**: 一键部署，环境隔离
- **高性能API**: Flask + Gunicorn + Nginx
- **实时监控**: 健康检查、性能监控、日志分析
- **自动化运维**: 备份、更新、故障恢复
- **跨域支持**: 完整的CORS配置

## 🛠️ 快速开始

### 1. 环境检查

```bash
# 检查服务器环境
chmod +x scripts/check-environment.sh
./scripts/check-environment.sh
```

### 2. 安装依赖

```bash
# 自动安装所有依赖
chmod +x scripts/install-dependencies.sh
./scripts/install-dependencies.sh
```

### 3. 一键部署

```bash
# 部署服务
chmod +x deploy.sh
./deploy.sh
```

### 4. 验证部署

```bash
# 健康检查
curl http://your-server-ip/health

# 查看支持的专业
curl http://your-server-ip/api/majors
```

## 📁 项目文件结构

```
├── prediction_api.py              # Flask API服务主文件
├── api_requirements.txt           # Python依赖包
├── Dockerfile                     # Docker镜像配置
├── docker-compose.yml             # 容器编排配置
├── deploy.sh                      # 一键部署脚本
├── nginx/                         # Nginx配置
│   ├── nginx.conf
│   └── conf.d/prediction-api.conf
├── scripts/                       # 运维脚本
│   ├── check-environment.sh       # 环境检查
│   ├── install-dependencies.sh    # 依赖安装
│   ├── backup.sh                  # 数据备份
│   └── monitor.sh                 # 服务监控
├── function/                      # 预测算法目录
│   ├── Optimization_model_func3_1.py
│   ├── run_prediction_direct.py
│   ├── Model_Params/              # 模型文件
│   └── education-plan*/           # 教育计划数据
├── logs/                          # 日志目录
├── frontend-integration-example.js # 前端集成示例
└── README.md                      # 本文件
```

## 🖥️ 服务器配置要求

### 推荐配置
- **CPU**: 4核 或以上
- **内存**: 8GB 或以上  
- **存储**: 40GB SSD 或以上
- **操作系统**: Ubuntu 20.04 LTS 或 CentOS 7.9
- **网络**: 公网IP，开放80、443端口

### 阿里云ECS选择
- **实例规格**: ecs.c6.xlarge 或更高
- **镜像**: Ubuntu 20.04 64位
- **网络**: 专有网络VPC
- **安全组**: 开放22(SSH)、80(HTTP)、443(HTTPS)端口

## 🔌 API接口文档

### 基础接口

#### 健康检查
```http
GET /health
```
返回服务状态和版本信息

#### 获取支持的专业
```http
GET /api/majors
```
返回所有支持的专业列表

### 预测接口

#### 单专业预测
```http
POST /api/predict
Content-Type: multipart/form-data

scores_file: Excel成绩文件
major: 专业名称
config: 可选配置参数(JSON字符串)
```

#### 批量预测
```http
POST /api/predict/batch
Content-Type: multipart/form-data

scores_file: Excel成绩文件
majors: 专业列表(JSON数组字符串)
config: 可选配置参数(JSON字符串)
```

### 配置参数示例
```json
{
  "min_grade": 60,
  "max_grade": 90,
  "with_uniform_inverse": 1
}
```

## 🎨 前端集成

### React/Next.js 集成示例

```javascript
import { usePredictionAPI } from './prediction-api-client';

const PredictionPage = () => {
  const { predictStudents, loading, error } = usePredictionAPI();
  
  const handlePredict = async (file, major) => {
    try {
      const result = await predictStudents(file, major);
      console.log('预测结果:', result);
    } catch (error) {
      console.error('预测失败:', error);
    }
  };
  
  // ... 组件实现
};
```

### 环境变量配置
```bash
# .env.local
NEXT_PUBLIC_PREDICTION_API_URL=https://your-aliyun-server.com
NEXT_PUBLIC_API_KEY=your-api-key-if-needed
```

## 🔧 运维管理

### 常用命令

```bash
# 服务管理
docker-compose up -d          # 启动服务
docker-compose down           # 停止服务
docker-compose restart        # 重启服务
docker-compose ps             # 查看状态
docker-compose logs -f        # 查看日志

# 监控管理
./scripts/monitor.sh           # 一次性监控
./scripts/monitor.sh --continuous  # 持续监控
./scripts/monitor.sh --alert   # 生成监控报告

# 备份管理
./scripts/backup.sh            # 创建备份
./scripts/backup.sh --keep-days 30  # 保留30天备份
./scripts/backup.sh --include-logs   # 包含日志
```

### 日志位置
- API服务日志: `logs/prediction_api.log`
- Nginx访问日志: `nginx/logs/access.log`
- Nginx错误日志: `nginx/logs/error.log`
- 监控日志: `logs/monitor.log`

### 性能优化

#### 内存优化
- 调整Gunicorn worker数量
- 配置模型缓存策略
- 优化Docker内存限制

#### 并发优化
- 增加Nginx worker进程
- 调整连接池大小
- 启用HTTP/2

#### 存储优化
- 配置日志轮转
- 清理临时文件
- 压缩备份数据

## 🚨 故障排除

### 常见问题

#### 1. 服务启动失败
```bash
# 检查Docker服务
sudo systemctl status docker

# 查看容器日志
docker-compose logs prediction-api

# 检查端口占用
ss -tuln | grep :80
```

#### 2. API调用失败
```bash
# 测试健康检查
curl -v http://localhost/health

# 检查防火墙
sudo ufw status

# 查看Nginx错误日志
tail -f nginx/logs/error.log
```

#### 3. 预测算法错误
```bash
# 检查模型文件
ls -la function/Model_Params/Task3_CatBoost_Model/

# 查看Python错误
docker-compose logs prediction-api | grep ERROR

# 检查文件权限
ls -la function/
```

#### 4. 内存不足
```bash
# 查看内存使用
free -h

# 查看容器资源使用
docker stats

# 优化配置
# 减少Gunicorn worker数量
# 清理不必要的文件
```

### 应急处理

#### 快速重启
```bash
./deploy.sh --rebuild
```

#### 回滚到备份
```bash
# 停止服务
docker-compose down

# 恢复备份
tar -xzf /opt/backups/prediction-api/prediction-api-backup-*.tar.gz
cp -r prediction-api-backup-*/* ./

# 重新部署
./deploy.sh
```

## 📊 监控告警

### 监控指标
- **系统资源**: CPU、内存、磁盘使用率
- **应用状态**: 容器运行状态、API健康检查
- **性能指标**: 响应时间、错误率、并发数
- **日志分析**: 错误日志、访问日志

### 告警阈值
- CPU使用率 > 80%
- 内存使用率 > 80%
- 磁盘使用率 > 85%
- API响应失败 > 5%

## 💰 成本估算

### 阿里云ECS成本 (月度)
- **计算型c6.xlarge**: 约300-500元
- **存储费用**: 40GB SSD 约20元
- **流量费用**: 按实际使用计算
- **总计**: 约350-550元/月

### 优化建议
- 使用包年套餐享受折扣
- 合理配置实例规格
- 开启弹性伸缩
- 使用CDN减少流量成本

## 🔐 安全配置

### 基础安全
- 定期更新系统补丁
- 配置防火墙规则
- 使用非root用户运行服务
- 限制SSH访问

### 应用安全
- API认证授权
- HTTPS加密传输
- 输入数据验证
- 日志脱敏处理

### 网络安全
- VPC网络隔离
- 安全组规则
- DDoS防护
- WAF应用防火墙

## 📚 参考资料

### 技术文档
- [Docker官方文档](https://docs.docker.com/)
- [Nginx配置指南](https://nginx.org/en/docs/)
- [Flask部署指南](https://flask.palletsprojects.com/en/2.0.x/deploying/)
- [阿里云ECS文档](https://help.aliyun.com/product/25365.html)

### 最佳实践
- [Docker生产环境最佳实践](https://docs.docker.com/develop/dev-best-practices/)
- [Python Web应用部署](https://www.digitalocean.com/community/tutorials/how-to-serve-flask-applications-with-gunicorn-and-nginx-on-ubuntu-18-04)
- [Nginx性能优化](https://www.nginx.com/blog/tuning-nginx/)

## 🤝 技术支持

### 联系方式
- 技术问题: 查看日志文件和监控报告
- 部署问题: 运行环境检查脚本
- 性能优化: 查看监控数据和性能统计

### 更新计划
- 持续优化算法性能
- 增加更多专业支持
- 扩展API功能
- 改进监控告警

---

## ⚡ 快速部署命令总结

```bash
# 1. 环境检查
./scripts/check-environment.sh

# 2. 安装依赖(如果需要)
./scripts/install-dependencies.sh

# 3. 一键部署
./deploy.sh

# 4. 验证部署
curl http://your-server-ip/health

# 5. 持续监控
./scripts/monitor.sh --continuous
```

部署完成后，你的预测算法将通过稳定的API接口为前端应用提供服务！🎉