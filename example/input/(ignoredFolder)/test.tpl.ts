import { configContext } from '../../config.ts'


export default function Default() {
  const config = configContext.consume()

  return `Target is ${config.target}`
}
