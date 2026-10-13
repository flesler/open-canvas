import { defineConfig } from 'eslint/config'
import eslintJs from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import stylisticPlugin from '@stylistic/eslint-plugin'
import importNewlinesPlugin from 'eslint-plugin-import-newlines'
import unusedImportsPlugin from 'eslint-plugin-unused-imports'

export default defineConfig([
	{
		ignores: ['node_modules', 'dist', '**/*.tsbuildinfo'],
	},
	eslintJs.configs.recommended,
	{
		files: ['{src,bin}/**/*.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: './bin/tsconfig.json',
			},
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				console: 'readonly',
				process: 'readonly',
				require: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			'stylistic': stylisticPlugin,
			'import-newlines': importNewlinesPlugin,
			'unused-imports': unusedImportsPlugin,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			'stylistic/semi': ['error', 'never'],
			'stylistic/indent': ['error', 'tab'],
			'stylistic/quotes': ['error', 'single', { avoidEscape: true }],
			'stylistic/comma-dangle': ['error', 'always-multiline'],
			'stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1, maxBOF: 0 }],
			'stylistic/brace-style': 'off',
			'stylistic/space-before-function-paren': ['error', { anonymous: 'always', named: 'never' }],
			'stylistic/member-delimiter-style': ['error', {
				multiline: { delimiter: 'semi', requireLast: false },
				singleline: { delimiter: 'semi', requireLast: false },
			}],
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-unused-vars': ['error', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				ignoreRestSiblings: true,
			}],
			'unused-imports/no-unused-imports': 'warn',
			'import-newlines/enforce': ['error', { items: Infinity, semi: false }],
			'object-curly-newline': ['error', { consistent: true }],
			'arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],
			'no-undef': 'off',
			'no-redeclare': 'off',
			'no-unused-vars': 'off',
			'no-empty': 'off',
			'no-console': 'off',
		},
	},
])
