import { Config } from '../../config.ts'
import { defineDotenv } from '../../utils/dotenv.ts'
import { select } from '../../utils/select.ts'

export default function Env() {
	const config = Config.getContextValue()

	return defineDotenv({
		COMPOSE_PROJECT_NAME: config.prefix,

		COMPOSE_FILE: select(config.target, {
			development: 'docker/docker-compose.yml',
			default: 'docker-compose.yml',
		}),

		REALTY_HOSTNAME: config.host,

		'# this is a way to write comments !': '',

		STORAGE_DIRECTORY_PATH: select(config.target, {
			development: `/stacks/storage/${config.prefix}`,
			default: undefined,
		}),
	})
}
