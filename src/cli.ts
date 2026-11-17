import { createCli } from 'trpc-cli'
import { cliName, description, version } from './pkg.js'
import { cliRouter, rewriteArgv } from './commands/cliRouter.js'

const cli = createCli({
  router: cliRouter,
  name: cliName,
  version,
  description,
})

function cliFail(e: unknown): never {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}

async function run(): Promise<void> {
  const rawArgv = process.argv.slice(2)
  const argv = rewriteArgv(rawArgv)
  try {
    await cli.run({
      argv,
      prompts: false,
      logger: console,
      formatError: (err: unknown) => (err instanceof Error ? err.message : String(err)),
    })
  } catch (e) {
    cliFail(e)
  }
}

run().catch(cliFail)