// Типы сущностей приложения. Строятся из src/database.types.ts (npm run gen:types), руками тот файл не правим
import type { Enums, Tables } from './database.types'

export type Role = Enums<'user_role'>
export type Profile = Tables<'profiles'>
export type CrmObject = Tables<'objects'>
