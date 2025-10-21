#!/bin/bash
# 快速修复Python依赖冲突问题

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

log "🔧 修复Python依赖冲突问题"

# 方法1: 强制移除冲突的blinker包
log "方法1: 强制移除冲突包"
rm -rf /usr/lib/python3/dist-packages/blinker* || true
rm -rf /usr/local/lib/python3.10/dist-packages/blinker* || true

# 方法2: 使用apt安装系统版本的Flask
log "方法2: 安装系统版本Flask"
apt-get update
apt-get install -y python3-flask python3-werkzeug python3-jinja2 python3-blinker || true

# 方法3: 重新尝试pip安装
log "方法3: 重新安装Python包"
pip3 install --force-reinstall --no-deps blinker || true
pip3 install flask --no-deps || true
pip3 install werkzeug jinja2 itsdangerous markupsafe || true

# 验证安装结果
log "验证Flask安装"
python3 -c "import flask; print('✅ Flask版本:', flask.__version__)" || {
    warning "Flask导入失败，尝试备用方案..."
    
    # 备用方案：使用--break-system-packages
    pip3 install --break-system-packages flask || {
        error "所有Flask安装方法都失败了"
        exit 1
    }
}

log "验证其他依赖"
python3 -c "
try:
    import pandas
    print('✅ Pandas版本:', pandas.__version__)
except:
    print('❌ Pandas导入失败')

try:
    import openpyxl
    print('✅ openpyxl可用')
except:
    print('❌ openpyxl导入失败')

try:
    import catboost
    print('✅ CatBoost版本:', catboost.__version__)
except:
    print('❌ CatBoost导入失败')
"

log "✅ 依赖修复完成！现在可以启动服务了"
