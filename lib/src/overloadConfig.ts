type Config<Target extends string, Shape extends Record<string, any>> = {
    [key in keyof Shape]: { default: Shape[key]} & {
      [key in Target]?: Shape[key]
    }
}


export function overloadConfig<
  Target extends string,
  Shape extends Record<string, any>,
>(target: Target, conf: Config<Target, Shape>): Shape {
  const result: Partial<Shape> = {}

  const entries = Object.entries(conf) as [keyof Shape, (typeof conf)[keyof Shape]][]
  for (const [key, value] of entries) {
    result[key] = value[target] ?? (value as any).default
  }
  return result as Shape
}

// export function overloadConfig<
//   Target extends string,
//   Shape,
// >(target: Target, conf: {
//   [key in Target]: Shape
// }): Shape {
//   return conf[target]
// }
