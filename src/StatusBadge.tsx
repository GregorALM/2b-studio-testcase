import { Badge } from '@mantine/core'

// Названия статусов приходят из таблицы task_statuses; новый статус без цвета будет серым
const colors: Record<string, string> = {
  new: 'gray',
  in_progress: 'blue',
  review: 'yellow',
  rework: 'orange',
  accepted: 'green',
}

export const statusColor = (code: string) => colors[code] ?? 'gray'

export function StatusBadge({ code, label }: { code: string; label: string }) {
  return (
    <Badge color={statusColor(code)} variant="light">
      {label}
    </Badge>
  )
}
