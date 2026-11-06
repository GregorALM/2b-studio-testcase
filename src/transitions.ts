import type { Profile, Task, Transition } from './types'

/**
 * Смены статуса, которые можно показать пользователю кнопками.
 * Повторяет проверки change_task_status, чтобы не показывать лишнего; права всё равно проверяет база.
 */
export function availableTransitions<T extends Pick<Transition, 'from_status' | 'actor'>>(
  transitions: T[],
  task: Pick<Task, 'status' | 'assignee_id'>,
  me: Pick<Profile, 'id' | 'role'>,
): T[] {
  return transitions.filter(
    (t) => t.from_status === task.status && (t.actor === 'manager' ? me.role === 'manager' : task.assignee_id === me.id),
  )
}
