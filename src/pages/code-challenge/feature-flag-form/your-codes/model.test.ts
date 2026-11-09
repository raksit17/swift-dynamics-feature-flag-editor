import { describe, expect, it } from 'vitest'
import { configuration, initial, query, schema } from './model'
import type { Clause } from './model'

describe('flag configuration', () => {
  it('matches the assignment example', () => {
    expect(configuration(schema.parse(initial))).toEqual({
      flags: {
        'my-new-feature': {
          variations: { on: true, off: false },
          targeting: [
            { query: "group == 'beta'", percentage: 50, variation: 'on' },
          ],
          defaultRule: { variation: 'off' },
        },
      },
    })
  })
  it('resolves renamed variations by identity', () => {
    const draft = structuredClone(initial)
    draft.variations[0].name = 'release'
    expect(
      configuration(schema.parse(draft)).flags[draft.key].targeting[0]
        .variation,
    ).toBe('release')
  })
  it('preserves nested group precedence', () => {
    const c: Clause = {
      kind: 'condition',
      id: 'c',
      attribute: 'group',
      operator: '==',
      value: 'beta',
    }
    expect(
      query({
        kind: 'group',
        id: 'outer',
        match: 'all',
        children: [
          c,
          {
            kind: 'group',
            id: 'inner',
            match: 'any',
            children: [c, { ...c, attribute: 'role', value: 'admin' }],
          },
        ],
      }),
    ).toBe("(group == 'beta' and (group == 'beta' or role == 'admin'))")
  })
  it('rejects broken references, duplicate names, invalid JSON and empty groups', () => {
    const draft = structuredClone(initial)
    draft.variations[1] = { id: 'b', name: 'on', raw: 'bad' }
    draft.rules[0].expression = {
      id: 'g',
      kind: 'group',
      match: 'any',
      children: [],
    }
    draft.fallback = 'missing'
    const result = schema.safeParse(draft)
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(
      expect.arrayContaining([
        'variations.1.name',
        'variations.1.raw',
        'rules.0.expression.children',
        'fallback',
      ]),
    )
  })
})
