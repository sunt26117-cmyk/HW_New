import tseslint from 'typescript-eslint';

export default tseslint.config({
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
});
