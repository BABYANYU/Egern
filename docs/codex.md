# Yanyu · Codex（Egern 本地组件）

面向 ChatGPT Plus 的账户级 Codex 额度查询，公开文件不含用户凭据，未修改挂载目录。**不是 OpenAI 承诺兼容的稳定公共 API**；即使路径存在于官方开源客户端，后端仍可能随时变更、拒绝第三方请求或要求其他访问条件。没有拿用户凭据做在线额度验证。

## 公开源码核实

通过 [GitHub recursive tree API](https://api.github.com/repos/openai/codex/git/trees/main?recursive=1) 定位文件，本次取得官方 commit `ffd3429d754991183433b4d41b67551e5656ba27`。以下链接固定此 commit，而非假定未来 main 不变：

1. [backend client：主机补齐 backend-api](https://github.com/openai/codex/blob/ffd3429d754991183433b4d41b67551e5656ba27/codex-rs/backend-client/src/client.rs#L208-L220)。
2. [usage GET 和两种路径](https://github.com/openai/codex/blob/ffd3429d754991183433b4d41b67551e5656ba27/codex-rs/backend-client/src/client/rate_limit_resets.rs#L68-L81)，[路由拼接](https://github.com/openai/codex/blob/ffd3429d754991183433b4d41b67551e5656ba27/codex-rs/backend-client/src/client/rate_limit_resets.rs#L124-L129)：ChatGPT 模式 `/backend-api/wham/usage`；另一种 CodexApi 基址模式 `/api/codex/usage`，不是让本组件在 chatgpt.com 上盲试的备用路径。本组件只请求 `https://chatgpt.com/backend-api/wham/usage`。
3. [Bearer 实现](https://github.com/openai/codex/blob/ffd3429d754991183433b4d41b67551e5656ba27/codex-rs/model-provider/src/bearer_auth_provider.rs#L31-L37)；[ChatGPT-Account-Id 请求头](https://github.com/openai/codex/blob/ffd3429d754991183433b4d41b67551e5656ba27/codex-rs/backend-client/src/client.rs#L269-L283)。官方客户端账户头可选；本组件为避免误选工作区要求用户显式填写。
4. [payload 模型](https://github.com/openai/codex/blob/ffd3429d754991183433b4d41b67551e5656ba27/codex-rs/codex-backend-openapi-models/src/models/rate_limit_status_payload.rs)：`plan_type`、可空 `rate_limit`、`additional_rate_limits` 等。
5. [rate_limit 模型](https://github.com/openai/codex/blob/ffd3429d754991183433b4d41b67551e5656ba27/codex-rs/codex-backend-openapi-models/src/models/rate_limit_status_details.rs)：`allowed`、`limit_reached`、可空 `primary_window` / `secondary_window`。
6. [窗口模型](https://github.com/openai/codex/blob/ffd3429d754991183433b4d41b67551e5656ba27/codex-rs/codex-backend-openapi-models/src/models/rate_limit_window_snapshot.rs)：`used_percent`、`limit_window_seconds`、`reset_after_seconds`、`reset_at`；[客户端映射](https://github.com/openai/codex/blob/ffd3429d754991183433b4d41b67551e5656ba27/codex-rs/backend-client/src/client.rs#L743-L755)把 `reset_at` 作为 Unix 秒。
7. [Codex 身份映射](https://github.com/openai/codex/blob/ffd3429d754991183433b4d41b67551e5656ba27/codex-rs/backend-client/src/client.rs#L615-L655)：顶层 `rate_limit` 映射为 `codex`；附加池另以 `metered_feature` 标识。本组件不读取额外模型、代码审查池、积分或美元额度，避免混淆。

以上证实源码契约，不代表已对用户账户成功查询。Plus 身份也不能保证每次返回固定两个窗口。

## 安装与参数

1. 在 Egern → 工具 → 模块中添加在线地址 `https://raw.githubusercontent.com/BABYANYU/Egern/main/modules/Codex.yaml`，保存启用。脚本由模块在线加载。
2. 模块设置通过 `env_schema` 生成输入控件：`ACCESS_TOKEN`、`ACCOUNT_ID`、`POLICY`。在设备本地填写，模块级环境会传入 `ctx.env`。不要填入 YAML 正文、兼容参数模板、URL 或脚本源码。任一授权项为空显示“待授权”，不发出请求。
3. `POLICY` 是已有 Egern 策略组名，留空由脚本回退到 `Proxy`。`default_value` 只是 UI 占位，不等于已经写入环境。
4. 添加名为 Codex 的小组件。通用脚本配置的正式键为 `scriptings: - generic:`，配合 `widgets:`，不是猜测的顶层 `scripts:`。

文档：[模块与 env_schema](https://egernapp.com/docs/configuration/modules)、[脚本](https://egernapp.com/docs/configuration/scriptings)、[Widgets](https://egernapp.com/docs/configuration/widgets)、[HTTP API](https://egernapp.com/docs/javascript-api)。HTTP `timeout: 10000` 单位毫秒，模块脚本 `timeout: 15` 单位秒。`redirect: error` 禁止跨地址跳转携带授权，`credentials: omit` 不使用 Cookie 登录态。

## 用户自行在本地取得授权（不要发给任何人）

首选：在自己的电脑浏览器登录 ChatGPT 的正确 Plus 账户/工作区，打开 Codex 的 Usage 页面，浏览器开发者工具 Network 中筛选实际的 `/backend-api/wham/usage` 请求。只在本地查看 Request Headers：

- 将 `Authorization` 中 `Bearer ` 后面的短期 **access token** 填到设备本地模块的 `ACCESS_TOKEN`，不含 Bearer 前缀。
- 将同一请求的 `ChatGPT-Account-Id` 值填到 `ACCOUNT_ID`。不要把 user ID、邮箱或 API 组织 ID 当账户 ID。
- 若页面未产生该请求，不要猜账户头。可用自己已通过 ChatGPT 登录的官方 Codex CLI 的本地认证资料：通常在 `$CODEX_HOME/auth.json`（默认 `~/.codex/auth.json`），用可信的本地编辑器仅查看 `tokens.access_token` 和 `tokens.account_id`；[官方 token 数据结构](https://github.com/openai/codex/blob/ffd3429d754991183433b4d41b67551e5656ba27/codex-rs/login/src/token_data.rs#L10-L38)也说明 id_token 的账户 claim。若认证存储在系统钥匙串或没有这些字段，不要导出整份凭据，改用浏览器中实际请求头。API key 登录不能作为本组件的 ChatGPT 会话授权。

不要复制整条请求、Copy as cURL、导出 HAR、截图令牌、把 auth.json 上传到聊天/GitHub/在线 JWT 解码网站；如确需查看 JWT claim，只用可信本地工具。不要从第三方收集“共享 token”。粘贴后清理剪贴板。`env_schema` 官方只声明普通文本控件，不能假定有密钥遮蔽或安全硬件存储；不要分享、同步或导出包含模块环境的配置，避免对 chatgpt.com 开启不必要的 MITM/抓包。

**不使用 refresh_token**，不把长效 refresh token 交给脚本或刷新服务，不自动上传/交换/续期授权。access token 也属于敏感凭据，只在固定 HTTPS usage 请求的 Authorization 头发给 ChatGPT；脚本不持久化、不记录日志、不上传响应。401 显示授权已过期或无效，用户本地重新登录后手动更新；不会自动刷新。本次开发没有读取用户环境秘密或认证文件。

## 显示语义、排版和限制

- 只读取顶层账户 Codex `rate_limit` 的实际窗口。只有 `limit_window_seconds === 18000` 才标为 5h，`=== 604800` 才标为周；不把 primary 机械等同 5h、不把 secondary 机械等同周。不足两项就少显示，未知/空/不合理百分比不伪造为 0%。
- 显示“已用”，不是次数/Token 数或可发送请求数；百分比仅采用实际 0–100 数值，超界字段不夹成假值。`reset_at` 按 Unix 秒转设备本地 `MM/DD HH:mm`，缺失就显示未返回，不用 `reset_after_seconds` 或当前时间猜重置点。
- `plan_type` 根据返回值显示，不硬编码 Plus。只有 2xx、JSON 和基本契约验证完成后才记本次“查询成功 MM/DD HH:mm:ss”；这是客户端查询完成时刻，不是服务端统计更新时间。无窗口的成功响应明确显示“未返回 5h / 周窗口”，不是额度无限。
- 网络、状态码、JSON/契约错误不显示成功时间和旧百分比；没有缓存历史“上次成功”。401/403/429 分别提示授权、访问或频率问题，429 不推断额度耗尽；无重试、无刷新流程、无第三方回退端点。不回显错误对象/响应体，避免意外带出凭据。
- 严格复用 [Route.js](https://raw.githubusercontent.com/BABYANYU/Egern/main/scripts/Route.js) 的深浅色、标题字重、字体/minScale、12/14 边距及 6/10、4、10/16 留白体系。核对本地 `/tmp/codex-route.js` 与当次线上文件 SHA256 均为 `8bed9167e53c6e81910862063cecf49d02c69b93b0b2cec159edc932095e8044`。窄屏窗口标签高度调为 14 以容纳两个额度块，非逐像素照搬 IP 信息列；标题 `Yanyu · Codex`。锁屏输出精简，不展示完整查询时间/重置明细。未完成真机像素级截图验收。
- iOS 刷新由系统调度，脚本不是实时轮询器。设备时间/时区会影响本地时间显示；未知未来字段被保守忽略。Egern 导入、本地脚本路径解析、系统字体裁切及真实后端访问仍需用户设备验收。

## 离线验证

运行 `TZ=Asia/Shanghai node test.mjs`。13 组测试全部通过，使用合成令牌与 mock `ctx.http`，**未请求真实 usage、未使用用户凭据**。覆盖：缺参零请求、头部格式、固定 URL/认证/策略/毫秒超时/禁止跳转、成功时间、重置本地时间、缺失窗口与模型池隔离、窗口交换/未知时长、百分比边界、缺失 reset、HTTP/网络/JSON 错误脱敏、各尺寸/配色/边距、模块 env_schema 与无日志/无模板替换。Node 测试是契约单测，不代表 Egern 真机或在线认证成功。
