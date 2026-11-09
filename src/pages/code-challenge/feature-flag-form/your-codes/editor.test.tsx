// @vitest-environment jsdom
import { render, screen, fireEvent, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import FlagEditor from './index'

vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: { value: string }) => (
    <pre data-testid="json">{value}</pre>
  ),
}))

it('updates nested rules and resolves removed variation references in the live preview', async () => {
  render(<FlagEditor />)
  const output = () =>
    JSON.parse(screen.getByTestId('json').textContent!).flags['my-new-feature']
  fireEvent.click(screen.getByText('Group condition'))
  fireEvent.click(screen.getByText('+ Condition'))
  expect(await screen.findByRole('status')).toBeDefined()
  fireEvent.change(screen.getAllByLabelText('Attribute value')[1], {
    target: { value: 'staff' },
  })
  expect(output().targeting[0].query).toContain("and group == 'staff'")
  fireEvent.click(screen.getAllByRole('button', { name: /^Remove$/ })[0])
  expect(output().targeting[0].variation).toBe('off')
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Rule 1' })).getByText(
      'Remove rule',
    ),
  )
  expect(output().targeting).toEqual([])
})
