import { z, type ZodObject, type ZodTypeAny } from 'zod'
import { command as createSubcommand, parser as createParser, type Command, type Parser } from 'zod-opts'
import { cliFlagMapsForOptionKeys, cliFlagName, remapParsedCliOptions } from './cliFlags.js'
import { cliName, version } from '../pkg.js'

export type CommandOptionMeta = {
  alias?: string;
  argumentName?: string
}

export interface CommandDef<
  T extends ZodObject<any> = ZodObject<any>,
  U extends ZodObject<any> = ZodObject<any>,
> {
  description?: string;
  options: T;
  args?: U;
  parser: Parser;
  zodSubcommand: Command;
  handler: (params: z.infer<T> & z.infer<U>) => void | Promise<void>;
  cli: (args: string[]) => Promise<void>
}

export interface DefineCommandConfig<
  T extends ZodObject<any> = ZodObject<any>,
  U extends ZodObject<any> = ZodObject<any>,
> {
  name: string;
  description?: string;
  options?: T;
  args?: U;
  optionMeta?: Partial<Record<keyof z.infer<T>, CommandOptionMeta>>;
  handler: (params: z.infer<T> & z.infer<U>) => void | Promise<void>
}

type CliBuild = {
  parser: Parser;
  zodSubcommand: Command;
  cliToCamel: Record<string, string>;
  positionalKeys: ReadonlySet<string>
}

function buildCli<T extends ZodObject<any>, U extends ZodObject<any>>(
  config: DefineCommandConfig<T, U>,
): CliBuild {
  const { name, description, options: optionsSchema = z.object({}), args: argsSchema, optionMeta } = config
  const optionsShape = optionsSchema.shape
  const schemaKeys = Object.keys(optionsShape)
  const { cliToCamel } = cliFlagMapsForOptionKeys(schemaKeys)
  const opts: Record<string, { type: ZodTypeAny; alias?: string; argumentName?: string }> = {}
  for (const [camelKey, value] of Object.entries(optionsShape)) {
    const flag = cliFlagName(camelKey)
    const meta = optionMeta?.[camelKey as keyof z.infer<T>]
    opts[flag] = { type: value as ZodTypeAny, ...meta }
  }

  const positionalKeys = new Set<string>()
  const positionalArgs = argsSchema
    ? Object.entries(argsSchema.shape).map(([argName, type]) => {
      positionalKeys.add(argName)
      return { name: argName, type: type as ZodTypeAny }
    })
    : []

  let p = createParser().name(cliName).version(version).options(opts)
  if (positionalArgs.length > 0) {
    p = p.args(positionalArgs as [{ name: string; type: ZodTypeAny }, ...{ name: string; type: ZodTypeAny }[]])
  }
  if (description) {
    p = p.description(description)
  }

  let sub = createSubcommand(name).options(opts)
  if (positionalArgs.length > 0) {
    sub = sub.args(positionalArgs as [{ name: string; type: ZodTypeAny }, ...{ name: string; type: ZodTypeAny }[]])
  }
  if (description) {
    sub = sub.description(description)
  }
  sub = sub.action(() => {})

  return { parser: p, zodSubcommand: sub, cliToCamel, positionalKeys }
}

export default function defineCommand<T extends ZodObject<any>, U extends ZodObject<any> = ZodObject<any>>(
  config: DefineCommandConfig<T, U>,
): CommandDef<T, U> {
  const { description, options: optionsSchema = z.object({}), args: argsSchema, handler } = config
  const { parser: p, zodSubcommand, cliToCamel, positionalKeys } = buildCli(config)

  return {
    description,
    options: optionsSchema as T,
    args: argsSchema as U | undefined,
    parser: p,
    zodSubcommand,
    handler,
    cli: async (args) => {
      const parsed = p.parse(args) as Record<string, unknown>
      const params = remapParsedCliOptions(parsed, cliToCamel, positionalKeys)
      await handler(params as z.infer<T> & z.infer<U>)
    },
  }
}