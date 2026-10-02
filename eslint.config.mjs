import tseslint from 'typescript-eslint';

export default tseslint.config(
  // ESLint 9 要求每个被 lint 的文件都至少匹配一个配置块，否则会以
  // "all of the files matching the glob pattern ... are ignored" 直接失败。
  // lint 脚本扫的是 src/**/*.{ts,tsx}（含 src/main.tsx、src/ui/**、src/app/** 等 9 个 .tsx），
  // 所以必须有一条覆盖全部 src 的基础块，并显式挂上 TS parser——
  // 否则会退回 espree 解析 TS/TSX 而报语法错误。
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
  },
  // 分层边界规则：只约束 core，不允许它依赖 ui/app/React。
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'react', message: 'core must not import React' },
          { name: 'react-dom', message: 'core must not import React DOM' },
        ],
        patterns: [
          { group: ['../ui/**', '../../ui/**', '../../../ui/**', '../app/**', '../../app/**', '../../../app/**'], message: 'core must not depend on ui/app' },
        ],
      }],
    },
  },
);
