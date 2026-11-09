import { condition, group } from './model'
import type { Clause } from './model'

export function ClauseEditor({
  node,
  change,
}: {
  node: Clause
  change: (n: Clause) => void
}) {
  if (node.kind === 'condition')
    return (
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Attribute"
          value={node.attribute}
          onChange={(e) =>
            change({
              ...node,
              attribute: e.target.value as typeof node.attribute,
            })
          }
        >
          <option>group</option>
          <option>role</option>
        </select>
        <select
          aria-label="Operator"
          value={node.operator}
          onChange={(e) =>
            change({
              ...node,
              operator: e.target.value as typeof node.operator,
            })
          }
        >
          <option>==</option>
          <option>!=</option>
        </select>
        <input
          aria-label="Attribute value"
          placeholder="Value"
          value={node.value}
          onChange={(e) => change({ ...node, value: e.target.value })}
        />
        <button onClick={() => change({ ...group(), children: [node] })}>
          Group condition
        </button>
      </div>
    )
  return (
    <fieldset className="space-y-3 border-l-2 border-teal-500 pl-3">
      <legend>Condition group</legend>
      <label>
        Match{' '}
        <select
          value={node.match}
          onChange={(e) =>
            change({ ...node, match: e.target.value as typeof node.match })
          }
        >
          <option value="all">all conditions</option>
          <option value="any">any condition</option>
        </select>
      </label>
      {node.children.map((child) => (
        <div key={child.id}>
          <ClauseEditor
            node={child}
            change={(next) =>
              change({
                ...node,
                children: node.children.map((c) =>
                  c.id === child.id ? next : c,
                ),
              })
            }
          />
          <button
            onClick={() =>
              change({
                ...node,
                children: node.children.filter((c) => c.id !== child.id),
              })
            }
          >
            Remove condition
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          change({ ...node, children: [...node.children, condition()] })
        }
      >
        + Condition
      </button>{' '}
      <button
        onClick={() =>
          change({ ...node, children: [...node.children, group()] })
        }
      >
        + Group
      </button>
    </fieldset>
  )
}
