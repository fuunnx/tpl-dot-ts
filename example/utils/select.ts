export function select<T extends string, U>(
	target: T,
	conf: Partial<Record<T, U>> & { default: U },
): U {
	return conf[target] ?? conf.default
}
