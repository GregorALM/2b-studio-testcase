import { Anchor, AppShell, Button, Container, Group, Text } from '@mantine/core'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { roleLabel, useMe } from './auth'
import { supabase } from './supabase'

export function Layout({ children }: { children: ReactNode }) {
  const me = useMe()
  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="lg" wrap="nowrap">
            <Text fw={700} visibleFrom="xs">
              Объекты и задачи
            </Text>
            <Anchor component={NavLink} to="/objects">
              Объекты
            </Anchor>
          </Group>
          <Group gap="sm" wrap="nowrap">
            <Text size="sm" c="dimmed" visibleFrom="sm">
              {me.full_name} · {roleLabel[me.role]}
            </Text>
            <Button variant="default" size="xs" onClick={() => supabase.auth.signOut()}>
              Выйти
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="lg" px={0}>
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
