export type Printer = {
	name?: string
	print: (fileName: string, getData: GetData) => Promise<unknown>
}

export type GetData = {
	<T>(accept: Accept<T>): Promise<T>
	(accept?: undefined): Promise<unknown>
}
export type Accept<T> = (value: unknown) => value is T
