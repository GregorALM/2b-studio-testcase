import { Alert, Button, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core'
import { useState, type FormEvent } from 'react'
import { supabase } from './supabase'
import type { Task } from './types'
import { useLoad } from './useLoad'

type TaskFields = Pick<Task, 'id' | 'title' | 'description' | 'object_id' | 'assignee_id' | 'status'>
type Props = {
  opened: boolean
  onClose: () => void
  onSaved: (id: string) => void
  /** правка существующей задачи */
  task?: TaskFields
  /** объект по умолчанию для новой задачи */
  objectId?: string
}

/** Создание задачи или правка существующей (если передан task). */
export function TaskForm({ opened, onClose, onSaved, task, objectId }: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title={task ? 'Изменить задачу' : 'Новая задача'} size="lg">
      {/* Modal размонтирует содержимое при закрытии — форма каждый раз открывается с исходными значениями */}
      <Fields task={task} objectId={objectId} onCancel={onClose} onSaved={(id) => (onClose(), onSaved(id))} />
    </Modal>
  )
}

function Fields({ task, objectId, onCancel, onSaved }: Pick<Props, 'task' | 'objectId'> & { onCancel: () => void; onSaved: (id: string) => void }) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(task?.object_id ?? objectId ?? null)
  const [assigneeId, setAssigneeId] = useState<string | null>(task?.assignee_id ?? null)
  const [error, setError] = useState<string>()
  const [isBusy, setIsBusy] = useState(false)

  const objects = useLoad(() => supabase.from('objects').select('id, name').order('name'), [])
  const executors = useLoad(() => supabase.from('profiles').select('id, full_name').eq('role', 'executor').order('full_name'), [])
  const isReassigning = !!task && task.status !== 'new' && assigneeId !== task.assignee_id

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Укажите название')
    if (!selectedObjectId || !assigneeId) return setError('Выберите объект и исполнителя')
    const row = { title: title.trim(), description: description.trim(), object_id: selectedObjectId, assignee_id: assigneeId }
    setIsBusy(true)
    const { data, error } = task
      ? await supabase.from('tasks').update(row).eq('id', task.id).select('id').single()
      : await supabase.from('tasks').insert(row).select('id').single()
    setIsBusy(false)
    if (error) return setError(error.message)
    onSaved(data.id)
  }

  return (
    <form onSubmit={submit}>
      <Stack>
        <TextInput label="Название" required data-autofocus value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
        <Textarea label="Описание" autosize minRows={3} value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
        <Select
          label="Объект"
          required
          searchable
          allowDeselect={false}
          data={objects.data?.map((o) => ({ value: o.id, label: o.name })) ?? []}
          value={selectedObjectId}
          onChange={setSelectedObjectId}
        />
        <Select
          label="Исполнитель"
          required
          searchable
          allowDeselect={false}
          data={executors.data?.map((p) => ({ value: p.id, label: p.full_name })) ?? []}
          value={assigneeId}
          onChange={setAssigneeId}
        />
        {isReassigning && <Alert color="yellow">При смене исполнителя задача вернётся в статус «Новая».</Alert>}
        {(error || objects.error || executors.error) && <Alert color="red">{error ?? objects.error ?? executors.error}</Alert>}
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit" loading={isBusy}>
            Сохранить
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
