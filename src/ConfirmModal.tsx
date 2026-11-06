import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core'
import { useState, type ReactNode } from 'react'

type Props = {
  opened: boolean
  onClose: () => void
  title: string
  children: ReactNode
  confirmLabel: string
  color?: string
  /** Возвращает текст ошибки или ничего при успехе; закрыть окно после успеха — забота вызывающего */
  onConfirm: () => Promise<string | undefined>
}

export function ConfirmModal({ opened, onClose, title, ...rest }: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title={title}>
      <Body onCancel={onClose} {...rest} />
    </Modal>
  )
}

function Body({ onCancel, children, confirmLabel, color = 'red', onConfirm }: Omit<Props, 'opened' | 'onClose' | 'title'> & { onCancel: () => void }) {
  const [error, setError] = useState<string>()
  const [isBusy, setIsBusy] = useState(false)

  async function confirm() {
    setIsBusy(true)
    setError(await onConfirm())
    setIsBusy(false)
  }

  return (
    <Stack>
      <Text>{children}</Text>
      {error && <Alert color="red">{error}</Alert>}
      <Group justify="flex-end">
        <Button variant="default" onClick={onCancel}>
          Отмена
        </Button>
        <Button color={color} loading={isBusy} onClick={confirm}>
          {confirmLabel}
        </Button>
      </Group>
    </Stack>
  )
}
