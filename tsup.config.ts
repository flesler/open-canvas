import { defineConfig } from 'tsup'

export default defineConfig((options) => {
  const dts = options.dts !== false
  const started = Date.now()
  return {
    entry: {
      cli: 'src/cli.ts',
      index: 'src/index.ts',
    },
    tsconfig: 'tsconfig.cli.json',
    format: ['esm'],
    platform: 'node',
    target: 'node22',
    outDir: 'dist',
    dts: dts ? { entry: { index: 'src/index.ts' } } : false,
    clean: true,
    treeshake: true,
    minify: true,
    splitting: false,
    silent: !dts,
    skipNodeModulesBundle: true,
    esbuildOptions(options) {
      options.legalComments = 'none'
      options.drop = ['debugger']
    },
    async onSuccess() {
      if (!dts) {
        console.log(`Build success in ${Date.now() - started}ms`)
      }
    },
  }
})