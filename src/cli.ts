import { version } from './pkg.js'
import { commandByName, isCommandName, looksLikeCanvasPath, rootProgram } from './commands/registry.js'

function cliFail(e: unknown): never {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}

async function run(): Promise<void> {
  let argv = process.argv.slice(2)
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    rootProgram.showHelp()
    return
  }
  if (argv[0] === '--version' || argv[0] === '-v') {
    console.log(version)
    return
  }

  let commandName = argv[0]
  let rest = argv.slice(1)
  if (!isCommandName(commandName) && looksLikeCanvasPath(commandName)) {
    rest = [commandName, ...rest]
    commandName = 'generate'
  }

  const command = isCommandName(commandName) ? commandByName[commandName] : undefined
  if (!command) {
    console.error(`Unknown command: ${commandName}`)
    rootProgram.showHelp()
    process.exit(1)
  }

  if (rest.length === 0 || rest.some(a => a === '--help' || a === '-h')) {
    rootProgram.showHelp(commandName)
    return
  }

  try {
    await command.cli(rest)
  } catch (e) {
    cliFail(e)
  }
}

run().catch(cliFail)