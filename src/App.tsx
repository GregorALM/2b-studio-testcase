import { Anchor, Stack, Text } from '@mantine/core'
import { Link, Navigate, Route, Routes } from 'react-router'
import { AuthGate } from './auth'
import { Layout } from './Layout'
import { ObjectPage } from './pages/ObjectPage'
import { ObjectsPage } from './pages/ObjectsPage'

export function App() {
  return (
    <AuthGate>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/objects" replace />} />
          <Route path="/objects" element={<ObjectsPage />} />
          <Route path="/objects/:id" element={<ObjectPage />} />
          <Route
            path="*"
            element={
              <Stack>
                <Text>Страница не найдена</Text>
                <Anchor component={Link} to="/objects">
                  К объектам
                </Anchor>
              </Stack>
            }
          />
        </Routes>
      </Layout>
    </AuthGate>
  )
}
