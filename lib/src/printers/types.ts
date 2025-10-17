export type Printer = {
	name?: string
	print: (fileName: string, data: unknown, next: (data: unknown) => Promise<unknown>) => unknown | Promise<unknown>
}
