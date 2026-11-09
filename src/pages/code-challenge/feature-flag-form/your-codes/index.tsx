import { useForm } from '@tanstack/react-form'
import Editor from '@monaco-editor/react'
import { ClauseEditor } from './ClauseEditor'
import { initial, schema, configuration, condition } from './model'
import type { Clause, Draft } from './model'

type EditorDraft = Omit<Draft, 'rules'> & {
  rules: (Omit<Draft['rules'][number], 'expression'> & {
    expression: unknown
  })[]
}

function Preview({ draft }: { draft: EditorDraft }) {
  const result = schema.safeParse(draft)
  if (!result.success)
    return (
      <div
        role="status"
        className="space-y-2 rounded-lg bg-amber-50 p-5 text-amber-950"
      >
        <strong>Resolve these fields to preview JSON</strong>
        <ul>
          {result.error.issues.map((error, i) => (
            <li key={i}>
              {error.path.join(' › ')} — {error.message}
            </li>
          ))}
        </ul>
      </div>
    )
  const json = JSON.stringify(configuration(result.data), null, 2)
  return (
    <Editor
      height="65vh"
      language="json"
      theme="vs-dark"
      value={json}
      loading={<pre className="overflow-auto p-4">{json}</pre>}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
      }}
    />
  )
}

export default function FlagEditor() {
  const form = useForm({
    defaultValues: initial as EditorDraft,
    validators: {
      onChange: ({ value }) =>
        schema
          .safeParse(value)
          .error?.issues.map((issue) => issue.message)
          .join('; '),
    },
  })
  const options = (variations: Draft['variations']) =>
    variations.map((v) => (
      <option key={v.id} value={v.id}>
        {v.name || 'Unnamed variation'}
      </option>
    ))
  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Feature flag editor
        </h1>
        <p className="mt-1 text-muted-foreground">
          Configure variations and choose who receives each one.
        </p>
      </header>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-4 [&_section]:space-y-4 [&_section]:rounded-xl [&_section]:border [&_section]:bg-card [&_section]:p-5 [&_h2]:font-semibold [&_input]:max-w-full [&_input]:rounded [&_input]:border [&_input]:px-2 [&_input]:py-1 [&_select]:rounded [&_select]:border [&_select]:bg-background [&_select]:p-1 [&_button]:rounded [&_button]:border [&_button]:px-2 [&_button]:py-1 [&_button]:text-sm [&_button]:hover:bg-muted [&_button]:disabled:opacity-40">
          <section>
            <h2>Flag details</h2>
            {(['key', 'description'] as const).map((name) => (
              <form.Field key={name} name={name}>
                {(f) => (
                  <label className="block">
                    {name === 'key' ? 'Flag name' : 'Description'}
                    <input
                      className="mt-1 block w-full"
                      value={f.state.value}
                      onChange={(e) => f.handleChange(e.target.value)}
                    />
                  </label>
                )}
              </form.Field>
            ))}
            <form.Field name="enabled">
              {(f) => (
                <label>
                  <input
                    type="checkbox"
                    checked={f.state.value}
                    onChange={(e) => f.handleChange(e.target.checked)}
                  />{' '}
                  Enabled
                </label>
              )}
            </form.Field>
          </section>
          <section>
            <h2>Variations</h2>
            <form.Field name="variations" mode="array">
              {(f) => (
                <>
                  {f.state.value.map((v, i) => (
                    <div key={v.id} className="flex flex-wrap items-end gap-2">
                      <form.Field name={`variations[${i}].name`}>
                        {(x) => (
                          <label>
                            Name
                            <input
                              className="block w-32"
                              value={x.state.value}
                              onChange={(e) => x.handleChange(e.target.value)}
                            />
                          </label>
                        )}
                      </form.Field>
                      <form.Field name={`variations[${i}].raw`}>
                        {(x) => (
                          <label>
                            JSON value
                            <input
                              className="block w-36 font-mono"
                              value={x.state.value}
                              onChange={(e) => x.handleChange(e.target.value)}
                            />
                          </label>
                        )}
                      </form.Field>
                      <button
                        disabled={f.state.value.length === 1}
                        onClick={() => {
                          const replacement = f.state.value.find(
                            (choice) => choice.id !== v.id,
                          )!
                          if (form.state.values.fallback === v.id)
                            form.setFieldValue('fallback', replacement.id)
                          form.state.values.rules.forEach((rule, index) => {
                            if (rule.target === v.id)
                              form.setFieldValue(
                                `rules[${index}].target`,
                                replacement.id,
                              )
                          })
                          void f.removeValue(i)
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      f.pushValue({
                        id: crypto.randomUUID(),
                        name: '',
                        raw: 'null',
                      })
                    }
                  >
                    + Variation
                  </button>
                </>
              )}
            </form.Field>
          </section>
          <section>
            <h2>Targeting rules</h2>
            <form.Field name="rules" mode="array">
              {(f) => (
                <>
                  {f.state.value.map((r, i) => (
                    <fieldset
                      key={r.id}
                      className="space-y-3 rounded-lg border p-3"
                    >
                      <legend className="px-1">Rule {i + 1}</legend>
                      <form.Field name={`rules[${i}].expression`}>
                        {(x) => (
                          <ClauseEditor
                            node={x.state.value as Clause}
                            change={(n) => x.handleChange(n)}
                          />
                        )}
                      </form.Field>
                      <div className="flex flex-wrap items-center gap-3">
                        <form.Field name={`rules[${i}].percent`}>
                          {(x) => (
                            <label>
                              Rollout %{' '}
                              <input
                                className="w-20"
                                type="number"
                                min="0"
                                max="100"
                                value={
                                  Number.isNaN(x.state.value)
                                    ? ''
                                    : x.state.value
                                }
                                onChange={(e) =>
                                  x.handleChange(e.target.valueAsNumber)
                                }
                              />
                            </label>
                          )}
                        </form.Field>
                        <form.Field name={`rules[${i}].target`}>
                          {(x) => (
                            <label>
                              Serve{' '}
                              <select
                                value={x.state.value}
                                onChange={(e) => x.handleChange(e.target.value)}
                              >
                                <form.Subscribe
                                  selector={(s) => s.values.variations}
                                >
                                  {(items) => options(items)}
                                </form.Subscribe>
                              </select>
                            </label>
                          )}
                        </form.Field>
                      </div>
                      <button onClick={() => void f.removeValue(i)}>
                        Remove rule
                      </button>
                    </fieldset>
                  ))}
                  <button
                    onClick={() =>
                      f.pushValue({
                        id: crypto.randomUUID(),
                        expression: condition(),
                        percent: 100,
                        target: form.state.values.fallback,
                      })
                    }
                  >
                    + Rule
                  </button>
                </>
              )}
            </form.Field>
          </section>
          <section>
            <h2>Default rule</h2>
            <form.Field name="fallback">
              {(x) => (
                <label>
                  Serve{' '}
                  <select
                    value={x.state.value}
                    onChange={(e) => x.handleChange(e.target.value)}
                  >
                    <form.Subscribe selector={(s) => s.values.variations}>
                      {(items) => options(items)}
                    </form.Subscribe>
                  </select>
                </label>
              )}
            </form.Field>
          </section>
        </div>
        <aside className="min-w-0 overflow-hidden rounded-xl border xl:sticky xl:top-4">
          <h2 className="bg-slate-900 px-4 py-3 font-mono text-sm text-white">
            flag.json
          </h2>
          <form.Subscribe selector={(s) => s.values}>
            {(draft) => <Preview draft={draft} />}
          </form.Subscribe>
        </aside>
      </div>
    </main>
  )
}
