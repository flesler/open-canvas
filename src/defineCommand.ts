import type { TrpcCliMeta } from 'trpc-cli'
import type { z } from 'zod'

export type CanvasCommand<TSchema extends z.ZodTypeAny, TResult = void> = {
  meta: TrpcCliMeta;
  input: TSchema;
  run: (input: z.infer<TSchema>) => Promise<TResult> | TResult
}

export function defineCommand<TSchema extends z.ZodTypeAny, TResult>(
  command: CanvasCommand<TSchema, TResult>,
): CanvasCommand<TSchema, TResult> {
  return command
}