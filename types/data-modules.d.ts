declare module "*.csv" {
  const rows: Record<string, string>[]
  export default rows
}

declare module "*.tsv" {
  const rows: Record<string, string>[]
  export default rows
}
