export function isPlainObject(
	value: unknown,
): value is Record<string | symbol, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value.constructor === Object || value.constructor === undefined)
	)
}
