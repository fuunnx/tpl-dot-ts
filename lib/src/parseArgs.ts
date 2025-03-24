import { Option, program } from 'commander'

type Args = {
	readonly [key: string]: readonly string[] | boolean | string
}

type ParsedArgs<IArgs extends Args> = {
	[K in keyof IArgs]: IArgs[K] extends readonly string[]
		? IArgs[K][number]
		: IArgs[K] extends boolean
			? boolean
			: IArgs[K]
}

// use zod ?
export function parseArgs<IArgs extends Args>(args: IArgs): ParsedArgs<IArgs> {
	for (const [key, value] of Object.entries(args)) {
		if (program.options.find((option) => option.long === `--${key}`)) continue

		const isBool = typeof value === 'boolean'
		if (isBool) {
			const parseBool = (params: string) => {
				if (params === 'true') return true
				if (params === 'false') return false
				return false
			}

			const option = new Option(`--${key} <true|false>`)
				.argParser(parseBool)
				.default(value)
			program.addOption(option)
			continue
		}

		const isChoices = Array.isArray(value)
		if (isChoices) {
			const defaultValue = value[0]
			const option = new Option(`--${key} <${key}>`)
				.choices(value)
				.default(defaultValue)
			program.addOption(option)
			continue
		}

		const isString = typeof value === 'string'
		if (isString) {
			const option = new Option(`--${key} <${key}>`).default(value)
			program.addOption(option)
			continue
		}

		throw new Error(`Unknown arg type ${JSON.stringify(value)}`)
	}

	program.parse()
	return program.opts<ParsedArgs<IArgs>>()
}
