// Проверка правил доступа в обход интерфейса: каждый тест ходит в Supabase
// под конкретным пользователем, как это мог бы сделать любой с публичным ключом.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { admin, anon, createUser, type User } from './helpers'

let manager: User
let execA: User
let execB: User
let objectId: string
const objectIds: string[] = []

async function newObject(name = 'ЖК Тестовый') {
  const { data, error } = await manager.client
    .from('objects')
    .insert({ name, address: 'ул. Проверочная, 1' })
    .select()
    .single()
  if (error) throw error
  objectIds.push(data.id)
  return data.id as string
}

async function newTask(assignee: User = execA, object = objectId) {
  const { data, error } = await manager.client
    .from('tasks')
    .insert({ object_id: object, title: 'Залить фундамент', assignee_id: assignee.id })
    .select()
    .single()
  if (error) throw error
  return data as { id: string; status: string; author_id: string }
}

const move = (u: User, taskId: string, to: string, comment?: string) =>
  u.client.rpc('change_task_status', { p_task_id: taskId, p_to_status: to, p_comment: comment })

async function moveOk(u: User, taskId: string, to: string, comment?: string) {
  const { error } = await move(u, taskId, to, comment)
  expect(error, `${u.name}: → ${to}`).toBeNull()
}

async function adminTask(taskId: string) {
  const { data } = await admin.from('tasks').select('*').eq('id', taskId).maybeSingle()
  return data
}

async function adminHistory(taskId: string) {
  const { data, error } = await admin.from('task_history').select('*').eq('task_id', taskId).order('id')
  if (error) throw error
  return data
}

beforeAll(async () => {
  ;[manager, execA, execB] = await Promise.all([
    createUser('manager', 'Постановщик'),
    createUser('executor', 'Исполнитель А'),
    createUser('executor', 'Исполнитель Б'),
  ])
  objectId = await newObject()
})

afterAll(async () => {
  // каскадом удалятся задачи и их история
  if (objectIds.length) await admin.from('objects').delete().in('id', objectIds)
  await Promise.all([manager, execA, execB].filter(Boolean).map((u) => admin.auth.admin.deleteUser(u.id)))
})

describe('без входа', () => {
  it.each(['objects', 'tasks', 'task_history', 'profiles'])('аноним не читает %s', async (table) => {
    const { data, error } = await anon().from(table).select()
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  it('аноним не вызывает смену статуса', async () => {
    const task = await newTask()
    const { error } = await anon().rpc('change_task_status', { p_task_id: task.id, p_to_status: 'in_progress' })
    expect(error).not.toBeNull()
    expect((await adminTask(task.id))?.status).toBe('new')
  })

  it('открытая регистрация отключена', async () => {
    const { data, error } = await anon().auth.signUp({ email: `new-${crypto.randomUUID()}@test.local`, password: 'password-123' })
    expect(error).not.toBeNull()
    expect(data.user).toBeNull()
  })
})

describe('создание', () => {
  it('постановщик создаёт задачу: статус «Новая», автор — он, в истории запись создания', async () => {
    const task = await newTask()
    expect(task.status).toBe('new')
    expect(task.author_id).toBe(manager.id)
    const history = await adminHistory(task.id)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ from_status: null, to_status: 'new', changed_by: manager.id, changes: null })
  })

  it('при создании нельзя задать статус или чужого автора', async () => {
    const base = { object_id: objectId, title: 'Подделка', assignee_id: execA.id }
    const withStatus = await manager.client.from('tasks').insert({ ...base, status: 'accepted' })
    expect(withStatus.error).not.toBeNull()
    const withAuthor = await manager.client.from('tasks').insert({ ...base, author_id: execA.id })
    expect(withAuthor.error).not.toBeNull()
  })

  it('исполнитель не создаёт объекты и задачи', async () => {
    const obj = await execA.client.from('objects').insert({ name: 'Свой объект' })
    expect(obj.error).not.toBeNull()
    const task = await execA.client.from('tasks').insert({ object_id: objectId, title: 'Своя задача', assignee_id: execA.id })
    expect(task.error).not.toBeNull()
  })

  it('исполнителем нельзя назначить постановщика', async () => {
    const { error } = await manager.client
      .from('tasks')
      .insert({ object_id: objectId, title: 'Себе', assignee_id: manager.id })
    expect(error?.message).toMatch(/исполнитель/)
  })
})

