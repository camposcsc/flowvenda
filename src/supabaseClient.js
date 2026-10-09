import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rlcwgjnxpgpwcwaurvip.supabase.co'
const supabaseAnonKey = 'sb_publishable_11LTNTb18Wrk9Y3WVn3lmQ_ktC_yu2O'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)