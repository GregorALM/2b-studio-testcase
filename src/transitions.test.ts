import { describe, expect, it } from 'vitest'
import { availableTransitions } from './transitions'

// те же переходы, что в миграции
const transitions = [
  { from_status: 'new', to_status: 'in_progress', actor: 'assignee' },
  { from_status: 'in_progress', to_status: 'review', actor: 'assignee' },
  { from_status: 'review', to_status: 'accepted', actor: 'manager' },
  { from_status: 'review', to_status: 'rework', actor: 'manager' },
  { from_status: 'rework', to_status: 'in_progress', actor: 'assignee' },
]

const manager = { id: 'm', role: 'manager' as const }
const assignee = { id: 'a', role: 'executor' as const }
const otherExecutor = { id: 'b', role: 'executor' as const }

const targets = (status: string, me: typeof manager | typeof assignee) =>
  availableTransitions(transitions, { status, assignee_id: 'a' }, me).map((t) => t.to_status)

describe('availableTransitions', () => {
  it('исполнитель берёт в работу и отправляет на проверку только свою задачу', () => {
    expect(targets('new', assignee)).toEqual(['in_progress'])
    expect(targets('in_progress', assignee)).toEqual(['review'])
    expect(targets('rework', assignee)).toEqual(['in_progress'])
    expect(targets('new', otherExecutor)).toEqual([])
  })

  it('принимает и возвращает только постановщик', () => {
    expect(targets('review', manager)).toEqual(['accepted', 'rework'])
    expect(targets('review', assignee)).toEqual([])
    expect(targets('new', manager)).toEqual([])
  })

  it('из «Принята» переходов нет', () => {
    expect(targets('accepted', manager)).toEqual([])
    expect(targets('accepted', assignee)).toEqual([])
  })
})
