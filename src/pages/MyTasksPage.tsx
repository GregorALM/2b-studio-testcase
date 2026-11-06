import { Alert, Loader, Stack, Text, Title } from '@mantine/core'
import { useMe } from '../auth'
import { supabase } from '../supabase'
import { TasksTable } from '../TasksTable'
import { useLoad } from '../useLoad'

/** Исполнителю — назначенные ему задачи, постановщику — поставленные им. */
export function MyTasksPage() {
  const me = useMe()
  const isManager = me.role === 'manager'
  const tasks = useLoad(
    () =>
      supabase
        .from('tasks')
        .select('id, title, status, task_statuses(label, sort_order), assignee:profiles!assignee_id(full_name), object:objects(name)')
        .eq(isManager ? 'author_id' : 'assignee_id', me.id)
        .order('created_at'),
    [me.id],
  )
  // по порядку статусов из справочника: новые и в работе — выше принятых
  const sorted = tasks.data?.toSorted((a, b) => a.task_statuses.sort_order - b.task_statuses.sort_order)

  return (
    <Stack>
      <div>
        <Title order={2}>Мои задачи</Title>
        <Text c="dimmed">
          {isManager
            ? 'Здесь задачи, которые поставили вы. Задачи других постановщиков — в карточках объектов: принять или вернуть на доработку можно любую задачу, не только свою.'
            : 'Задачи, назначенные вам'}
        </Text>
      </div>
      {tasks.error && <Alert color="red">{tasks.error}</Alert>}
      {tasks.isLoading ? (
        <Loader />
      ) : !sorted?.length ? (
        <Text c="dimmed">Задач пока нет</Text>
      ) : (
        // исполнителю столбец «Исполнитель» ничего не говорит — там всегда он сам
        <TasksTable tasks={sorted} showObject showAssignee={isManager} />
      )}
    </Stack>
  )
}
