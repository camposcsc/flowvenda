import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rlcwgjnxpgpwcwaurvip.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { id, authId } = req.body

  if (!id) {
    return res.status(400).json({ error: 'Usuário não identificado.' })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // Se existir o login vinculado, remove o login também
  if (authId) {
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authId)
    if (authError) {
      return res.status(400).json({ error: 'Erro ao excluir login: ' + authError.message })
    }
  }

  // Remove o registro da tabela "usuarios"
  const { error: dbError } = await supabaseAdmin.from('usuarios').delete().eq('id', id)

  if (dbError) {
    return res.status(400).json({ error: dbError.message })
  }

  return res.status(200).json({ success: true })
}