import { z } from 'zod'
import { CommandParser } from 'zod-opts'
import { formatCanvasSdkContractLine } from '../canvas-sdk-contract.js'
import { cliName, description, version } from '../pkg.js'
import defineCommand from '../util/defineCommand.js'
import { DEFAULT_FORMATS } from '../exportEnums.js'
import { sharedCliExportOptionsSchema, sharedExportOptionMeta } from './exportSchemas.js'
import { runGenerate } from './generate.js'
import { DEFAULT_OUTLINE_MAX_LINES, DEFAULT_OUTLINE_THRESHOLD, runOutline } from './outline.js'
import { runSkill } from './skill.js'
import { runVendorPath } from './vendor-path.js'
import { runVerify } from './verify.js'

const generateCliOptionsSchema = sharedCliExportOptionsSchema.extend({
  name: z.string().optional().describe('output basename without extension'),
  formats: z.string().default(DEFAULT_FORMATS).describe('comma-separated: html,png,pdf,jpg,cursor'),
  selectors: z
    .array(z.string())
    .default([])
    .describe('export matched nodes only (repeatable; comma-separated ok)'),
  inlineState: z
    .boolean()
    .default(false)
    .describe('with --formats cursor: inline .canvas.data.json and seed localStorage'),
  quiet: z.boolean().default(false).describe('no stdout on success'),
})

const outlineCliOptionsSchema = sharedCliExportOptionsSchema.extend({
  selectors: z.array(z.string()).default([]).describe('limit export DOM (repeatable)'),
  threshold: z.coerce
    .number()
    .optional()
    .describe(`warn with ! when slack or ib >= px (default ${DEFAULT_OUTLINE_THRESHOLD})`),
  maxChildren: z.coerce
    .number()
    .optional()
    .describe(`max tree lines (default ${DEFAULT_OUTLINE_MAX_LINES})`),
  warn: z.boolean().default(true).describe('warn on layout slack (use --no-warn for metrics only)'),
})

const generateOptionMeta = {
  ...sharedExportOptionMeta,
  name: { alias: 'n', argumentName: 'slug' },
  formats: { alias: 'f', argumentName: 'list' },
  selectors: {},
  inlineState: {},
  quiet: { alias: 'q' },
} satisfies Partial<Record<keyof z.infer<typeof generateCliOptionsSchema>, { alias?: string; argumentName?: string }>>

const outlineOptionMeta = {
  ...sharedExportOptionMeta,
  selectors: {},
  threshold: { alias: 'T', argumentName: 'px' },
  maxChildren: { alias: 'm', argumentName: 'n' },
  warn: {},
}

export const vendorPathCommand = defineCommand({
  name: 'vendor-path',
  description: 'Print absolute path to shim src/vendor (canvas/SKILL.md, canvas-sdk/)',
  handler: () => {
    console.log(runVendorPath())
    console.error(formatCanvasSdkContractLine())
  },
})

export const skillCommand = defineCommand({
  name: 'skill',
  description: 'Print or install agent SKILL.md',
  args: z.object({
    dir: z.string().optional().describe('install directory (SKILL.md + references/)'),
  }),
  handler: ({ dir }) => {
    const result = runSkill(dir)
    if (typeof result === 'string') {
      console.error(
        'Install with `open-canvas skill <dir>`. Vendor docs: `open-canvas vendor-path`.\n',
      )
      process.stdout.write(result)
      return
    }
    console.error(result.status)
    console.error(formatCanvasSdkContractLine())
  },
})

export const verifyCommand = defineCommand({
  name: 'verify',
  description: 'Typecheck a .canvas.tsx (cursor/canvas + data imports)',
  args: z.object({
    canvas: z.string().describe('path to *.canvas.tsx'),
  }),
  handler: ({ canvas }) => {
    console.error(runVerify(canvas))
  },
})

export const outlineCommand = defineCommand({
  name: 'outline',
  description: 'Print export layout map for the canvas (stdout; same print prep as generate)',
  options: outlineCliOptionsSchema,
  optionMeta: outlineOptionMeta,
  args: z.object({
    canvas: z.string().describe('path to *.canvas.tsx'),
  }),
  handler: async ({ canvas, ...options }) => {
    const text = await runOutline({ canvas, ...options })
    process.stdout.write(text)
    process.stdout.write('\n')
  },
})

export const generateCommand = defineCommand({
  name: 'generate',
  description: 'Build artifacts from a canvas file',
  options: generateCliOptionsSchema,
  optionMeta: generateOptionMeta,
  args: z.object({
    canvas: z.string().describe('path to *.canvas.tsx'),
  }),
  handler: async ({ canvas, quiet, ...options }) => {
    const paths = await runGenerate({ canvas, quiet, ...options })
    if (!quiet) {
      for (const p of paths) {
        console.log(`→ ${p}`)
      }
    }
  },
})

export const commandByName = {
  'vendor-path': vendorPathCommand,
  skill: skillCommand,
  verify: verifyCommand,
  outline: outlineCommand,
  generate: generateCommand,
} as const

export type CommandName = keyof typeof commandByName

export const commandNames = Object.keys(commandByName) as CommandName[]

const canvasPathPattern = /\.canvas\.tsx$/i

export function looksLikeCanvasPath(token: string): boolean {
  return canvasPathPattern.test(token) || token.endsWith('.tsx')
}

export function isCommandName(token: string): token is CommandName {
  return token in commandByName
}

export const rootProgram = new CommandParser()
  .name(cliName)
  .version(version)
  .description(description)

for (const name of commandNames) {
  rootProgram.subcommand(commandByName[name].zodSubcommand)
}