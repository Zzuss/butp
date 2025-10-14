#!/bin/bash
# 预测算法服务备份脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置
BACKUP_DIR="/opt/backups/prediction-api"
PROJECT_DIR="$(pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="prediction-api-backup-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# 参数解析
KEEP_DAYS=7
COMPRESS=true
INCLUDE_LOGS=false
INCLUDE_MODELS=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --keep-days)
            KEEP_DAYS="$2"
            shift 2
            ;;
        --no-compress)
            COMPRESS=false
            shift
            ;;
        --include-logs)
            INCLUDE_LOGS=true
            shift
            ;;
        --exclude-models)
            INCLUDE_MODELS=false
            shift
            ;;
        --help)
            echo "使用方法: $0 [选项]"
            echo "选项:"
            echo "  --keep-days N      保留N天的备份 (默认: 7)"
            echo "  --no-compress      不压缩备份文件"
            echo "  --include-logs     包含日志文件"
            echo "  --exclude-models   排除模型文件"
            echo "  --help             显示此帮助信息"
            exit 0
            ;;
        *)
            log_error "未知参数: $1"
            exit 1
            ;;
    esac
done

log_info "开始备份预测算法服务..."
log_info "备份路径: $BACKUP_PATH"

# 创建备份目录
sudo mkdir -p "$BACKUP_DIR"
sudo chown $USER:$USER "$BACKUP_DIR"
mkdir -p "$BACKUP_PATH"

# 备份应用代码
log_info "备份应用代码..."
cp -r prediction_api.py "$BACKUP_PATH/"
cp -r api_requirements.txt "$BACKUP_PATH/"
cp -r Dockerfile "$BACKUP_PATH/"
cp -r docker-compose.yml "$BACKUP_PATH/"

# 备份配置文件
log_info "备份配置文件..."
if [ -d "nginx" ]; then
    cp -r nginx "$BACKUP_PATH/"
fi

if [ -d "scripts" ]; then
    cp -r scripts "$BACKUP_PATH/"
fi

# 备份function目录
log_info "备份预测算法..."
if [ -d "function" ]; then
    if [ "$INCLUDE_MODELS" = true ]; then
        cp -r function "$BACKUP_PATH/"
        log_info "已包含模型文件"
    else
        # 排除模型文件的备份
        rsync -av --exclude="*.cbm" --exclude="*.pkl" function/ "$BACKUP_PATH/function/"
        log_info "已排除模型文件"
    fi
fi

# 备份日志文件（可选）
if [ "$INCLUDE_LOGS" = true ] && [ -d "logs" ]; then
    log_info "备份日志文件..."
    cp -r logs "$BACKUP_PATH/"
fi

# 备份Docker镜像
log_info "导出Docker镜像..."
if docker images | grep -q "prediction"; then
    docker save -o "$BACKUP_PATH/prediction-api-image.tar" \
        $(docker images | grep prediction | awk '{print $1":"$2}' | head -1) 2>/dev/null || \
        log_warning "Docker镜像导出失败"
fi

# 备份数据库（如果有）
log_info "检查数据库备份..."
if docker-compose ps | grep -q redis; then
    log_info "备份Redis数据..."
    docker-compose exec -T redis redis-cli BGSAVE
    sleep 2
    docker cp $(docker-compose ps -q redis):/data/dump.rdb "$BACKUP_PATH/redis-dump.rdb" 2>/dev/null || \
        log_warning "Redis数据备份失败"
fi

# 备份环境信息
log_info "备份环境信息..."
cat << EOF > "$BACKUP_PATH/backup-info.txt"
备份时间: $(date)
项目目录: $PROJECT_DIR
Docker版本: $(docker --version)
Docker Compose版本: $(docker-compose --version 2>/dev/null || docker compose version)
系统信息: $(uname -a)
磁盘使用: $(df -h /)

Docker镜像:
$(docker images | grep -E "(prediction|nginx|redis)")

Docker容器状态:
$(docker-compose ps)

系统负载:
$(uptime)

内存使用:
$(free -h)
EOF

# 生成文件清单
log_info "生成文件清单..."
find "$BACKUP_PATH" -type f -exec ls -lh {} \; > "$BACKUP_PATH/file-manifest.txt"

# 计算备份大小
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
log_info "备份大小: $BACKUP_SIZE"

# 压缩备份（可选）
if [ "$COMPRESS" = true ]; then
    log_info "压缩备份文件..."
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    
    # 检查压缩结果
    if [ $? -eq 0 ]; then
        COMPRESSED_SIZE=$(ls -lh "${BACKUP_NAME}.tar.gz" | awk '{print $5}')
        log_success "备份压缩完成: $COMPRESSED_SIZE"
        
        # 删除未压缩的目录
        rm -rf "$BACKUP_NAME"
        FINAL_BACKUP="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    else
        log_error "备份压缩失败"
        FINAL_BACKUP="$BACKUP_PATH"
    fi
    cd "$PROJECT_DIR"
else
    FINAL_BACKUP="$BACKUP_PATH"
fi

# 清理旧备份
log_info "清理超过 $KEEP_DAYS 天的旧备份..."
find "$BACKUP_DIR" -name "prediction-api-backup-*" -type f -mtime +$KEEP_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "prediction-api-backup-*" -type d -mtime +$KEEP_DAYS -exec rm -rf {} \; 2>/dev/null || true

DELETED_COUNT=$(find "$BACKUP_DIR" -name "prediction-api-backup-*" -type f -mtime +$KEEP_DAYS 2>/dev/null | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    log_info "已删除 $DELETED_COUNT 个旧备份"
fi

# 显示现有备份
log_info "当前备份列表:"
ls -lht "$BACKUP_DIR" | head -10

# 创建备份记录
echo "$(date '+%Y-%m-%d %H:%M:%S') - $FINAL_BACKUP - $BACKUP_SIZE" >> "$BACKUP_DIR/backup.log"

log_success "备份完成！"
echo
echo "备份文件: $FINAL_BACKUP"
echo "备份大小: $BACKUP_SIZE"
echo "保留天数: $KEEP_DAYS 天"
echo
echo "恢复命令示例:"
if [ "$COMPRESS" = true ]; then
    echo "  tar -xzf ${FINAL_BACKUP} -C /tmp/"
    echo "  # 然后将文件复制到项目目录"
else
    echo "  cp -r $FINAL_BACKUP/* /path/to/project/"
fi

echo
echo "管理命令:"
echo "  查看备份: ls -la $BACKUP_DIR"
echo "  清理备份: find $BACKUP_DIR -name 'prediction-api-backup-*' -mtime +30 -delete"
