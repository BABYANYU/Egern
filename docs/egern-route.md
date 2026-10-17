# Route：Egern 代理入口 / 落地小组件

## 排版与版本更新（2026-10-17）

本版与 Latency 采用相同的浅深色背景、文字颜色、标题字号、字重、边距和双栏间距：中号外边距14、标题与正文间距10、左右列间距16、字段间距4；小号外边距12。去掉星形装饰和空白文本占位，入口与落地左对齐。IP比延迟数字长，因此IP采用13号字并允许换行，避免为了放大字号而截断地址。

本次仅修改显示部分；落地自动查询、入口手填参数、查询地址、超时、错误判定、备用接口、IP校验和运营商/位置处理均保留。入口与落地IP相同时仍只显示落地。

模块已固定引用脚本的发布提交，关联脚本更新间隔为 `999999999999999`。这不是专用的“关闭”开关，而是超长间隔，实际按需手动更新。每次发布新的Route脚本，维护者需同步更新模块中的固定提交地址。

**手机端必须再设置一次模块引用的更新间隔**：工具 → 模块 → Route → 更新间隔，填写 `999999999999999`，保存后手动更新模块，再刷新Route组件。模块文件无法自行改写手机中的模块引用间隔。保留原来的POLICY和ENTRANCE_IP参数，不重复添加同名脚本或组件。

这里只限制模块/脚本版本的下载，组件每次实际执行仍查询当前数据；没有新增定时任务、循环或刷新建议。本次未运行自动测试或手机实测。

## 功能与定义

本组件针对 Surge Route 的实际实现移植，不是 Network-Pro 的流媒体或 AI 解锁检测工具。

- **落地 · 自动查询**：通过指定的 Egern 策略请求 `https://ipwho.is/`，显示该服务实际看到的公网出口 IP、运营商、位置；保留 IPv4 / IPv6，不强制 IPv4。
- **入口 · 手填参数**：用户在自己的 widget / 模块 env 中填写代理服务器公网 IP，组件查询此 IP 的运营商、位置。它是配置值，**不是实时检测的当前节点入口**，也不验证节点是否正在使用或可达。切换节点时须自行更新。
- 没填入口显示“未设置（参数入口）”；无效、私网或保留地址显示参数错误。不使用设备接口地址、网关或 DIRECT 公网出口冒充代理入口。
- 入口与本次落地 IP 相同时，按原 Route 行为只显示落地。标准十六进制 IPv6 会规范化后比较。
- 入口查询优先 `ipwho.is/<IP>`，失败回退 `api.ip.sb/geoip/<IP>`；回退也失败时保留手填 IP、标记“归属查询失败”，运营商和位置为未知。
- 落地查询不偷换成 DIRECT，也不自动改用其他策略；HTTP 错误、超时、坏 JSON、接口业务失败、非公网 IP 都显示错误。不会拿缓存冒充本次成功。
- 保留目标脚本的主要运营商别名、入口组织优先规则、国家地区中文名、省市去重和直辖市简写；长文本改用 Egern 的缩放 / 换行，不机械照抄 Surge 的固定宽度截断。

推荐桌面**中号或大号**组件查看完整 IP、ISP、位置；小号采用紧凑纵排，长 IPv6 / 长错误可能受系统空间限制。锁屏只显示策略和落地摘要，不宣称显示全部字段；请用桌面组件查看入口与归属。

## 在线链接

在线发布地址：

- JS：`https://raw.githubusercontent.com/BABYANYU/Egern/main/scripts/Route.js`
- 模块：`https://raw.githubusercontent.com/BABYANYU/Egern/main/modules/Route.yaml`
- 文档建议：`https://github.com/BABYANYU/Egern/blob/main/docs/egern-route.md`

### 方法 A：在线模块（推荐）

Egern → 工具 → 模块 → `+`，填模块 URL 并启用。在模块编辑页的 Env 中设置 `POLICY` 和可选的 `ENTRANCE_IP`。然后到分析页左上角的小组件图库，选择模块提供的 `Route`。桌面长按添加 Egern 小组件，再编辑选择 `Route`。

等价的主配置引用例子（**仅参考，不自动修改你的配置**）：

```yaml
modules:
  - url: "https://raw.githubusercontent.com/BABYANYU/Egern/main/modules/Route.yaml"
    enabled: true
    env:
      POLICY: "Proxy"
      ENTRANCE_IP: ""
```

### 方法 B：在线脚本 + widget

以下字段与官方 widgets 文档一致。合并进现有同名列表，不要直接覆盖整个配置，不要重复定义顶层键。

```yaml
scriptings:
  - generic:
      name: "egern-route"
      script_url: "https://raw.githubusercontent.com/BABYANYU/Egern/main/scripts/Route.js"
      timeout: 15

widgets:
  - name: "Route"
    script_name: "egern-route"
    env:
      POLICY: "Proxy"
      ENTRANCE_IP: ""
```

也可在 Egern 工具 → 脚本中新建 **generic** 脚本，使用上述在线 JS 地址，再在小组件图库新增 widget 并关联脚本。不要把它建成 request / response / cron 脚本。

