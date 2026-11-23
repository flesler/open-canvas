import { createCli, t } from 'trpc-cli'
import { formatCanvasSdkContractLine } from './canvas/sdkContract.js'
import generateCommand from './commands/generate.js'
import outlineCommand from './commands/outline.js'
import skillCommand from './commands/skill.js'
import vendorPathCommand from './commands/vendor-path.js'
import verifyCommand from './commands/verify.js'
import pkg from './pkg.js'

const cliRouter = t.router({
  'vendor-path': t.procedure
    .meta(vendorPathCommand.meta)
    .input(vendorPathCommand.input)
    .handler(({ input }) => {
      console.log(vendorPathCommand.run(input))
      console.error(formatCanvasSdkContractLine())
    }),
  skill: t.procedure
    .meta(skillCommand.meta)
    .input(skillCommand.input)
    .handler(async ({ input }) => {
      const result = await skillCommand.run(input)
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
    .meta(verifyCommand.meta)
    .input(verifyCommand.input)
    .handler(({ input }) => {
      console.error(verifyCommand.run(input))
    }),
  outline: t.procedure
    .meta(outlineCommand.meta)
    .input(outlineCommand.input)
    .handler(async ({ input }) => {
      const text = await outlineCommand.run(input)
      process.stdout.write(text)
      process.stdout.write('\n')
    }),
  generate: t.procedure
    .meta(generateCommand.meta)
    .input(generateCommand.input)
    .handler(async ({ input }) => {
      const paths = await generateCommand.run(input)
      if (input.verify) {
        console.error(formatCanvasSdkContractLine())
      }
      if (!input.quiet) {
        for (const p of paths) {
          console.log(`→ ${p}`)
        }
      }
    }),
})

const cli = createCli({
  router: cliRouter,
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
})

function cliFail(e: unknown): never {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}

async function run(): Promise<void> {
  try {
    await cli.run({
      argv: process.argv.slice(2),
      prompts: false,
      logger: console,
      formatError: (err: unknown) => (err instanceof Error ? err.message : String(err)),
    })
  } catch (e) {
    cliFail(e)
  }
}

run().catch(cliFail)