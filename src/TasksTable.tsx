import { Anchor, Table } from '@mantine/core'
import { Link } from 'react-router'
import { StatusBadge } from './StatusBadge'

type Row = {
  id: string
  title: string
  status: string
  task_statuses: { label: string }
  assignee: { full_name: string }
  object?: { name: string }
}

type Props = { tasks: Row[]; showObject?: boolean; showAssignee?: boolean }

export function TasksTable({ tasks, showObject = false, showAssignee = true }: Props) {
  return (
    <Table.ScrollContainer minWidth={520}>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Задача</Table.Th>
            {showObject && <Table.Th>Объект</Table.Th>}
            <Table.Th>Статус</Table.Th>
            {showAssignee && <Table.Th>Исполнитель</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {tasks.map((t) => (
            <Table.Tr key={t.id}>
              <Table.Td>
                <Anchor component={Link} to={`/tasks/${t.id}`}>
                  {t.title}
                </Anchor>
              </Table.Td>
              {showObject && <Table.Td>{t.object?.name}</Table.Td>}
              <Table.Td>
                <StatusBadge code={t.status} label={t.task_statuses.label} />
              </Table.Td>
              {showAssignee && <Table.Td>{t.assignee.full_name}</Table.Td>}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
