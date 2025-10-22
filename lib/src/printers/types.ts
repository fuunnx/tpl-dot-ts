export type Printer = {
	name?: string
	print: (fileName: string, getData: () => Promise<unknown>) => Promise<unknown>
}
