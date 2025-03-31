import { define } from 'tpl.ts'
import { args, configContext } from '../../config.ts'


export default function Env() {
  const config = configContext.consume()

  return define.dotenv({
    COMPOSE_PROJECT_NAME: `${config.prefix}-${args.target}`,
    COMPOSE_FILE: args.isLocal
      ? 'docker/docker-compose.yml'
      : 'docker-compose.yml',
    REALTY_HOSTNAME: config.host,

    '# this is a way to write comments !': '',
    STORAGE_DIRECTORY_PATH: args.isLocal
      ? `/stacks/storage/${config.prefix}-${args.target}`
      : undefined,
  })
} 