describe('видимость', () => {
  it('исполнитель видит свою задачу, её объект и историю', async () => {
    const task = await newTask(execA)
    expect((await execA.client.from('tasks').select().eq('id', task.id)).data).toHaveLength(1)
    expect((await execA.client.from('objects').select().eq('id', objectId)).data).toHaveLength(1)
    expect((await execA.client.from('task_history').select().eq('task_id', task.id)).data).toHaveLength(1)
  })

  it('чужая задача, её объект и история для исполнителя не существуют', async () => {
    const obj = await newObject('ЖК Чужой')
    const task = await newTask(execA, obj)
    expect((await execB.client.from('tasks').select().eq('id', task.id)).data).toEqual([])
    expect((await execB.client.from('objects').select().eq('id', obj)).data).toEqual([])
    expect((await execB.client.from('task_history').select().eq('task_id', task.id)).data).toEqual([])
    const { error } = await move(execB, task.id, 'in_progress')
    expect(error?.message).toMatch(/не найдена/)
  })

  it('постановщик видит все задачи', async () => {
    const task = await newTask(execB)
    expect((await manager.client.from('tasks').select().eq('id', task.id)).data).toHaveLength(1)
  })
})

describe('переходы статусов', () => {
  it('полный цикл с возвратом на доработку, каждый шаг в истории', async () => {
    const task = await newTask(execA)
    await moveOk(execA, task.id, 'in_progress')
    await moveOk(execA, task.id, 'review')

    const noComment = await move(manager, task.id, 'rework')
    expect(noComment.error?.message).toMatch(/комментарий/)
    const blankComment = await move(manager, task.id, 'rework', '   ')
    expect(blankComment.error?.message).toMatch(/комментарий/)
    expect((await adminTask(task.id))?.status).toBe('review')

    await moveOk(manager, task.id, 'rework', 'Переделать опалубку')
    await moveOk(execA, task.id, 'in_progress')
    await moveOk(execA, task.id, 'review')
    await moveOk(manager, task.id, 'accepted')

    const history = await adminHistory(task.id)
    expect(history.map((h) => [h.from_status, h.to_status, h.changed_by])).toEqual([
      [null, 'new', manager.id],
      ['new', 'in_progress', execA.id],
      ['in_progress', 'review', execA.id],
      ['review', 'rework', manager.id],
      ['rework', 'in_progress', execA.id],
      ['in_progress', 'review', execA.id],
      ['review', 'accepted', manager.id],
    ])
    expect(history[3].comment).toBe('Переделать опалубку')
  })

  it('запрещённые переходы не проходят', async () => {
    const task = await newTask(execA)
    expect((await move(execA, task.id, 'accepted')).error).not.toBeNull() // нет такого перехода
    expect((await move(execA, task.id, 'review')).error).not.toBeNull() // перескок через статус
    expect((await move(manager, task.id, 'in_progress')).error?.message).toMatch(/только назначенному исполнителю/) // чужая роль
    expect((await move(execA, task.id, 'nonexistent')).error).not.toBeNull()

    await moveOk(execA, task.id, 'in_progress')
    await moveOk(execA, task.id, 'review')
    expect((await move(execA, task.id, 'accepted')).error?.message).toMatch(/только постановщику/)

    expect((await adminTask(task.id))?.status).toBe('review')
    expect(await adminHistory(task.id)).toHaveLength(3)
  })

  it('статус нельзя поменять обычным UPDATE — ни постановщику, ни исполнителю', async () => {
    const task = await newTask(execA)
    expect((await manager.client.from('tasks').update({ status: 'accepted' }).eq('id', task.id)).error).not.toBeNull()
    expect((await execA.client.from('tasks').update({ status: 'in_progress' }).eq('id', task.id)).error).not.toBeNull()
    expect((await adminTask(task.id))?.status).toBe('new')
  })
})

