
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cwhmxpitwblqxgrvaigg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aG14cGl0d2JscXhncnZhaWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTc3MTIsImV4cCI6MjA2NjI5MzcxMn0.NaAtGg1Fpx1obdHK5rBGM5IzSWJea7lniuimr5ZyFGU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
})
