import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const RAW_HEX = /#[0-9a-fA-F]{3,8}/;

const localDesignSoulPlugin = {
  rules: {
    'no-raw-color': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow raw hex colors outside src/theme/tokens.ts',
        },
        messages: {
          rawColor: 'Raw hex colors must live in src/theme/tokens.ts and be consumed through tokens.',
        },
        schema: [],
      },
      create(context) {
        const filename = context.filename.replaceAll('\\', '/');
        if (filename.endsWith('/src/theme/tokens.ts')) {
          return {};
        }

        function reportIfRawColor(node, value) {
          if (typeof value === 'string' && RAW_HEX.test(value)) {
            context.report({ node, messageId: 'rawColor' });
          }
        }

        return {
          Literal(node) {
            reportIfRawColor(node, node.value);
          },
          TemplateElement(node) {
            reportIfRawColor(node, node.value.raw);
          },
        };
      },
    },
  },
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'storybook-static/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tools/**/*.mjs', 'vite.config.ts', 'vitest.config.ts'],
    plugins: {
      'design-soul': localDesignSoulPlugin,
    },
    rules: {
      'design-soul/no-raw-color': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
