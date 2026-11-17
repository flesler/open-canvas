import { describe } from 'vitest'
import { matchTestCases, runTestCases } from './test/utils.test.js'
import { parseMinHeight, resolveRenderOptions } from './render-options.js'

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
      input: { width: 1920, minHeight: 1200, theme: 'dark' },
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

describe('parseMinHeight', () => {
  runTestCases(parseMinHeight, [
    { desc: 'pixels from CLI string', input: ['1200', 1280], expected: 1200 },
    { desc: 'pixels from JSON number', input: [1200, 1280], expected: 1200 },
    { desc: 'fractional width ratio', input: ['1.5', 1280], expected: 1920 },
    { desc: 'whole width ratio', input: ['2', 1280], expected: 2560 },
    { desc: 'ratio boundary', input: ['10', 100], expected: 1000 },
    { desc: 'a4 alias', input: ['A4', 1280], expected: 1810 },
    { desc: 'max keyword', input: ['max', 1280], expected: 'max' },
    { desc: 'non-numeric value', input: ['tall', 1280], throws: '--min-height must be' },
    { desc: 'zero', input: ['0', 1280], throws: '--min-height must be' },
  ])
})
