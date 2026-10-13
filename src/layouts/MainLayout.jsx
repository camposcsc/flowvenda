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
  const [menuMobileAberto, setMenuMobileAberto] = useState(false)
  const [buscaMobileAberta, setBuscaMobileAberta] = useState(false)
  const usuario = useUsuario()

  const menuItems = [
    { path: '/', label: 'Visão geral' },
    { path: '/pedidos', label: 'Pedidos' },
    { path: '/clientes', label: 'Clientes' },
    { path: '/produtos', label: 'Produtos e serviços' },
    { path: '/entradas', label: 'Entradas' },
    { path: '/producao', label: 'Produção' },
    { path: '/relatorios', label: 'Relatórios' },
    { path: '/configuracoes', label: 'Configurações' },
    { path: '/usuarios', label: 'Usuários' },
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function irPara(path) {
    setMenuMobileAberto(false)
    navigate(path)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Botão hambúrguer - só aparece no mobile */}
          <button
            onClick={() => setMenuMobileAberto(!menuMobileAberto)}
            className="md:hidden w-9 h-9 flex items-center justify-center text-gray-600 border border-gray-200 rounded-lg flex-shrink-0"
            aria-label="Abrir menu"
          >
            {menuMobileAberto ? '✕' : '☰'}
          </button>

          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">F</div>
          <div className="min-w-0 hidden sm:block">
            <h1 className="font-bold text-gray-800 leading-none truncate">flowvenda</h1>
            <span className="text-xs text-gray-400">GESTÃO COMERCIAL</span>
          </div>
        </div>

        {/* Busca - some em telas pequenas, vira ícone */}
        <input
          type="text"
          placeholder="Buscar pedidos, clientes ou produtos..."
          className="hidden md:block border border-gray-200 rounded-lg px-4 py-2 flex-1 max-w-md text-sm outline-none focus:border-emerald-500"
        />
        <button
          onClick={() => setBuscaMobileAberta(!buscaMobileAberta)}
          className="md:hidden w-9 h-9 flex items-center justify-center text-gray-600 border border-gray-200 rounded-lg flex-shrink-0"
          aria-label="Buscar"
        >
          🔍
        </button>

        <div className="relative flex-shrink-0">
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

      {/* Busca mobile - aparece abaixo do header quando clicado no ícone de lupa */}
      {buscaMobileAberta && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
          <input
            type="text"
            placeholder="Buscar pedidos, clientes ou produtos..."
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      )}

      {/* Menu de navegação - desktop (linha horizontal) */}
      <nav className="hidden md:flex bg-white border-b border-gray-200 px-6 gap-6 overflow-x-auto">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              location.pathname === item.path
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Menu de navegação - mobile (painel que abre/fecha) */}
      {menuMobileAberto && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMenuMobileAberto(false)}
          />
          <nav className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white z-50 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">F</div>
                <span className="font-bold text-gray-800">flowvenda</span>
              </div>
              <button
                onClick={() => setMenuMobileAberto(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="py-2">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => irPara(item.path)}
                  className={`w-full text-left px-5 py-3 text-sm font-medium transition ${
                    location.pathname === item.path
                      ? 'bg-emerald-50 text-emerald-600 border-r-4 border-emerald-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        </>
      )}

      <main className="p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout