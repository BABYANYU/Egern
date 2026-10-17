# Yanyu · Latency

Egern 原生通用小组件，采用简约双栏：节点名称、HTTPS 综合延迟、抖动。浅色与深色背景自动适配，不添加装饰边框或图表。

模块：https://raw.githubusercontent.com/BABYANYU/Egern/main/modules/Latency.yaml

## 参数与显示

模块参数 `NODES` 填写本机已存在的节点或策略名称，多个名称使用 `§` 分隔。留空只检测 `Proxy`。名称保存在手机本地，不需要提交到公开仓库。不会自动枚举策略组，也不会改变已选节点。

中号显示延迟最低的两个节点，大号最多六个，超大号最多八个；小号只显示第一个节点。超出显示数量会提示。锁屏显示最快可用策略的摘要。长名称可换行或缩小；最终排版需以 Egern 真机为准。

## HTTPS 综合延迟的含义

向 `https://cp.cloudflare.com/generate_204` 发起五轮 HTTPS HEAD 请求，每次明确指定对应 `policy`。只接收 HTTP 204 为成功样本，不跟随重定向。

综合延迟是请求墙钟耗时的中位数；抖动为耗时的中位绝对偏差（MAD），至少三次成功才显示。部分成功显示有效样本数量。它不是 ICMP Ping，也不等同于 Egern 内核测速；DNS、TLS、连接复用和脚本调度都会影响结果。保留最多三个并发、单次四秒和总采样五十秒预算，超时列表可能不足五轮。

脚本无法从响应中反查实际命中的最终节点；不存在的策略名如何回退需由 Egern 运行时决定，请先保证名称正确，必要时查看连接日志。

## 版本按需手动更新

用户使用 Egern 2.20.0（783）。官方 2.20.0 更新说明修复了 `999999999999999` 等超大更新间隔被忽略的问题。模块内已把关联脚本的 `update_interval` 设为该值。

这不是专门的“禁止更新”开关，而是约三千一百万年的更新间隔，实际使用相当于不自动更新。当前公开模块和脚本文档未明确保证 `0` 或负数可禁用这两类资源的自动更新，因此不依赖该假设。

**手机端还需设置一次模块本身的更新间隔**：工具 → 模块 → Latency → 更新间隔，填写 `999999999999999` 并保存，再手动更新模块。模块文件内的脚本更新间隔不能替代手机主配置中模块引用的更新间隔。

主配置中等价的引用方式（合并到现有 `modules` 列表，不重复创建顶层键；保留自己的 NODES 参数）：

```yaml
modules:
  - url: "https://raw.githubusercontent.com/BABYANYU/Egern/main/modules/Latency.yaml"
    update_interval: 999999999999999
    enabled: true
    compat_arguments:
      NODES: ""
```

需要仓库新版时手动更新模块。Egern 官方 2.19.0 更新说明指出，更新模块也会刷新其引用的子资源。GitHub Raw 的缓存和网络状况可能影响新版到达时间，不能承诺发布后立即拉取到。

## 版本更新与延迟数据刷新分开

本次仅限制模块和脚本源码的版本下载。脚本每次被 Egern 调用时仍重新检测延迟；没有安装 cron，没有常驻循环，也没有设置主动刷新建议。桌面组件由 iOS / Egern 调度时仍可能执行，手动刷新组件也会重新检测。这不等于禁止数据自动刷新。

## 验证范围

此版未运行自动测试或 Egern 真机测试。源码按官方 generic / Widget DSL 编写；真实路由、布局、系统调度和手动更新流程以手机行为为准。

参考：

- https://egernapp.com/zh-CN/docs/configuration/widgets/
- https://egernapp.com/zh-CN/docs/configuration/modules/
- https://egernapp.com/zh-CN/docs/configuration/scriptings/
- https://t.me/s/egern_news （2.19.0：更新模块时刷新引用的子资源；2.20.0：超大更新间隔修复）
