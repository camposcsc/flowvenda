import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rlcwgjnxpgpwcwaurvip.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { nomeCompleto, nomeUsuario, senha } = req.body

  if (!nomeCompleto || !nomeUsuario || !senha) {
    return res.status(400).json({ error: 'Preencha todos os campos.' })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const emailFake = `${nomeUsuario.trim().toLowerCase()}@flowvenda.local`

  // Cria o usuário no sistema de autenticação (login)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: emailFake,
    password: senha,
    email_confirm: true,
  })

  if (authError) {
    return res.status(400).json({ error: authError.message })
  }

  // Salva também na tabela "usuarios" (para listar na tela)
  const { error: dbError } = await supabaseAdmin.from('usuarios').insert([
    {
      nome_completo: nomeCompleto,
      nome_usuario: nomeUsuario.trim().toLowerCase(),
    },
  ])

  if (dbError) {
    return res.status(400).json({ error: dbError.message })
  }

  return res.status(200).json({ success: true })
}