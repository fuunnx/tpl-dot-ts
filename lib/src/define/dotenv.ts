export function defineDotenv<
	Dotenv extends Record<string, string | boolean | number | undefined>,
>(dotenv: Dotenv): string {
	return Object.entries(dotenv)
		.map(([key, value]) => {
			if (value === undefined) return
			if (key.startsWith('#')) return `\n${key}`
			else return `${key}=${value}`
		})
		.filter(Boolean)
		.join('\n')
}
