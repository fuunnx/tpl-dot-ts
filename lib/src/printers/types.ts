export type Printer = {
	name?: string
	print: (fileName: string, data: unknown) => string | null | Promise<string | null>
}
