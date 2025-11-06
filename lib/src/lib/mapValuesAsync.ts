export async function mapValuesAsync<T extends Record<string, any>, U>(
	obj: T,
	fn: (value: T[keyof T], key: keyof T) => Promise<U>,
): Promise<{ [key in keyof T]: U }> {
	return Object.fromEntries(
		await Promise.all(
			Object.entries(obj).map(async ([key, value]) => {
				return [key, await fn(value, key)]
			}),
		),
	) as { [key in keyof T]: U }
}

export function mapValues<T extends Record<string, any>, U>(
	obj: T,
	fn: (value: T[keyof T], key: keyof T) => U,
): { [key in keyof T]: U } {
	return Object.fromEntries(
		Object.entries(obj).map(([key, value]) => [key, fn(value, key)]),
	) as { [key in keyof T]: U }
}
