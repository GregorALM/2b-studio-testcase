import { Alert, Anchor, Button, Group, Loader, Paper, SimpleGrid, Stack, Text, Textarea, Title } from '@mantine/core'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMe } from '../auth'
import { ConfirmModal } from '../ConfirmModal'
import { StatusBadge, statusColor } from '../StatusBadge'
import { supabase } from '../supabase'
import { TaskForm } from '../TaskForm'
import { TaskHistory } from '../TaskHistory'
import { availableTransitions } from '../transitions'
import { useLoad } from '../useLoad'

export function TaskPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const isManager = me.role === 'manager'
  const navigate = useNavigate()

  const task = useLoad(
    () =>
      supabase
        .from('tasks')
        .select(
          'id, title, description, status, object_id, assignee_id, created_at, object:objects(name), assignee:profiles!assignee_id(full_name), author:profiles!author_id(full_name), task_statuses(label, is_final)',
        )
        .eq('id', id)
        .maybeSingle(),
    [id],
  )
  const transitions = useLoad(
    () => supabase.from('task_transitions').select('from_status, to_status, label, actor, comment_required, target:task_statuses!to_status(is_final)'),
    [],
  )
  const [historyVersion, setHistoryVersion] = useState(0)
  const [comment, setComment] = useState('')
  const [actionError, setActionError] = useState<string>()
  const [pendingStatus, setPendingStatus] = useState<string>()
  const [confirmingStatus, setConfirmingStatus] = useState<string>()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (task.isLoading || transitions.isLoading) return <Loader />
  if (task.error || transitions.error) return <Alert color="red">{task.error ?? transitions.error}</Alert>
  if (!task.data)
    return (
      <Stack>
        <Text>Задача не найдена или у вас нет к ней доступа</Text>
        <Anchor component={Link} to="/objects">
          К объектам
        </Anchor>
      </Stack>
    )

  const t = task.data
  const actions = availableTransitions(transitions.data ?? [], t, me)

  async function move(to: string): Promise<string | undefined> {
    const action = actions.find((a) => a.to_status === to)
    const note = comment.trim()
    if (action?.comment_required && !note) return 'Для такой смены статуса нужен комментарий'
    const { error } = await supabase.rpc('change_task_status', { p_task_id: t.id, p_to_status: to, p_comment: note || undefined })
    if (error) return error.message
    setComment('')
    task.reload()
    setHistoryVersion((v) => v + 1)
  }

  async function onAction(to: string, isFinal: boolean) {
    setActionError(undefined)
    // в финальный статус — только после подтверждения: вернуть задачу оттуда нельзя
    if (isFinal) return setConfirmingStatus(to)
    setPendingStatus(to)
    setActionError(await move(to))
    setPendingStatus(undefined)
  }

  const confirming = actions.find((a) => a.to_status === confirmingStatus)
  const needComment = actions.filter((a) => a.comment_required).map((a) => `«${a.label}»`)

  return (
    <Stack>
      <Anchor component={Link} to={`/objects/${t.object_id}`} size="sm">
        ← {t.object.name}
      </Anchor>

      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2}>{t.title}</Title>
          <Group>
            <StatusBadge code={t.status} label={t.task_statuses.label} />
          </Group>
        </Stack>
        {isManager && (
          <Group gap="xs">
            {!t.task_statuses.is_final && (
              <Button variant="default" onClick={() => setIsEditing(true)}>
                Изменить
              </Button>
            )}
            <Button variant="light" color="red" onClick={() => setIsDeleting(true)}>
              Удалить
            </Button>
          </Group>
        )}
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Field label="Исполнитель" value={t.assignee.full_name} />
        <Field label="Постановщик" value={t.author.full_name} />
        <Field label="Создана" value={new Date(t.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })} />
      </SimpleGrid>
      {t.description && <Text style={{ whiteSpace: 'pre-wrap' }}>{t.description}</Text>}

      {actions.length > 0 && (
        <Paper withBorder p="md">
          <Stack>
            <Textarea
              label="Комментарий"
              description={needComment.length ? `Обязателен для ${needComment.join(', ')}` : 'Необязательно'}
              autosize
              minRows={2}
              value={comment}
              onChange={(e) => setComment(e.currentTarget.value)}
            />
            {actionError && <Alert color="red">{actionError}</Alert>}
            <Group>
              {actions.map((a) => (
                <Button
                  key={a.to_status}
                  color={statusColor(a.to_status)}
                  loading={pendingStatus === a.to_status}
                  disabled={!!pendingStatus && pendingStatus !== a.to_status}
                  onClick={() => onAction(a.to_status, a.target.is_final)}
                >
                  {a.label}
                </Button>
              ))}
            </Group>
          </Stack>
        </Paper>
      )}

      <Title order={3}>История</Title>
      <TaskHistory taskId={t.id} version={historyVersion} />

      <TaskForm
        opened={isEditing}
        onClose={() => setIsEditing(false)}
        onSaved={() => (task.reload(), setHistoryVersion((v) => v + 1))}
        task={t}
      />
      <ConfirmModal
        opened={!!confirming}
        onClose={() => setConfirmingStatus(undefined)}
        title={`${confirming?.label}?`}
        confirmLabel={confirming?.label ?? ''}
        color={statusColor(confirmingStatus ?? '')}
        onConfirm={async () => {
          const error = await move(confirmingStatus ?? '')
          if (!error) setConfirmingStatus(undefined)
          return error
        }}
      >
        После этого задачу нельзя будет изменить или вернуть в работу.
      </ConfirmModal>
      <ConfirmModal
        opened={isDeleting}
        onClose={() => setIsDeleting(false)}
        title="Удалить задачу?"
        confirmLabel="Удалить"
        onConfirm={async () => {
          const { error } = await supabase.from('tasks').delete().eq('id', t.id)
          if (error) return error.message
          navigate(`/objects/${t.object_id}`)
        }}
      >
        Задача «{t.title}» будет удалена вместе с историей. Отменить это нельзя.
      </ConfirmModal>
    </Stack>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text>{value}</Text>
    </div>
  )
}
