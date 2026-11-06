import { Alert, Anchor, Button, Group, Loader, Modal, Stack, Table, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMe } from '../auth'
import { ObjectForm } from '../ObjectForm'
import { StatusBadge } from '../StatusBadge'
import { supabase } from '../supabase'
import type { CrmObject } from '../types'
import { useLoad } from '../useLoad'

export function ObjectPage() {
  const { id = '' } = useParams()
  const isManager = useMe().role === 'manager'
  const object = useLoad(() => supabase.from('objects').select('id, name, address').eq('id', id).maybeSingle(), [id])
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

      <Title order={3}>{isManager ? 'Задачи' : 'Мои задачи на объекте'}</Title>
      {tasks.error && <Alert color="red">{tasks.error}</Alert>}
      {tasks.isLoading ? (
        <Loader />
      ) : !tasks.data?.length ? (
        <Text c="dimmed">Задач пока нет</Text>
      ) : (
        <Table.ScrollContainer minWidth={480}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Задача</Table.Th>
                <Table.Th>Статус</Table.Th>
                <Table.Th>Исполнитель</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tasks.data.map((t) => (
                <Table.Tr key={t.id}>
                  <Table.Td>
                    <Anchor component={Link} to={`/tasks/${t.id}`}>
                      {t.title}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge code={t.status} label={t.task_statuses.label} />
                  </Table.Td>
                  <Table.Td>{t.assignee.full_name}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <ObjectForm opened={isEditing} onClose={() => setIsEditing(false)} onSaved={object.reload} object={o} />
      <DeleteObject
        opened={isDeleting}
        onClose={() => setIsDeleting(false)}
        object={o}
        taskCount={tasks.data?.length ?? 0}
      />
    </Stack>
  )
}

type DeleteProps = { opened: boolean; onClose: () => void; object: Pick<CrmObject, 'id' | 'name'>; taskCount: number }

function DeleteObject({ opened, onClose, object, taskCount }: DeleteProps) {
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const [isBusy, setIsBusy] = useState(false)

  async function remove() {
    setIsBusy(true)
    const { error } = await supabase.from('objects').delete().eq('id', object.id)
    setIsBusy(false)
    if (error) return setError(error.message)
    navigate('/objects')
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Удалить объект?">
      <Stack>
        <Text>
          Объект «{object.name}» будет удалён вместе с задачами ({taskCount}) и их историей. Отменить это нельзя.
        </Text>
        {error && <Alert color="red">{error}</Alert>}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button color="red" loading={isBusy} onClick={remove}>
            Удалить
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
