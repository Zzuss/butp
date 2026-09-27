# 成绩导入直连 ECS 实施计划

## 1. 目标

解决 Vercel 服务端与中国大陆 ECS 之间连接不稳定、上传或导入超时的问题。

改造后的主要数据链路：

```text
浏览器 ── HTTPS 上传 Excel ──> ECS 导入服务
浏览器 <── SSE 导入进度 ──── ECS 导入服务
ECS 导入服务 <────────> Supabase
```

Vercel 只负责：

- 提供现有前端页面、JavaScript 和 CSS。
- 验证管理员身份并签发短期导入令牌。

Vercel 不再：

- 接收或转发 Excel 文件。
- 请求 ECS 文件列表。
- 代理 ECS 任务状态。
- 维持 ECS SSE 连接。
- 等待导入完成。

## 2. 确定的技术决策

- 继续使用 Node.js，不改用 Java。
- ECS 上只运行一个成绩导入服务。
- 由 PM2 单实例管理 Node.js 进程。
- 服务只监听 `127.0.0.1:3001`。
- Nginx 对外提供 `https://import.butp.tech`，并反向代理至 `127.0.0.1:3001`。
- 浏览器直接向 ECS 上传文件。
- 浏览器直接连接 ECS SSE 获取导入进度。
- Supabase 保存任务持久化状态和最终成绩数据。
- SSE 不是唯一状态来源；页面打开、刷新或 SSE 重连时使用状态查询接口恢复。
- 第一版严格单任务执行，避免共享影子表发生并发冲突。

## 3. 对外接口

### 3.1 健康检查

```http
GET /health
```

用于 Nginx、部署脚本和人工排查。

### 3.2 上传待导入文件

```http
POST /api/uploads
Content-Type: multipart/form-data
Authorization: Bearer <short-lived-token>
```

行为：

1. 验证短期令牌。
2. 验证文件数量、大小、扩展名和文件特征。
3. 使用服务端生成的 UUID 文件名保存到 ECS 临时目录。
4. 返回文件 ID 和元数据，但不立即导入。

待导入文件列表和删除接口：

```http
GET /api/uploads
DELETE /api/uploads/:fileId
```

### 3.3 创建并开始导入任务

```http
POST /api/imports
Content-Type: application/json
Authorization: Bearer <short-lived-token>

{"fileIds":["uuid-1","uuid-2"]}
```

ECS 在 Supabase 中创建 `import_tasks` 和文件明细，立即返回 `202 Accepted` 及 `taskId`，然后在后台串行执行导入。

### 3.4 查询任务状态

```http
GET /api/imports/:taskId
Authorization: Bearer <short-lived-token>
```

用于页面刷新、SSE 断线重连、故障排查和最终状态确认。

### 3.5 SSE 任务进度

```http
GET /api/imports/:taskId/events?token=<short-lived-token>
Accept: text/event-stream
```

事件类型：

- `snapshot`：连接建立后的当前状态。
- `progress`：文件或批次进度更新。
- `completed`：任务成功。
- `failed`：任务失败。
- SSE 注释心跳：约每 20 秒发送一次，防止代理清理空闲连接。

`EventSource` 不方便设置 `Authorization` 请求头，所以 SSE 使用短期查询参数令牌。令牌不得写入应用日志，Nginx 对 SSE 路径禁用 access log，避免持久化查询参数。

## 4. 认证与安全

1. Vercel 增加短期导入令牌接口。
2. 只有通过现有管理员认证的用户可以获得令牌。
3. Vercel 和 ECS 共享高强度 `IMPORT_TOKEN_SECRET`。
4. 令牌有效期默认 5 分钟，并限定用途、管理员身份和可选 `taskId`。
5. CORS 只允许正式站点和明确的预览环境，不使用 `*`。
6. Node.js 服务仅监听 `127.0.0.1`，公网只暴露 Nginx 443。
7. 严格生成服务端文件名，不信任客户端路径或原始文件名。
8. 限制文件数量和总大小，初始建议总上限 200 MB。

## 5. ECS 任务执行

### 5.1 文件目录

```text
/opt/butp-worker/temp/
├── <fileId>.xlsx
├── <fileId>.meta.json
├── <fileId>.xlsx
└── <fileId>.meta.json
```

文件元数据用于在刷新页面后恢复待导入列表；Supabase 中的任务记录是已启动导入任务的持久化事实来源。

### 5.2 状态

```text
pending -> processing -> completed
                      -> failed
```

记录至少包含：

- `created_at`
- `started_at`
- `heartbeat_at`
- `completed_at`
- `total_files`
- `processed_files`
- `total_records`
- `imported_records`
- `progress`
- `attempt_count`
- `error_message`

### 5.3 导入顺序

1. 原子领取任务。
2. 验证所有文件存在。
3. 解析和验证 Excel 表头及关键字段。
4. 清空影子表。
5. 分批导入影子表并持久化进度。
6. 执行完整性校验。
7. 在数据库事务/RPC 内完成最终交换。
8. 更新任务为 `completed`。
9. 最终交换成功后再删除上传文件。

任务失败时保留文件一段时间，便于排查和重试。

### 5.4 重启恢复

PM2/ECS 重启时：

1. 查询 `pending` 和超时的 `processing` 任务。
2. 检查对应本地文件是否存在。
3. 将可恢复任务重新放入单任务执行队列。
4. 文件不存在时将任务标记为失败并记录明确原因。

正常运行时不依赖周期队列轮询。

## 6. 前端改造

