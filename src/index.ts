import { runGenerate } from './commands/generate.js'
import { runOutline } from './commands/outline.js'
import { runSkill } from './commands/skill.js'
import { runVendorPath } from './commands/vendor-path.js'
import { runVerify } from './commands/verify.js'

const openCanvas = {
  generate: runGenerate,
  outline: runOutline,
  verify: runVerify,
  skill: runSkill,
  vendorPath: runVendorPath,
}

export default openCanvas
