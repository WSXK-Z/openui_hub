/**
 * 字段路径解析与读写工具。支持 `a.b.c`、`items[0].title`、`a[1].b` 等语法。
 */

export type PathSegment = string | number

/** 解析路径为段数组：`'a.b[0].c'` → `['a','b',0,'c']` */
export function parsePath(path: string): PathSegment[] {
  const raw = path.match(/[^.[\]]+|\[\d+\]/g) ?? []
  return raw.map((seg) => {
    const index = /^\[(\d+)\]$/.exec(seg)
    return index ? Number(index[1]) : seg
  })
}

/** 读取 model 上 path 对应的值；缺失返回 undefined */
export function getPath(model: Record<string, unknown>, path: string): unknown {
  const segs = parsePath(path)
  let current: unknown = model
  for (const seg of segs) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[String(seg)]
  }
  return current
}

/** 在 model 上按 path 写入值，缺失的中间层级自动创建对象 */
export function setPath(model: Record<string, unknown>, path: string, value: unknown): void {
  const segs = parsePath(path)
  if (segs.length === 0) return
  let target = model
  for (let i = 0; i < segs.length - 1; i += 1) {
    const seg = segs[i]
    const key = String(seg)
    const next = segs[i + 1]
    const isNextIndex = typeof next === 'number'
    const current = target[key] as Record<string, unknown> | undefined
    if (current == null || typeof current !== 'object') {
      target[key] = (isNextIndex ? [] : {}) as Record<string, unknown>
    }
    target = target[key] as Record<string, unknown>
  }
  target[String(segs[segs.length - 1])] = value
}

/** 根据值类型给出空值回退（用于受控字段展示归一化） */
export function defaultValueFor(type: 'string' | 'boolean' | 'number' | 'any'): unknown {
  switch (type) {
    case 'string':
      return ''
    case 'boolean':
      return false
    case 'number':
      return undefined
    default:
      return undefined
  }
}