describe('правка задач', () => {
  it('исполнитель не может править задачу', async () => {
    const task = await newTask(execA)
    const { data } = await execA.client.from('tasks').update({ title: 'Взломано' }).eq('id', task.id).select()
    expect(data ?? []).toEqual([])
    expect((await adminTask(task.id))?.title).toBe('Залить фундамент')
  })

  it('правка постановщиком пишется в историю: было → стало', async () => {
    const task = await newTask(execA)
    const { error } = await manager.client.from('tasks').update({ title: 'Залить фундамент секции 2' }).eq('id', task.id)
    expect(error).toBeNull()
    const last = (await adminHistory(task.id)).at(-1)
    expect(last).toMatchObject({
      changed_by: manager.id,
      from_status: null,
      to_status: null,
      changes: { title: { old: 'Залить фундамент', new: 'Залить фундамент секции 2' } },
    })
  })

  it('смена исполнителя сбрасывает статус в «Новая», доступ переходит к новому исполнителю', async () => {
    const task = await newTask(execA)
    await moveOk(execA, task.id, 'in_progress')

    const { error } = await manager.client.from('tasks').update({ assignee_id: execB.id }).eq('id', task.id)
    expect(error).toBeNull()

    expect((await adminTask(task.id))?.status).toBe('new')
    const last = (await adminHistory(task.id)).at(-1)
    expect(last).toMatchObject({
      from_status: 'in_progress',
      to_status: 'new',
      changes: { assignee: { old: 'Исполнитель А', new: 'Исполнитель Б' } },
    })
    expect((await execA.client.from('tasks').select().eq('id', task.id)).data).toEqual([])
    expect((await execB.client.from('tasks').select().eq('id', task.id)).data).toHaveLength(1)
    await moveOk(execB, task.id, 'in_progress')
  })

  it('принятую задачу нельзя править, но можно удалить вместе с историей', async () => {
    const task = await newTask(execA)
    await moveOk(execA, task.id, 'in_progress')
    await moveOk(execA, task.id, 'review')
    await moveOk(manager, task.id, 'accepted')

    const { data } = await manager.client.from('tasks').update({ title: 'Поздняя правка' }).eq('id', task.id).select()
    expect(data ?? []).toEqual([])
    expect((await adminTask(task.id))?.title).toBe('Залить фундамент')

    expect((await manager.client.from('tasks').delete().eq('id', task.id)).error).toBeNull()
    expect(await adminTask(task.id)).toBeNull()
    expect(await adminHistory(task.id)).toEqual([])
  })

  it('исполнитель не может удалить задачу', async () => {
    const task = await newTask(execA)
    await execA.client.from('tasks').delete().eq('id', task.id)
    expect(await adminTask(task.id)).not.toBeNull()
  })
})

describe('история', () => {
  it('историю нельзя подделать, изменить или удалить — никому', async () => {
    const task = await newTask(execA)
    await moveOk(execA, task.id, 'in_progress')
    const before = await adminHistory(task.id)

    for (const u of [manager, execA]) {
      const fake = { task_id: task.id, changed_by: u.id, from_status: 'review', to_status: 'accepted' }
      expect((await u.client.from('task_history').insert(fake)).error, `${u.name}: insert`).not.toBeNull()
      expect((await u.client.from('task_history').update({ comment: 'подделка' }).eq('task_id', task.id)).error, `${u.name}: update`).not.toBeNull()
      expect((await u.client.from('task_history').delete().eq('task_id', task.id)).error, `${u.name}: delete`).not.toBeNull()
    }

    expect(await adminHistory(task.id)).toEqual(before)
  })

  it('удаление объекта удаляет его задачи и их историю', async () => {
    const obj = await newObject('ЖК Под снос')
    const task = await newTask(execA, obj)
    expect((await manager.client.from('objects').delete().eq('id', obj)).error).toBeNull()
    expect(await adminTask(task.id)).toBeNull()
    expect(await adminHistory(task.id)).toEqual([])
  })
})

describe('профили', () => {
  it('нельзя выдать себе роль постановщика', async () => {
    await execA.client.from('profiles').update({ role: 'manager' }).eq('id', execA.id)
    const { data } = await admin.from('profiles').select('role').eq('id', execA.id).single()
    expect(data?.role).toBe('executor')
  })

  it('email не попадает в профиль, даже если имя не задано', async () => {
    const created = await admin.auth.admin.createUser({
      email: `noname-${crypto.randomUUID()}@test.local`,
      password: 'test-password-123',
      email_confirm: true,
    })
    if (created.error) throw created.error
    const id = created.data.user.id
    try {
      const { data } = await execA.client.from('profiles').select('*').eq('id', id).single()
      expect(data).toEqual({ id, full_name: 'Новый пользователь', role: 'executor' })
    } finally {
      await admin.auth.admin.deleteUser(id)
    }
  })

  it('исполнитель не правит объекты', async () => {
    const { data } = await execA.client.from('objects').update({ name: 'Переименовано' }).eq('id', objectId).select()
    expect(data ?? []).toEqual([])
  })
})
