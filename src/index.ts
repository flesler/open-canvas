import type { z } from 'zod'
import generateCommand from './commands/generate.js'
import outlineCommand from './commands/outline.js'
import skillCommand from './commands/skill.js'
import vendorPathCommand from './commands/vendor-path.js'
import verifyCommand from './commands/verify.js'

const openCanvas = {
  generate: (raw: z.input<typeof generateCommand.input>) => generateCommand.run(generateCommand.input.parse(raw)),
  outline: (raw: z.input<typeof outlineCommand.input>) => outlineCommand.run(outlineCommand.input.parse(raw)),
  verify: (raw: z.input<typeof verifyCommand.input> | string) =>
    verifyCommand.run(
      verifyCommand.input.parse(typeof raw === 'string' ? { canvas: raw } : raw),
    ),
  skill: (raw?: z.input<typeof skillCommand.input>) =>
    skillCommand.run(skillCommand.input.parse(raw ?? {})),
  vendorPath: (raw?: z.input<typeof vendorPathCommand.input>) =>
    vendorPathCommand.run(vendorPathCommand.input.parse(raw ?? {})),
}

export default openCanvas