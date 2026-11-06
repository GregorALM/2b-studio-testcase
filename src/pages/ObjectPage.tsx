import { Alert, Anchor, Button, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMe } from '../auth'
import { ConfirmModal } from '../ConfirmModal'
import { ObjectForm } from '../ObjectForm'
import { supabase } from '../supabase'
import { TaskForm } from '../TaskForm'
import { TasksTable } from '../TasksTable'
import { useLoad } from '../useLoad'

export function ObjectPage() {
  const { id = '' } = useParams()
  const isManager = useMe().role === 'manager'
  const navigate = useNavigate()
  const object = useLoad(() => supabase.from('objects').select('id, name, address').eq('id', id).maybeSingle(), [id])
  // исполнителю RLS вернёт только его задачи
  const tasks = useLoad(
    () =>
      supabase
        .from('tasks')
        .select('id, title, status, task_statuses(label), assignee:profiles!assignee_id(full_name)')
        .eq('object_id', id)
        .order('created_at'),
    [id],
  )
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingTask, setIsAddingTask] = useState(false)

  if (object.isLoading) return <Loader />
  if (object.error) return <Alert color="red">{object.error}</Alert>
  if (!object.data)
    return (
      <Stack>
        <Text>Объект не найден или у вас нет к нему доступа</Text>
        <Anchor component={Link} to="/objects">
          К объектам
        </Anchor>
      </Stack>
    )

  const o = object.data
  return (
    <Stack>
      <Anchor component={Link} to="/objects" size="sm">
        ← Объекты
      </Anchor>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>{o.name}</Title>
          {o.address && <Text c="dimmed">{o.address}</Text>}
        </div>
        {isManager && (
          <Group gap="xs">
            <Button variant="default" onClick={() => setIsEditing(true)}>
              Изменить
            </Button>
            <Button variant="light" color="red" onClick={() => setIsDeleting(true)}>
              Удалить
            </Button>
          </Group>
        )}
      </Group>

      <Group justify="space-between">
        <Title order={3}>{isManager ? 'Задачи' : 'Мои задачи на объекте'}</Title>
        {isManager && <Button onClick={() => setIsAddingTask(true)}>Добавить задачу</Button>}
      </Group>
      {tasks.error && <Alert color="red">{tasks.error}</Alert>}
      {tasks.isLoading ? (
        <Loader />
      ) : !tasks.data?.length ? (
        <Text c="dimmed">Задач пока нет</Text>
      ) : (
        <TasksTable tasks={tasks.data} />
      )}

      <ObjectForm opened={isEditing} onClose={() => setIsEditing(false)} onSaved={object.reload} object={o} />
      <TaskForm opened={isAddingTask} onClose={() => setIsAddingTask(false)} onSaved={tasks.reload} objectId={o.id} />
      <ConfirmModal
        opened={isDeleting}
        onClose={() => setIsDeleting(false)}
        title="Удалить объект?"
        confirmLabel="Удалить"
        onConfirm={async () => {
          const { error } = await supabase.from('objects').delete().eq('id', o.id)
          if (error) return error.message
          navigate('/objects')
        }}
      >
        Объект «{o.name}» будет удалён вместе с задачами ({tasks.data?.length ?? 0}) и их историей. Отменить это нельзя.
      </ConfirmModal>
    </Stack>
  )
}
