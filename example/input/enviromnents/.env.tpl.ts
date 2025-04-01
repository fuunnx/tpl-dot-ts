import { define } from 'tpl-dot-ts'
import { args, configContext } from '../../config.ts'


export default function Env() {
  const config = configContext.use()

  return define.dotenv({
    COMPOSE_PROJECT_NAME: config.prefix,
    COMPOSE_FILE: config.target === 'development'
      ? 'docker/docker-compose.yml'
      : 'docker-compose.yml',
    REALTY_HOSTNAME: config.host,

    '# this is a way to write comments !': '',
    STORAGE_DIRECTORY_PATH: config.target === 'development'
      ? `/stacks/storage/${config.prefix}`
      : undefined,
  })
} 
