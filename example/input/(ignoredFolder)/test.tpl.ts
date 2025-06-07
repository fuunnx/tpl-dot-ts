import { Config } from '../../config.ts'

export default function Default() {
	const config = Config.getContextValue()

	return `Target is ${config.target}`
}
