import { Alert, Anchor, Button, Group, Loader, Stack, Table, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMe } from '../auth'
import { ObjectForm } from '../ObjectForm'
import { supabase } from '../supabase'
import { useLoad } from '../useLoad'

export function ObjectsPage() {
  const isManager = useMe().role === 'manager'
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  // исполнителю RLS вернёт только объекты с его задачами, а count — только его задачи
  const objects = useLoad(() => supabase.from('objects').select('id, name, address, tasks(count)').order('name'), [])

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Объекты</Title>
        {isManager && <Button onClick={() => setIsCreating(true)}>Добавить объект</Button>}
      </Group>

      {objects.error && <Alert color="red">{objects.error}</Alert>}
      {objects.isLoading ? (
        <Loader />
      ) : !objects.data?.length ? (
        <Text c="dimmed">{isManager ? 'Объектов пока нет' : 'У вас пока нет задач ни на одном объекте'}</Text>
      ) : (
        <Table.ScrollContainer minWidth={480}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Название</Table.Th>
                <Table.Th>Адрес</Table.Th>
                <Table.Th ta="right">{isManager ? 'Задач' : 'Моих задач'}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {objects.data.map((o) => (
                <Table.Tr key={o.id}>
                  <Table.Td>
                    <Anchor component={Link} to={`/objects/${o.id}`}>
                      {o.name}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>{o.address}</Table.Td>
                  <Table.Td ta="right">{o.tasks[0]?.count ?? 0}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <ObjectForm opened={isCreating} onClose={() => setIsCreating(false)} onSaved={(id) => navigate(`/objects/${id}`)} />
    </Stack>
  )
}
