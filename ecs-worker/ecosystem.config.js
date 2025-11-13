module.exports = {
  apps: [{
    name: 'butp-worker',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    // 重启策略
    min_uptime: '10s',
    max_restarts: 10,
    // 监控
    monitoring: false,
    // 集群模式（如果需要）
    exec_mode: 'fork'
  }]
}
