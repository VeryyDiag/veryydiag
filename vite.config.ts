/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

import { exec } from 'child_process';

function tsToZodPlugin({input, output}: {input: string, output: string}) {
  const inputAbs = path.resolve(__dirname, input)
  const outputAbs = path.resolve(__dirname, output)
  const runTsToZod = async () => {
    console.log('\n[ts-to-zod] Generating schemas...');
    return new Promise((resolve, error) => {
      exec(`ts-to-zod "${input}" "${output}"`, (err, stdout, stderr) => {
        if (err) {
          console.error(`[ts-to-zod] Error: ${stderr}`);
          error(err);
        }
        console.log(`[ts-to-zod] Schemas generated successfully.`);
        return resolve(stdout)
      });
    })
  };

  return {
    name: 'vite-plugin-ts-to-zod',

    // Runs once when the dev server starts or before production build
    async buildStart() {
      await runTsToZod();
    },

    // Watches for changes in dev mode
    async handleHotUpdate({ file }: {file: string}) {
      if (file === inputAbs) {
        await runTsToZod();
        return []
      }
    }
  };
}

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [
    tsToZodPlugin({
      input: "src/lib/types/types.ts",
      output: "src/lib/types/typesSchema.ts",
    }),
    tailwindcss(),
    sveltekit()
  ],
  test: {
    expect: {
      requireAssertions: true
    },
    projects: [{
      extends: './vite.config.ts',
      test: {
        name: 'client',
        browser: {
          enabled: true,
          provider: playwright(),
          instances: [{
            browser: 'chromium',
            headless: true
          }]
        },
        include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
        exclude: ['src/lib/server/**']
      }
    }, {
      extends: './vite.config.ts',
      test: {
        name: 'server',
        environment: 'node',
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        },
        setupFiles: ['.storybook/vitest.setup.ts']
      }
    }]
  }
});
