import { args, configContext } from '../../config.ts'


export default function Env() {
  const config = configContext.use()
  // On peut simplement exporter une string, ça créera le contenu du fichier
  return `
COMPOSE_PROJECT_NAME=${config.prefix}

COMPOSE_FILE=${config.target === 'development' ? 'docker/docker-compose.yml' : 'docker-compose.yml'}

REALTY_HOSTNAME=${config.host}

${config.target === 'development' ? '' : `/stacks/storage/${config.prefix}`}
  `.trim()
}
