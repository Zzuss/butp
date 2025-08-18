FROM node:18-slim

# 使用国内镜像源，设置超时/重试并安装必要依赖与 chromium
ENV DEBIAN_FRONTEND=noninteractive
RUN printf 'deb http://mirrors.ustc.edu.cn/debian/ bookworm main contrib non-free\n' > /etc/apt/sources.list \
 && printf 'deb http://mirrors.ustc.edu.cn/debian/ bookworm-updates main contrib non-free\n' >> /etc/apt/sources.list \
 && printf 'deb http://mirrors.ustc.edu.cn/debian-security bookworm-security main contrib non-free\n' >> /etc/apt/sources.list \
 && apt-get update -o Acquire::Retries=5 -o Acquire::http::Timeout=60 \
 && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation libatk1.0-0 libatk-bridge2.0-0 libcups2 libdbus-1-3 \
    libdrm2 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxshmfence1 \
    libgconf-2-4 libnss3 libasound2 lsb-release wget xz-utils chromium \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
# Use npm install when package-lock.json is not provided in the build context
# `npm ci` requires a lockfile; `npm install --production` is more tolerant for this example
RUN npm install --production --silent --no-audit

# copy source
COPY . .

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "server.js"]


