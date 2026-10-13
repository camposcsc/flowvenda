import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Login() {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')

    if (!usuario.trim() || !senha.trim()) {
      setErro('Preencha usuário e senha.')
      return
    }

    setCarregando(true)

    // Transforma o nome de usuário em um e-mail interno (não visível ao usuário)
    const emailFake = `${usuario.trim().toLowerCase()}@flowvenda.local`

    const { error } = await supabase.auth.signInWithPassword({
      email: emailFake,
      password: senha,
    })

    setCarregando(false)

    if (error) {
      setErro('Usuário ou senha inválidos.')
      return
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl mb-3">
            F
          </div>
          <h1 className="font-bold text-gray-800 text-lg leading-none">flowvenda</h1>
          <span className="text-xs text-gray-400 mt-1">GESTÃO COMERCIAL</span>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Usuário
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Digite seu usuário"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Digite sua senha"
            />
          </div>

          {erro && (
            <p className="text-red-500 text-sm text-center">{erro}</p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg py-2 mt-2 transition disabled:opacity-60"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login