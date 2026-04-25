# GitHub 发布前配置与敏感信息检查

## 原则

- `.env.local` 放本机真实配置，不提交。
- `.env.example` 只放安全示例和空占位，提交到仓库。
- `VITE_*` 会被 Vite 注入浏览器包，不能放 API key、token、secret、真实儿童身份信息。
- 后端/本地桥接服务的密钥只通过非 `VITE_*` 环境变量读取，例如 `VOLCENGINE_TTS_API_KEY`、`FLOW_OBSERVER_CLIPROXY_API_KEY`。
- `output/` 是运行产物、截图、日志、缓存，不提交。

## 本机启动

1. 复制 `.env.example` 为 `.env.local`。
2. 在 `.env.local` 填写真实 TTS、Flow Observer、同步服务配置。
3. 前端只用固定端口启动：

```bash
npm run dev
```

## 发布前检查

```bash
git status --short --ignored .env .env.local .env.example output
git ls-files .env .env.local .env.development .env.production
rg -n --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!.git/**' --glob '!output/**' --glob '!.env*' "sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|gh[pousr]_[A-Za-z0-9_]{30,}" .
npm run lint
npm test
npm run build
```

预期结果：

- `.env.local` 和 `output/` 显示为 ignored。
- `git ls-files` 不输出任何真实 `.env` 文件。
- 密钥扫描没有真实 key。
- lint、test、build 全部通过。

## 如果误提交过密钥

不要只从当前文件删除。应立即轮换对应平台密钥，并清理 Git 历史后再公开仓库。

## 非密钥但仍要注意

- `output/` 里有截图、日志、参考图，公开仓库不应跟踪。
- `public/stickers/m78/` 使用了现成角色素材。如果仓库要公开或后续商业化，需要确认授权，或替换成自有/可商用素材。
- 如果敏感文件已经存在于 Git 历史里，只在最新提交删除还不够；公开前应重写历史，或用干净的新仓库重新初始化。
