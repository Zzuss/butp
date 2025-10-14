#!/bin/bash
# 阿里云服务器预测算法部署脚本
# 使用方法: ./deploy.sh [--rebuild] [--logs]

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 参数解析
REBUILD=false
SHOW_LOGS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --rebuild)
            REBUILD=true
            shift
            ;;
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        *)
            log_error "未知参数: $1"
            echo "使用方法: $0 [--rebuild] [--logs]"
            exit 1
            ;;
    esac
done

log_info "开始部署预测算法API服务..."

# 检查Docker和docker-compose
if ! command -v docker &> /dev/null; then
    log_error "Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "docker-compose未安装，请先安装docker-compose"
    exit 1
fi

# 检查必要文件
REQUIRED_FILES=(
    "prediction_api.py"
    "api_requirements.txt"
    "Dockerfile"
    "docker-compose.yml"
    "nginx/nginx.conf"
    "nginx/conf.d/prediction-api.conf"
    "function/Optimization_model_func3_1.py"
    "function/Model_Params/Task3_CatBoost_Model"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -e "$file" ]]; then
        log_error "缺少必要文件: $file"
        exit 1
    fi
done

log_success "所有必要文件检查通过"

# 创建必要目录
log_info "创建必要目录..."
mkdir -p logs nginx/logs static

# 设置权限
chmod +x deploy.sh
chmod +x scripts/*.sh 2>/dev/null || true

# 停止现有服务
log_info "停止现有服务..."
docker-compose down --remove-orphans 2>/dev/null || true

# 清理旧镜像（如果需要重新构建）
if $REBUILD; then
    log_info "清理旧镜像..."
    docker image prune -f
    docker-compose build --no-cache
else
    log_info "构建镜像..."
    docker-compose build
fi

# 启动服务
log_info "启动服务..."
docker-compose up -d

# 等待服务启动
log_info "等待服务启动..."
sleep 10

# 健康检查
log_info "执行健康检查..."
for i in {1..30}; do
    if curl -f http://localhost/health &>/dev/null; then
        log_success "服务启动成功！"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "服务启动失败，请检查日志"
        docker-compose logs prediction-api
        exit 1
    fi
    log_info "等待服务启动... ($i/30)"
    sleep 2
done

# 显示服务状态
log_info "服务状态:"
docker-compose ps

# 显示访问信息
log_success "部署完成！"
echo
echo "API访问地址:"
echo "  健康检查: http://$(curl -s ifconfig.me || echo 'localhost')/health"
echo "  支持的专业: http://$(curl -s ifconfig.me || echo 'localhost')/api/majors"
echo "  预测接口: http://$(curl -s ifconfig.me || echo 'localhost')/api/predict"
echo
echo "管理命令:"
echo "  查看日志: docker-compose logs -f"
echo "  重启服务: docker-compose restart"
echo "  停止服务: docker-compose down"
echo "  服务状态: docker-compose ps"

# 显示日志（可选）
if $SHOW_LOGS; then
    echo
    log_info "显示实时日志 (Ctrl+C 退出):"
    docker-compose logs -f
fi

log_success "部署脚本执行完成！"
