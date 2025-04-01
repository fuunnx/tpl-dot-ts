import { configContext } from '../../config.ts'


export default function Default() {
  const config = configContext.use()

  return `Target is ${config.target}`
}
