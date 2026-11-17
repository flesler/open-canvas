import { describe } from 'vitest'
import { runTestCases } from '../test/utils.test.js'
import { canvasStem } from './canvasStem.js'

describe('canvasStem', () => {
  runTestCases(canvasStem, [
    { desc: '.canvas.tsx stem', input: '/foo/my-report.canvas.tsx', expected: 'my-report' },
    { desc: 'wrong extension', input: 'x.tsx', throws: 'canvas must end with .canvas.tsx' },
  ])
})