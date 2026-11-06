import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import { useState, type FormEvent } from 'react'
import { supabase } from './supabase'
import type { CrmObject } from './types'

type ObjectFields = Pick<CrmObject, 'id' | 'name' | 'address'>
type Props = { opened: boolean; onClose: () => void; onSaved: (id: string) => void; object?: ObjectFields }

/** Создание объекта или правка существующего (если передан object). */
export function ObjectForm({ opened, onClose, onSaved, object }: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title={object ? 'Изменить объект' : 'Новый объект'}>
      {/* Modal размонтирует содержимое при закрытии — форма каждый раз открывается с исходными значениями */}
      <Fields object={object} onCancel={onClose} onSaved={(id) => (onClose(), onSaved(id))} />
    </Modal>
  )
}

function Fields({ object, onCancel, onSaved }: { object?: ObjectFields; onCancel: () => void; onSaved: (id: string) => void }) {
  const [name, setName] = useState(object?.name ?? '')
  const [address, setAddress] = useState(object?.address ?? '')
  const [error, setError] = useState<string>()
  const [isBusy, setIsBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const values = { name: name.trim(), address: address.trim() }
    if (!values.name) return setError('Укажите название')
    setIsBusy(true)
    const { data, error } = object
      ? await supabase.from('objects').update(values).eq('id', object.id).select('id').single()
      : await supabase.from('objects').insert(values).select('id').single()
    setIsBusy(false)
    if (error) return setError(error.message)
    onSaved(data.id)
  }

  return (
    <form onSubmit={submit}>
      <Stack>
        <TextInput label="Название" required data-autofocus value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <TextInput label="Адрес" value={address} onChange={(e) => setAddress(e.currentTarget.value)} />
        {error && <Alert color="red">{error}</Alert>}
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
