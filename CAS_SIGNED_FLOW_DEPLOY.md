# 在共享校内中转服务中增加 BuTP CAS 校验

本方案不替换校内服务器已有服务，也不改变其他服务的路由。`cas-signed-router.js` 是一个可挂载到现有 Express 应用的处理器：仅拦截 `app=butp` 的 CAS 请求，其他请求调用 `next()`，交给原有代码处理。IP 和端口仍为 `10.3.58.3:8080`。

## 接入校内服务

本机副本 `/Users/huangchangcheng/code/butp/cas-proxy` 已完成接入：`server.js` 只在原有回调前新增下面一行，`cas-signed-router.js` 是独立文件，`package.json` 和锁文件已加入 `xml2js`。原有三个文件分别有 `*.before-butp-signed-20260918` 备份。

```js
require('./cas-signed-router')(app);
```

现有服务进程仍监听原来的 8080 端口，不启动第二个服务。`ecosystem.config.js` 指向校内主机 `/home/bupt/cas-proxy/server.js`；提交网站仓库不会自动更新那台主机。需要把本机副本中已修改的 `server.js`、`cas-signed-router.js`、`package.json`、`package-lock.json` 同步到校内主机，再在校内主机安装依赖并重启现有 PM2 进程。同步前也应备份校内主机的现有文件，因为它可能比本机副本更新。

校方登录所用的 `service` 是 `http://10.3.58.3:8080/api/auth/cas/callback?app=butp`，代理向 `/serviceValidate` 提交**完全相同**的值。请先确认校方白名单允许该回调 URL；若白名单要求精确匹配原有路径而拒绝 `?app=butp`，则须改用不变的回调 URL 与代理 cookie 区分流量。

## 两端配置

运行 `openssl rand -hex 32`，生成一份 64 位十六进制密钥。把同一份值分别设置为 Vercel 项目和校内服务进程的 `CAS_ASSERTION_SECRET` 环境变量。不要写进仓库。校内服务可设置 `CAS_ALLOWED_ORIGINS=https://butp.tech`；本地试验可额外加入 `http://localhost:3000`。

## 试运行

网站部署后，在校园网或 VPN 中访问 `https://butp.tech/login`。网站请求 `/api/auth/cas/start-signed`，弹窗访问中转机 `/api/auth/cas/proxy-login?app=butp&flow=signed`。校方回调中转机的 `callback?app=butp`，中转机校验 ticket 并签名，再由浏览器把签名结果交给网站 `/api/auth/cas/verify-assertion`。Vercel 不联系校方或中转机。

普通 `/login` 默认使用新的签名认证流程，网站上的旧票据验证接口已删除；校内中转仍保留 `app=butp` 签名回调和其他服务使用的原回调。校内服务器当前时钟比正常 UTC 时间慢约 28 分钟，因此网站不再用校内服务器的绝对 `iat`/`exp` 判断过期；网站把随机状态及开始时间保存在自身加密会话中，最多允许从发起登录起 5 分钟完成认证，同时验证校内服务器的 HMAC 签名。校内服务器自身仍检查其签发的流程 cookie。当前代理仍沿用 HTTP，正式长期使用建议给该地址配置 HTTPS。
