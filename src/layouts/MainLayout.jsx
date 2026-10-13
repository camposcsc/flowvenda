import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useUsuario } from '../context/UsuarioContext'

function gerarIniciais(nomeCompleto) {
  if (!nomeCompleto) return '?'
  const partes = nomeCompleto.trim().split(' ').filter(Boolean)
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const usuario = useUsuario()

  const menuItems = [
    { path: '/', label: 'Visão geral' },
    { path: '/pedidos', label: 'Pedidos' },
    { path: '/clientes', label: 'Clientes' },
    { path: '/produtos', label: 'Produtos e serviços' },
    { path: '/relatorios', label: 'Relatórios' },
    { path: '/configuracoes', label: 'Configurações' },
    { path: '/usuarios', label: 'Usuários' },
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">F</div>
          <div>
            <h1 className="font-bold text-gray-800 leading-none">flowvenda</h1>
            <span className="text-xs text-gray-400">GESTÃO COMERCIAL</span>
          </div>
        </div>
        <input type="text" placeholder="Buscar pedidos, clientes ou produtos..." className="border border-gray-200 rounded-lg px-4 py-2 w-96 text-sm outline-none focus:border-emerald-500" />
        <div className="relative">
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold"
          >
            {gerarIniciais(usuario?.nome_completo)}
          </button>

          {menuAberto && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-800 truncate">{usuario?.nome_completo}</p>
                <p className="text-xs text-gray-400">@{usuario?.nome_usuario}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </header>
      <nav className="bg-white border-b border-gray-200 px-6 flex gap-6">
        {menuItems.map((item) => (
          <Link key={item.path} to={item.path} className={`py-4 text-sm font-medium border-b-2 transition ${location.pathname === item.path ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout