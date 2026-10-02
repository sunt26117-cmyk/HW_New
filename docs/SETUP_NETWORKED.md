# 网络环境安装与完整验收

在能访问 npm registry 的 Node 20+ 环境：

```bash
npm install
npm run lint
npm test
npm run build
```

成功后：

- `dist-offline/index.html` 是单文件离线产品。
- `npm test` 同时跑 Vitest 与 AutoHW Core 治理断言。
- `npm run lint` 执行完整 TypeScript 检查 + ESLint。

真实台架数据进入 `src/fixtures/gold/` 前，不得把 synthetic fixture 当作工程黄金用例。
