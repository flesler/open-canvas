import { describe } from 'vitest'
import { matchTestCases } from './test/utils.test.js'
import { resolveRenderOptions } from './render-options.js'

describe('resolveRenderOptions', () => {
  matchTestCases(resolveRenderOptions, [
    {
      desc: 'default viewport',
      input: { theme: 'light' },
      expected: {
        page: {
          viewport: { width: 1280, height: 1 },
          deviceScaleFactor: 1,
          colorScheme: 'light',
        },
        screenshot: {},
      },
    },
    {
      desc: 'CLI width and min-height',
      input: { viewportWidth: 1920, minHeight: 1200, theme: 'dark' },
      expected: {
        page: {
          viewport: { width: 1920, height: 1 },
          minHeight: 1200,
          colorScheme: 'dark',
        },
      },
    },
    {
      desc: 'inline JSON overrides',
      input: {
        theme: 'light',
        renderOptions: '{"screenshot":{"fullPage":false},"pdf":{"format":"A4"}}',
      },
      expected: {
        screenshot: { fullPage: false },
        pdf: { format: 'A4' },
      },
    },
  ])
})
