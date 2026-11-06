import { Anchor, Stack, Text } from '@mantine/core'
import { Link, Navigate, Route, Routes } from 'react-router'
import { AuthGate, useMe } from './auth'
import { Layout } from './Layout'
import { MyTasksPage } from './pages/MyTasksPage'
import { ObjectPage } from './pages/ObjectPage'
import { ObjectsPage } from './pages/ObjectsPage'
import { TaskPage } from './pages/TaskPage'

// исполнитель начинает со своих задач, постановщик — с объектов
function Home() {
  return <Navigate to={useMe().role === 'manager' ? '/objects' : '/my'} replace />
}

export function App() {
  return (
    <AuthGate>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/objects" element={<ObjectsPage />} />
          <Route path="/objects/:id" element={<ObjectPage />} />
          <Route path="/tasks/:id" element={<TaskPage />} />
          <Route path="/my" element={<MyTasksPage />} />
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
