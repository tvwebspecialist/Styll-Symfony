// Auto-generated types from Supabase schema
// Run: npx supabase gen types typescript --project-id <id> > packages/db/src/database.types.ts
// Then: export * from './database.types'
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Placeholder — will be replaced by supabase gen types
export interface Database {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
