module.exports = {
  apps: [
    {
      name: 'butp-worker',
      script: 'index-fixed.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-worker-error.log',
      out_file: './logs/pm2-worker-out.log',
      log_file: './logs/pm2-worker-combined.log',
      time: true
    },
    {
      name: 'butp-upload-server',
      script: 'upload-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        UPLOAD_PORT: 3001
      },
      error_file: './logs/pm2-upload-error.log',
      out_file: './logs/pm2-upload-out.log',
      log_file: './logs/pm2-upload-combined.log',
      time: true
    }
  ]
}
