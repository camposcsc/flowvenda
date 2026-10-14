import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useUsuario } from '../context/UsuarioContext'

function Usuarios() {
  const usuarioLogado = useUsuario()
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [excluindoId, setExcluindoId] = useState(null)

  const [nomeCompleto, setNomeCompleto] = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    buscarUsuarios()
  }, [])

  async function buscarUsuarios() {
    setCarregando(true)
    const { data } = await supabase.from('usuarios').select('*')
    setUsuarios(data || [])
    setCarregando(false)
  }

  function abrirModal() {
    setNomeCompleto('')
    setNomeUsuario('')
    setSenha('')
    setIsAdmin(false)
    setErro('')
    setModalAberto(true)
  }

  async function salvarUsuario(e) {
    e.preventDefault()
    setErro('')

    if (!nomeCompleto.trim() || !nomeUsuario.trim() || !senha.trim()) {
      setErro('Preencha todos os campos.')
      return
    }

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSalvando(true)

    try {
      const resposta = await fetch('/api/criar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeCompleto, nomeUsuario, senha, admin: isAdmin }),
      })

      const resultado = await resposta.json()

      if (!resposta.ok) {
        setErro(resultado.error || 'Erro ao criar usuário.')
        setSalvando(false)
        return
      }

      setModalAberto(false)
      buscarUsuarios()
    } catch (err) {
      setErro('Erro de conexão ao criar usuário.')
    }

    setSalvando(false)
  }

  async function excluirUsuario(u) {
    if (u.id === usuarioLogado?.id) {
      alert('Você não pode excluir o seu próprio usuário.')
      return
    }

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir o usuário "${u.nome_completo}"? Essa ação não pode ser desfeita.`
    )
    if (!confirmar) return

    setExcluindoId(u.id)

    try {
      const resposta = await fetch('/api/excluir-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, authId: u.auth_id || null }),
      })

      const resultado = await resposta.json()

      if (!resposta.ok) {
        alert(resultado.error || 'Erro ao excluir usuário.')
        setExcluindoId(null)
        return
      }

      buscarUsuarios()
    } catch (err) {
      alert('Erro de conexão ao excluir usuário.')
    }

    setExcluindoId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Usuários</h1>
        <button
          onClick={abrirModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition"
        >
          + Novo usuário
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-6 py-3 font-medium">Nome completo</th>
              <th className="px-6 py-3 font-medium">Usuário (login)</th>
              <th className="px-6 py-3 font-medium">Tipo</th>
              {usuarioLogado?.admin && (
                <th className="px-6 py-3 font-medium">Ações</th>
              )}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-gray-400">
                  Nenhum usuário cadastrado ainda.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-6 py-3 text-gray-700">{u.nome_completo}</td>
                  <td className="px-6 py-3 text-gray-700">{u.nome_usuario}</td>
                  <td className="px-6 py-3">
                    {u.admin ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        Administrador
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Normal
                      </span>
                    )}
                  </td>
                  {usuarioLogado?.admin && (
                    <td className="px-6 py-3">
                      {u.id !== usuarioLogado?.id && (
                        <button
                          onClick={() => excluirUsuario(u)}
                          disabled={excluindoId === u.id}
                          className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                        >
                          {excluindoId === u.id ? 'Excluindo...' : '🗑 Excluir'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Novo usuário</h2>

            <form onSubmit={salvarUsuario} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500"
                  placeholder="Ex: Mariana Souza"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Usuário (para login)
                </label>
                <input
                  type="text"
                  value={nomeUsuario}
                  onChange={(e) => setNomeUsuario(e.target.value.replace(/\s/g, ''))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500"
                  placeholder="Ex: mariana (sem espaços)"
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
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600"
                />
                Este usuário é administrador?
              </label>
              <p className="text-xs text-gray-400 -mt-3">
                Administradores têm acesso a todas as telas do sistema. Usuários normais veem apenas a tela de Pedidos.
              </p>

              {erro && <p className="text-red-500 text-sm">{erro}</p>}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Usuarios