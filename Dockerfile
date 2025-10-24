# 预测算法API服务 Docker镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONPATH=/app
ENV FLASK_APP=prediction_api.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    cmake \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 创建非root用户
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 复制依赖文件
COPY api_requirements.txt /app/

# 安装Python依赖
RUN pip install --no-cache-dir -r api_requirements.txt

# 复制应用代码
COPY prediction_api.py /app/
COPY function/ /app/function/

# 创建日志目录
RUN mkdir -p /app/logs && chown -R appuser:appuser /app/logs

# 设置文件权限
RUN chown -R appuser:appuser /app

# 切换到非root用户
USER appuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 暴露端口
EXPOSE 8000

# 启动命令（生产环境使用Gunicorn）
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "2", "--worker-class", "gthread", "--timeout", "300", "--keep-alive", "2", "--max-requests", "1000", "--max-requests-jitter", "50", "--access-logfile", "logs/access.log", "--error-logfile", "logs/error.log", "prediction_api:app"]
