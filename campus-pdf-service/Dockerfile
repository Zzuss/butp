# 校内PDF服务Docker配置
FROM node:18-slim

# 安装Puppeteer所需的系统依赖
RUN apt-get update \
    && apt-get install -y \
        wget \
        gnupg \
        ca-certificates \
        apt-transport-https \
        --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y \
        google-chrome-stable \
        fonts-liberation \
        fonts-noto-cjk \
        fonts-noto-color-emoji \
        libxss1 \
        libgconf-2-4 \
        libxrandr2 \
        libasound2 \
        libpangocairo-1.0-0 \
        libatk1.0-0 \
        libcairo-gobject2 \
        libgtk-3-0 \
        libgdk-pixbuf2.0-0 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxi6 \
        libxrender1 \
        libxtst6 \
        --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /src/*.deb

# 创建应用目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 创建非root用户（安全考虑）
RUN groupadd -r pdfuser && useradd -r -g pdfuser -G audio,video pdfuser \
    && mkdir -p /home/pdfuser/Downloads \
    && chown -R pdfuser:pdfuser /home/pdfuser \
    && chown -R pdfuser:pdfuser /app

# 切换到非root用户
USER pdfuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# 启动应用
CMD ["npm", "start"]
