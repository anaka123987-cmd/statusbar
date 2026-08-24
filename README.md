# statusbar · 多维矩阵状态栏

SillyTavern 正则脚本「状态栏·多维矩阵-商城拓展」的静态资源仓库。
regex JSON 只保留 HTML 骨架（约 12KB），CSS / JS 从本仓库经 jsDelivr CDN 加载。

## 结构

```
dist/
├── statusbar.css   # 全部样式（含浅色马卡龙覆写区）
├── statusbar.js    # 主模块：开场/创建界面 + 主状态栏 + 商城 + 战斗面板
└── teammates.js    # 队友管理器模块（tm-*）
regex-状态栏·多维矩阵-商城拓展.json   # 可直接导入酒馆的正则（壳，引用下方 dist 的固定 commit）
```

## 更新流程

1. 修改 `dist/` 下对应文件
2. 提交并推送：
   ```
   git add dist
   git commit -m "描述"
   git push
   ```
3. 取新 commit hash（`git rev-parse HEAD`），把正则 JSON 里的
   `@<旧hash>` 全部替换为 `@<新hash>`（共 3 处：css 1 处 + js 2 处），重新导入酒馆

按 commit hash 锁版本可绕过 jsDelivr 12 小时缓存；如使用 `@main` 分支引用则需到
https://www.jsdelivr.com/tools/purge 手动清缓存。

## 历史版本

- v1 (本仓库初版)：由 603KB 内嵌版去重拆分而来
  - 删除被覆盖的死代码：renderShop/renderBag/renderExchange/mxUndoPurchase 各自的旧版本（约 220 行）
  - 提取公共组件：`mxClone()`（12 处内联深拷贝）、`mxViaInput()`（3 处 viaInput 闭包）
  - 行为与原版一致，仅去除冗余

## 备注

- 依赖：Font Awesome 6.5.1（CDN）、酒馆助手脚本环境、MVU 变量框架、战斗引擎仓库
  （anaka123987-cmd/combat-engine，独立加载，与本仓库无关）
- 若 iframe 中 `<script src>` 加载失败（极少数 CSP 限制场景），可改用壳内联
  fetch + eval 兜底方案