1. 上传前从 Vercel 获取短期令牌。
2. 使用 `XMLHttpRequest` 或支持上传进度的客户端封装，直接向 `https://import.butp.tech/api/imports` 上传。
3. 获得 `taskId` 后先查询一次当前状态。
4. 建立 SSE 连接并根据事件更新 UI。
5. SSE 断开时显示“正在重连”，不将任务误判为失败。
6. SSE 重连后再查询一次最新状态。
7. 页面刷新后从本地保存的 `taskId` 或最近任务接口恢复显示。
8. 删除前端 150 次轮询上限和“轮询超时=导入失败”逻辑。

## 7. Nginx 与 TLS

预期域名：

```text
import.butp.tech -> ECS 公网 IP
```

Nginx 关键配置：

```nginx
server {
    listen 443 ssl http2;
    server_name import.butp.tech;

    client_max_body_size 200m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        proxy_request_buffering off;
        proxy_buffering off;
        proxy_cache off;

        proxy_read_timeout 1h;
        proxy_send_timeout 1h;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

TLS 证书通过 Certbot 申请并自动续期。应在 DNS 生效后执行：

```bash
sudo certbot --nginx -d import.butp.tech
```

## 8. 端口与进程

### 对外端口

- `80/tcp`：HTTP 转 HTTPS，同时用于证书申请/续期。
- `443/tcp`：浏览器上传、状态查询和 SSE。

### 本机端口

- `127.0.0.1:3001`：Node.js 导入服务，不对公网开放。

3001 当前如果由旧 `butp-upload-server` 占用，不必修改端口；部署时用新合并服务替换它。在新服务验证完成前不停止现有服务。

## 9. PM2

只运行一个应用：

```text
name: butp-grade-import
instances: 1
listen: 127.0.0.1:3001
```

部署后：

```bash
pm2 save
pm2 startup
```

日志需配置轮转，避免长期占满磁盘。

## 10. 环境变量

### Vercel

```env
NEXT_PUBLIC_GRADE_IMPORT_URL=https://import.butp.tech
IMPORT_TOKEN_SECRET=<high-entropy-shared-secret>
```

### ECS

```env
HOST=127.0.0.1
PORT=3001
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
IMPORT_TOKEN_SECRET=<same-high-entropy-shared-secret>
ALLOWED_ORIGINS=https://butp.tech,<explicit-preview-origin-if-required>
IMPORT_DATA_DIR=/opt/butp-worker/data
MAX_UPLOAD_BYTES=209715200
MAX_CONCURRENT_TASKS=1
```

## 11. 实施顺序

1. 只读检查 ECS 端口、PM2、Nginx 及现有服务。
2. 备份现有 ECS worker 配置与相关 Nginx 配置。
3. 实现和测试合并后的 ECS 导入服务。
4. 实现 Vercel 短期令牌接口。
5. 改造成绩导入前端为直接请求 ECS。
6. 本地执行端到端测试。
7. 添加 `import.butp.tech` DNS A 记录。
8. 在 ECS 部署新服务，先用备用本机端口验证。
9. 配置 Nginx 并申请 TLS 证书。
10. 验证 HTTPS、CORS、上传和 SSE。
11. 切换前端生产环境变量并部署。
12. 用小测试文件导入，再用实际大文件导入。
13. 稳定后移除旧 Vercel -> ECS 代理路由和旧 PM2 进程。

## 12. 验收标准

- 浏览器 Network 面板显示 Excel 直接上传到 `import.butp.tech`。
- Vercel 函数日志中不再出现 ECS 上传、列表、删除、轮询或 SSE 请求。
- 上传完成后立即获得 `taskId`，不等待导入完成。
- SSE 可以持续接收进度、成功或失败事件。
- SSE 断线重连后 UI 恢复最新状态，不误报导入失败。
- 关闭页面不中断 ECS 导入。
- PM2 重启后可恢复未完成任务。
- 同一时间最多处理一个使用共享影子表的任务。
- 上传和 SSE 接口在无效或过期令牌下返回 401/403。
- ECS 公网无法直接访问 3001，只能通过 443 访问。

## 13. 回滚方案

- 保留旧 PM2 配置和旧代码备份，在新服务生产验证完成前不删除。
- 前端切换通过 `NEXT_PUBLIC_GRADE_IMPORT_URL` 控制。
- 如新服务异常，回退前端部署并恢复旧 PM2 进程。
- Nginx 新 server block 独立，不覆盖现有 Supabase 或预测服务配置。
- 导入失败时不交换主表，并保留原文件和错误日志。

## 14. 实施前需要确认

- [x] `import.butp.tech` 已添加 DNS A 记录，公共 DNS 已验证解析到 `39.96.196.67`。
- [ ] ECS 的 80/443 安全组规则可用。
- [x] 已确认端口：80 由 Nginx 监听，443 当前未监听，3001 由旧 `butp-upload-server` 监听。
- [ ] 已导出 Nginx 当前配置用于备份。
- [ ] 已确认 PM2 中现有 worker/upload 进程状态。
- [ ] 已确认 ECS 到 Supabase 数据库的连接信息正确。
- [ ] 已准备小型和大型 Excel 测试文件。

## 15. 当前实施进度（2026-09-27）

- [x] 前端改为浏览器直连 ECS 上传、列表、删除和启动导入。
- [x] 前端改为 SSE 接收进度，并实现断线状态查询与重连。
- [x] Vercel 短期 HMAC 导入令牌接口已实现。
- [x] ECS 合并服务、PM2 配置、Nginx 配置和部署文档已在本地完成。
- [x] 本地已验证健康检查、未授权拒绝、CORS 拒绝、Excel 上传、列表和删除。
- [ ] 尚未使用真实 Supabase 完成本地全量导入测试。
- [ ] 尚未将新服务部署到 ECS。
- [ ] 尚未在 ECS 上申请 TLS 证书或切换 Nginx/PM2。
- [ ] 尚未在 Vercel 配置生产环境变量并重新部署。