## 需要设置的参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `POLICY` | `Proxy` | 已存在的 Egern 策略 / 策略组名，大小写和名称必须与你的配置一致。请指向你想测量的代理，不要填节点订阅 URL、密码或代理连接 URI。 |
| `ENTRANCE_IP` | 空 | 可选；只填代理入口的公网 IPv4 或标准十六进制 IPv6 字面量，无端口、方括号、域名、IPv6 zone。保持为空也能自动检测落地。 |

参数仅存于你自己的 Egern env，不要在公开 JS、README 或模块中写自己的节点信息。脚本不会读取挂载配置或节点凭据，不访问最近请求或本机控制器。

IPv6 校验保守地接受常见 `2000::/3` 全局单播，拒绝 ULA / 链路本地 / 回环 / 文档段和部分转换前缀；不支持带点分十进制尾部的 IPv6 写法。公网检查不是完整 IANA 路由注册表，也不代表地址真实存在或节点可达。

## 为什么不是与 Surge 完全相同

Surge 原脚本先请求 `ipwho.is`，再从 `$httpAPI("GET", "/v1/requests/recent", ...)` 查找请求的 `remoteAddress` 和 `policyName`。原 **入口是代理连接的远端地址**，不是本机公网 IP。原实现还存在只匹配最近前 20 条 `ipwho.is` 请求的局限。

核对 Egern 官方 JavaScript API 和 Widgets 文档：

1. `ctx.http.get(url, options)` 的 `policy: string` 是明确支持的代理策略选项；`timeout` 单位毫秒；`redirect` 为 `follow | manual | error`。本脚本每次 HTTP 请求都显式传相同 `policy`、4000ms 超时、`redirect: 'error'`、`credentials: 'omit'`，避免悄悄改走默认分流或接受重定向。`policyDescriptor: string` 虽也有文档，但官方该页未解释其编码结构，本实现不猜测、不使用。
2. HTTP Response 公布字段是 `status`、`headers`、`body` 及 `json()` / `text()` 等方法；**没有公开 `remoteAddress`、实际选中节点、实际命中策略字段**。所以标题显示的是用户配置的策略名，不是 API 返回的最终节点名。
3. `ctx.device` 提供蜂窝运营商 / 无线技术、Wi-Fi SSID / BSSID、设备 IPv4 / IPv6 地址及接口、网关、DNS 服务器。它不是公网入口或代理服务器信息，本组件不使用这些字段。
4. 官方公开 API 未列出 Surge recent requests 的等价接口，也未列出读取运行配置、当前组选中节点服务器地址的接口。`ctx.lookupIP(ip)` 只查已有 IP 的国家代码、ASN、组织，不能发现入口，也不提供省市。本实现不臆造隐藏 API。
5. generic 脚本通过 `export default async function(ctx)` **return** `{ type: 'widget', children: [...] }`；不是 `$done`。本实现只使用官方 DSL 的 widget / stack / text / image、字体、颜色、padding、gap、flex、minScale 等字段。

因此最接近且诚实可行的方案是：**自动落地 + 可选参数入口**。无法自动确认手填入口是否对应当前策略，无法展示实际命中节点名；策略组在并发请求间切换也可能导致查询走不同节点。Egern 对不存在策略的运行时行为需在真实应用内确认；脚本不会自行回退策略，但仅靠文档无法从 HTTP 响应反查实际路由。

原 Surge 面板 `update-interval=-1` 的点击查询语义不能直接等同于 iOS WidgetKit 刷新。本组件每次运行重新查询，但没有伪造“点击必定刷新”的 URL，也没有声称能绕过 iOS 刷新预算。请使用 Egern 内组件预览 / 刷新功能重试，桌面自动刷新时机由 Egern 与 iOS 调度。

## 隐私、服务与失败处理

- 无解锁检测、IP 风险打分、测速、通知、设备信息采集或配置写入。
- 落地探测会把代理出口暴露给 `ipwho.is`；填写入口后，入口 IP 会通过查询 URL 发给 `ipwho.is`，必要时发给 `api.ip.sb`。这些是外部地理数据库，不保证运营商、位置精确或永久可用。
- 所有请求经 `POLICY`，不是 DIRECT。若服务被拦、限流、策略不可用或超时，明确显示失败。落地暂无备用探测接口，保持原 Route 的服务语义，避免多探测产生不同出口。
- 不输出底层异常文本（可能包含代理 URI / 凭据），仅显示受控错误原因。入口结果校验返回 IP 与参数相同，防止服务忽略路径后用出口信息冒充入口。
- 查询时间是本次组件脚本运行时间，不是设备网络持续监测时间；没有定时后台常驻任务。

## 测试

本地目录中执行：

```sh
node test.mjs
```

Node.js v22.23.2 下 **10 组测试全部通过**，包含默认 / 自定义策略、缺省入口、入口相同隐藏、IPv6 规范化、私网 / 非法参数、HTTP / JSON / 业务错误、入口备用接口、入口结果 IP 校验、入口落地独立失败、七种 widget family 的可序列化 DSL。测试会验证全部 HTTP 请求显式指定策略，不会真的发送网络请求或读取用户配置。

这是 mock 单元测试，不是 Egern 真机路由、WidgetKit 排版或在线脚本发布验收。尚需维护者发布后在 Egern 中验证真实策略名、在线拉取、两类入口场景及刷新行为。

官方依据：

- https://egernapp.com/docs/javascript-api/
- https://egernapp.com/docs/configuration/widgets/
