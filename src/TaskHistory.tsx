import { Alert, Loader, Text, Timeline } from '@mantine/core'
import { supabase } from './supabase'
import type { FieldChanges } from './types'
import { useLoad } from './useLoad'

const fieldLabels: Record<keyof FieldChanges, string> = {
  title: 'Название',
  description: 'Описание',
  object: 'Объект',
  assignee: 'Исполнитель',
}

const formatDate = (iso: string) => new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })

/** История задачи; version — меняйте, чтобы перезагрузить после действия. */
export function TaskHistory({ taskId, version }: { taskId: string; version: number }) {
  const history = useLoad(
    () =>
      supabase
        .from('task_history')
        .select(
          'id, changed_at, comment, changes, from:task_statuses!from_status(label), to:task_statuses!to_status(label), author:profiles!changed_by(full_name)',
        )
        .eq('task_id', taskId)
        .order('id'),
    [taskId, version],
  )

  if (history.isLoading) return <Loader size="sm" />
  if (history.error) return <Alert color="red">{history.error}</Alert>

  return (
    <Timeline bulletSize={14} lineWidth={2}>
      {history.data?.map((h) => {
        const changes = Object.entries((h.changes ?? {}) as FieldChanges)
        return (
          <Timeline.Item
            key={h.id}
            title={
              !h.from && h.to ? 'Задача создана' : h.from && h.to ? `${h.from.label} → ${h.to.label}` : 'Задача изменена'
            }
          >
            <Text size="xs" c="dimmed">
              {h.author?.full_name ?? 'Пользователь удалён'} · {formatDate(h.changed_at)}
            </Text>
            {changes.map(([field, change]) => (
              <Text key={field} size="sm">
                {fieldLabels[field as keyof FieldChanges]}: «{change?.old || '—'}» → «{change?.new || '—'}»
              </Text>
            ))}
            {h.comment && (
              <Text size="sm" fs="italic">
                «{h.comment}»
              </Text>
            )}
          </Timeline.Item>
        )
      })}
    </Timeline>
  )
}
