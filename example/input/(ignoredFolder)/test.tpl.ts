import { configContext } from '../../config.ts'

const config = configContext.consume()

export default `Target is ${config.target}`
