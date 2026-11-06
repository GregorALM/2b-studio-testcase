
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "objects": {
                  Row: {
                    "address": string,"created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string,"created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "address"?: string,"created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "full_name": string,"id": string,"role": Database["public"]['Enums']["user_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "full_name"?: string,"id": string,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Update: {
                    "full_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Relationships: [
                    
                  ]
                },"task_history": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"changes": Json | null,"comment": string | null,"from_status": string | null,"id": number,"task_id": string,"to_status": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"changes"?: Json | null,"comment"?: string | null,"from_status"?: string | null,"id"?: never,"task_id": string,"to_status"?: string | null
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"changes"?: Json | null,"comment"?: string | null,"from_status"?: string | null,"id"?: never,"task_id"?: string,"to_status"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_history_from_status_fkey"
      columns: ["from_status"]
isOneToOne: false
      referencedRelation: "task_statuses"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "task_history_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_history_to_status_fkey"
      columns: ["to_status"]
isOneToOne: false
      referencedRelation: "task_statuses"
      referencedColumns: ["code"]
    }
                  ]
                },"task_statuses": {
                  Row: {
                    "code": string,"is_final": boolean,"label": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"is_final"?: boolean,"label": string,"sort_order": number
                  }
                  Update: {
                    "code"?: string,"is_final"?: boolean,"label"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"task_transitions": {
                  Row: {
                    "actor": string,"comment_required": boolean,"from_status": string,"label": string,"to_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"comment_required"?: boolean,"from_status": string,"label": string,"to_status": string
                  }
                  Update: {
                    "actor"?: string,"comment_required"?: boolean,"from_status"?: string,"label"?: string,"to_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_transitions_from_status_fkey"
      columns: ["from_status"]
isOneToOne: false
      referencedRelation: "task_statuses"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "task_transitions_to_status_fkey"
      columns: ["to_status"]
isOneToOne: false
      referencedRelation: "task_statuses"
      referencedColumns: ["code"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assignee_id": string,"author_id": string,"created_at": string,"description": string,"id": string,"object_id": string,"status": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id": string,"author_id"?: string,"created_at"?: string,"description"?: string,"id"?: string,"object_id": string,"status"?: string,"title": string
                  }
                  Update: {
                    "assignee_id"?: string,"author_id"?: string,"created_at"?: string,"description"?: string,"id"?: string,"object_id"?: string,"status"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_object_id_fkey"
      columns: ["object_id"]
isOneToOne: false
      referencedRelation: "objects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_status_fkey"
      columns: ["status"]
isOneToOne: false
      referencedRelation: "task_statuses"
      referencedColumns: ["code"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "change_task_status":
{ Args: { "p_comment"?: string,"p_task_id": string,"p_to_status": string }; Returns: undefined
                           },
"is_manager":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           }
          }
          Enums: {
            "user_role": "manager"|"executor"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "user_role": ["manager", "executor"]
          }
        }
} as const
