import { configContext } from "#tpl"

const config = configContext.consume()

export default `Target is ${config.target}`
