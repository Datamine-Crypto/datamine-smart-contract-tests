// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
	// Global ignores
	{
		ignores: [
			'**/build/',
			'.yarn/',
			'.pnp.loader.mjs',
			'.pnp.cjs',
			'**/artifacts/',
			'node_modules/',
			'coverage/',
			'build/',
			'artifacts/',
			'cache/',
			'typechain-types/',
		],
	},

	// Base ESLint recommended rules
	eslint.configs.recommended,

	// TypeScript rules
	...tseslint.configs.recommended,

	// Custom rules
	{
		files: ['**/*.{js,jsx,ts,tsx}'],
		plugins: {
			'unused-imports': unusedImports,
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': 'off',

			'unused-imports/no-unused-imports': 'error',
		},
	},

	// Prettier config (must be last)
	prettierConfig
);
