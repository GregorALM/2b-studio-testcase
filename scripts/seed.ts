// Демо-данные: пересоздаёт демо-пользователей, объекты и задачи.
// Статусы двигаются через change_task_status от имени настоящих пользователей,
// поэтому история такая же, как при работе через интерфейс.
//
//   npm run seed             — локальный Supabase
//   npm run seed -- --cloud  — облачный проект из .env
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { localSupabase } from './local-supabase.ts'

function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Не задана переменная ${name} в .env`)
  return value
}

const cloud = process.argv.includes('--cloud')
const { url, publishableKey, secretKey } = cloud
  ? { url: env('VITE_SUPABASE_URL'), publishableKey: env('VITE_SUPABASE_PUBLISHABLE_KEY'), secretKey: env('SUPABASE_SECRET_KEY') }
  : localSupabase()
const password = env('DEMO_PASSWORD')
if (password.length < 8) throw new Error('DEMO_PASSWORD должен быть не короче 8 символов')

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(url, secretKey, opts)

async function must<T>(query: PromiseLike<{ data: T; error: null } | { error: Error }>): Promise<T> {
  const result = await query
  if (result.error) throw result.error
  return result.data
}

const people = [
  { email: 'manager@crm.test', name: 'Анна Смирнова', role: 'manager' },
  { email: 'executor1@crm.test', name: 'Иван Петров', role: 'executor' },
  { email: 'executor2@crm.test', name: 'Сергей Кузнецов', role: 'executor' },
] as const

type Person = { id: string; client: SupabaseClient }

// Сначала очистка: объекты каскадом удаляют задачи и историю, после этого можно удалить пользователей
await must(admin.from('objects').delete().not('id', 'is', null))
const { users } = await must(admin.auth.admin.listUsers({ perPage: 1000 }))
for (const user of users.filter((u) => people.some((p) => p.email === u.email))) {
  await must(admin.auth.admin.deleteUser(user.id))
}

async function addPerson(p: (typeof people)[number]): Promise<Person> {
  const { user } = await must(
    admin.auth.admin.createUser({ email: p.email, password, email_confirm: true, user_metadata: { full_name: p.name } }),
  )
  if (p.role === 'manager') await must(admin.from('profiles').update({ role: 'manager' }).eq('id', user.id))
  const client = createClient(url, publishableKey, opts)
  await must(client.auth.signInWithPassword({ email: p.email, password }))
  return { id: user.id, client }
}

const [manager, ivan, sergey] = await Promise.all(people.map(addPerson))

async function object(name: string, address: string): Promise<string> {
  return (await must(manager.client.from('objects').insert({ name, address }).select('id').single())).id
}

async function task(objectId: string, title: string, description: string, assignee: Person): Promise<string> {
  const row = await must(
    manager.client.from('tasks').insert({ object_id: objectId, title, description, assignee_id: assignee.id }).select('id').single(),
  )
  return row.id
}

const move = (who: Person, taskId: string, to: string, comment?: string) =>
  must(who.client.rpc('change_task_status', { p_task_id: taskId, p_to_status: to, p_comment: comment }))

const north = await object('ЖК «Северный», корпус 2', 'г. Москва, ул. Лесная, 12')
const office = await object('Офис на Тверской', 'г. Москва, ул. Тверская, 8, офис 305')
// только с задачами Сергея: Иван этот объект не видит
const warehouse = await object('Склад в Химках', 'г. Химки, Ленинградское ш., 45')

// Принята
let t = await task(north, 'Залить фундамент', 'Бетон М300, после заливки — уход 7 дней', ivan)
await move(ivan, t, 'in_progress')
await move(ivan, t, 'review', 'Залито, фото в общем чате')
await move(manager, t, 'accepted')

// В работе после возврата на доработку
t = await task(north, 'Смонтировать опалубку 2 этажа', 'По проекту КЖ-2', ivan)
await move(ivan, t, 'in_progress')
await move(ivan, t, 'review')
await move(manager, t, 'rework', 'Не выдержан шаг стоек, переставить по проекту')
await move(ivan, t, 'in_progress')

// Новая
await task(north, 'Проложить электрику в подвале', 'По схеме ЭО-3', sergey)

// На проверке
t = await task(office, 'Демонтаж перегородок', 'Кабинеты 301–303', sergey)
await move(sergey, t, 'in_progress')
await move(sergey, t, 'review')

// На доработке
t = await task(office, 'Покраска стен в переговорной', 'Цвет RAL 9010, два слоя', ivan)
await move(ivan, t, 'in_progress')
await move(ivan, t, 'review')
await move(manager, t, 'rework', 'Видны полосы у окна, нужен третий слой')

// Правка полей и смена исполнителя: статус сбрасывается в «Новая», в истории — было → стало
t = await task(office, 'Заменить светильники', '', ivan)
await move(ivan, t, 'in_progress')
await must(
  manager.client
    .from('tasks')
    .update({ title: 'Заменить светильники на LED', description: '12 шт., панели 600×600', assignee_id: sergey.id })
    .eq('id', t),
)

t = await task(warehouse, 'Устройство наливного пола', 'Площадь 400 м²', sergey)
await move(sergey, t, 'in_progress')

// Самопроверка: в демо есть задачи в каждом статусе
const statuses = await must(admin.from('task_statuses').select('code, label'))
const used = new Set((await must(admin.from('tasks').select('status'))).map((r) => r.status))
const missing = statuses.filter((s) => !used.has(s.code))
if (missing.length) throw new Error(`Нет задач в статусах: ${missing.map((s) => s.label).join(', ')}`)

console.log(`Демо-данные загружены: ${url}`)
console.table(people.map((p) => ({ email: p.email, имя: p.name, роль: p.role === 'manager' ? 'постановщик' : 'исполнитель' })))
console.log('Пароль у всех — DEMO_PASSWORD из .env')
