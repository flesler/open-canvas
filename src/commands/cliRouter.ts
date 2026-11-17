import { t } from 'trpc-cli'
import { formatCanvasSdkContractLine } from '../canvas-sdk-contract.js'
import { generateFieldsSchema, runGenerate } from './generate.js'
import { outlineFieldsSchema, runOutline } from './outline.js'
import { runSkill } from './skill.js'
import { runVendorPath } from './vendor-path.js'
import { runVerify } from './verify.js'
import { z } from 'zod'
import { DEFAULT_FORMATS } from '../exportEnums.js'

export const cliRouter = t.router({
  'vendor-path': t.procedure
    .meta({ description: 'Print absolute path to shim src/vendor (canvas/SKILL.md, canvas-sdk/)' })
    .handler(() => {
      console.log(runVendorPath())
      console.error(formatCanvasSdkContractLine())
    }),
  skill: t.procedure
    .meta({ description: 'Print or install agent SKILL.md' })
    .input(z.object({
      dir: z
        .string()
        .optional()
        .describe('install directory (SKILL.md + references/)')
        .meta({ positional: true }),
    }))
    .handler(({ input }) => {
      const result = runSkill(input.dir)
      if (typeof result === 'string') {
        console.error(
          'Install with `open-canvas skill <dir>`. Vendor docs: `open-canvas vendor-path`.\n',
        )
        process.stdout.write(result)
        return
      }
      console.error(result.status)
      console.error(formatCanvasSdkContractLine())
    }),
  verify: t.procedure
    .meta({ description: 'Typecheck a .canvas.tsx (cursor/canvas + data imports)' })
    .input(z.object({
      canvas: z.string().describe('path to *.canvas.tsx').meta({ positional: true }),
    }))
    .handler(({ input }) => {
      console.error(runVerify(input.canvas))
    }),
  outline: t.procedure
    .meta({
      description: 'Print export layout map for the canvas (stdout; same print prep as generate)',
    })
    .input(outlineFieldsSchema)
    .handler(async ({ input }) => {
      const text = await runOutline(input)
      process.stdout.write(text)
      process.stdout.write('\n')
    }),
  generate: t.procedure
    .meta({
      default: true,
      description: 'Build artifacts from a canvas file',
      usage: [
        '[options] <canvas>',
        ` --formats <list>   comma-separated (default ${DEFAULT_FORMATS})`,
      ],
    })
    .input(generateFieldsSchema)
    .handler(async ({ input }) => {
      const paths = await runGenerate(input)
      if (!input.quiet) {
        for (const p of paths) {
          console.log(`→ ${p}`)
        }
      }
    }),
})

export const COMMAND_NAMES = new Set(['vendor-path', 'skill', 'verify', 'outline', 'generate'])

const canvasPathPattern = /\.canvas\.tsx$/i

export function looksLikeCanvasPath(token: string): boolean {
  return canvasPathPattern.test(token) || token.endsWith('.tsx')
}

export function rewriteArgv(argv: string[]): string[] {
  if (argv.length === 0) {
    return argv
  }
  const first = argv[0]
  if (COMMAND_NAMES.has(first)) {
    return argv
  }
  if (looksLikeCanvasPath(first)) {
    return ['generate', ...argv]
  }
  return argv
}
