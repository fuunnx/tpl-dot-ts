import { configContext, args } from "#tpl"
import { define } from "tpl.ts"

const config = configContext.consume()

export default define.dotenv({
  COMPOSE_PROJECT_NAME: `${config.prefix}-${args.target}`,
  COMPOSE_FILE: args.isLocal ? 'docker/docker-compose.yml' : 'docker-compose.yml',
  REALTY_HOSTNAME: config.host,

  "# this is a way to write comments !": '',
  STORAGE_DIRECTORY_PATH: args.isLocal ? `/stacks/storage/${config.prefix}-${args.target}` : undefined,
})
