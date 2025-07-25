import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service');

  if (!service) {
    return NextResponse.json({ error: 'Missing service parameter' }, { status: 400 });
  }

  // 在开发环境中，直接返回一个简单的HTML登录页面
  const loginPageHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock CAS 登录页面 - 开发环境</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            color: #333;
            margin: 0;
            font-size: 24px;
        }
        .dev-notice {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 12px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #333;
            font-weight: 500;
        }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            box-sizing: border-box;
        }
        input[type="text"]:focus, input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
        .login-btn {
            width: 100%;
            padding: 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .login-btn:hover {
            background: #5a6fd8;
        }
        .test-accounts {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            font-size: 14px;
        }
        .test-accounts h4 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .account {
            margin: 5px 0;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <h1>🎓 北邮统一认证系统</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Mock CAS Login</p>
        </div>
        
        <div class="dev-notice">
            <strong>开发环境提示：</strong> 这是一个模拟的CAS登录页面，仅用于本地开发测试。
        </div>

        <form id="loginForm">
            <div class="form-group">
                <label for="username">学号/工号:</label>
                <input type="text" id="username" name="username" placeholder="请输入学号" required>
            </div>
            
            <div class="form-group">
                <label for="password">密码:</label>
                <input type="password" id="password" name="password" placeholder="请输入密码" required>
            </div>
            
            <button type="submit" class="login-btn">登录</button>
        </form>

        <div class="test-accounts">
            <h4>测试账号：</h4>
            <div class="account">学号: 2021211001 / 密码: test123</div>
            <div class="account">学号: 2021211002 / 密码: test123</div>
            <div class="account">学号: 2021211003 / 密码: test123</div>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // 简单验证
            if (!username || !password) {
                alert('请输入学号和密码');
                return;
            }
            
            // 模拟登录成功，生成ticket并重定向
            const ticket = 'ST-DEV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const serviceUrl = '${service}';
            const redirectUrl = serviceUrl + (serviceUrl.includes('?') ? '&' : '?') + 'ticket=' + ticket + '&username=' + encodeURIComponent(username);
            
            // 重定向到service URL
            window.location.href = redirectUrl;
        });

        // 一键登录功能
        function quickLogin(username) {
            document.getElementById('username').value = username;
            document.getElementById('password').value = 'test123';
        }

        // 为测试账号添加点击事件
        document.querySelectorAll('.account').forEach(function(element) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', function() {
                const username = this.textContent.match(/\\d+/)[0];
                quickLogin(username);
            });
        });
    </script>
</body>
</html>`;

  return new NextResponse(loginPageHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
} 