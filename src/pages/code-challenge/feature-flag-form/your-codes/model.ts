import { z } from 'zod'

type Condition = {
  id: string
  kind: 'condition'
  attribute: 'role' | 'group'
  operator: '==' | '!='
  value: string
}
type Group = {
  id: string
  kind: 'group'
  match: 'all' | 'any'
  children: Clause[]
}
export type Clause = Condition | Group
const required = z.string().trim().min(1, 'Enter a value')
const clauseSchema: z.ZodType<Clause, Clause> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({
      id: z.string(),
      kind: z.literal('condition'),
      attribute: z.enum(['role', 'group']),
      operator: z.enum(['==', '!=']),
      value: required,
    }),
    z.object({
      id: z.string(),
      kind: z.literal('group'),
      match: z.enum(['all', 'any']),
      children: z.array(clauseSchema).min(1, 'Add a condition'),
    }),
  ]),
)
export const condition = (): Condition => ({
  id: crypto.randomUUID(),
  kind: 'condition',
  attribute: 'group',
  operator: '==',
  value: '',
})
export const group = (): Group => ({
  id: crypto.randomUUID(),
  kind: 'group',
  match: 'all',
  children: [condition()],
})
const jsonValue = z.string().refine((s) => {
  try {
    JSON.parse(s)
    return true
  } catch {
    return false
  }
}, 'Use a JSON value, e.g. true, 42 or "blue"')
export const schema = z
  .object({
    key: required,
    description: z.string(),
    enabled: z.boolean(),
    variations: z
      .array(z.object({ id: z.string(), name: required, raw: jsonValue }))
      .min(1),
    rules: z.array(
      z.object({
        id: z.string(),
        expression: clauseSchema,
        percent: z.number().int().min(0).max(100),
        target: required,
      }),
    ),
    fallback: required,
  })
  .superRefine((v, ctx) => {
    const names = new Set<string>()
    v.variations.forEach((x, i) => {
      if (names.has(x.name))
        ctx.addIssue({
          code: 'custom',
          path: ['variations', i, 'name'],
          message: 'Choose a unique name',
        })
      names.add(x.name)
    })
    const ids = new Set(v.variations.map((x) => x.id))
    if (!ids.has(v.fallback))
      ctx.addIssue({
        code: 'custom',
        path: ['fallback'],
        message: 'Choose a variation',
      })
    v.rules.forEach((r, i) => {
      if (!ids.has(r.target))
        ctx.addIssue({
          code: 'custom',
          path: ['rules', i, 'target'],
          message: 'Choose a variation',
        })
    })
  })
export type Draft = z.infer<typeof schema>
export const initial: Draft = {
  key: 'my-new-feature',
  description: '',
  enabled: true,
  variations: [
    { id: 'a', name: 'on', raw: 'true' },
    { id: 'b', name: 'off', raw: 'false' },
  ],
  rules: [
    {
      id: 'beta',
      expression: {
        id: 'first',
        kind: 'condition',
        attribute: 'group',
        operator: '==',
        value: 'beta',
      },
      percent: 50,
      target: 'a',
    },
  ],
  fallback: 'b',
}
export function query(c: Clause): string {
  if (c.kind === 'group')
    return (
      '(' +
      c.children.map(query).join(c.match === 'all' ? ' and ' : ' or ') +
      ')'
    )
  return (
    c.attribute +
    ' ' +
    c.operator +
    " '" +
    c.value.replaceAll('\\', '\\\\').replaceAll("'", "\\'") +
    "'"
  )
}
export function configuration(d: Draft) {
  const names = new Map(d.variations.map((v) => [v.id, v.name]))
  return {
    flags: {
      [d.key]: {
        ...(d.description ? { metadata: { description: d.description } } : {}),
        ...(!d.enabled ? { disable: true } : {}),
        variations: Object.fromEntries(
          d.variations.map((v) => [v.name, JSON.parse(v.raw)]),
        ),
        targeting: d.rules.map((r) => ({
          query: query(r.expression),
          percentage: r.percent,
          variation: names.get(r.target),
        })),
        defaultRule: { variation: names.get(d.fallback) },
      },
    },
  }
}
