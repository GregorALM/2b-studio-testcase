// Типы сущностей приложения. Строятся из src/database.types.ts (npm run gen:types), руками тот файл не правим
import type { Enums, Tables } from './database.types'

export type Role = Enums<'user_role'>
export type Profile = Tables<'profiles'>
export type CrmObject = Tables<'objects'>
export type Task = Tables<'tasks'>
export type Transition = Tables<'task_transitions'>

/** Правки полей в task_history.changes: имена объекта и исполнителя — на момент правки */
export type FieldChanges = Partial<Record<'title' | 'description' | 'object' | 'assignee', { old: string | null; new: string | null }>>
