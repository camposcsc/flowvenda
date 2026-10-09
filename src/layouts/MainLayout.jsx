import { Outlet, Link, useLocation } from 'react-router-dom'

function MainLayout() {
  const location = useLocation()

  const menuItems = [
    { path: '/', label: 'Visão geral' },
    { path: '/pedidos', label: 'Pedidos' },
    { path: '/clientes', label: 'Clientes' },
    { path: '/produtos', label: 'Produtos e serviços' },
    { path: '/relatorios', label: 'Relatórios' },
    { path: '/configuracoes', label: 'Configurações' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topo */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
            F
          </div>
          <div>
            <h1 className="font-bold text-gray-800 leading-none">flowvenda</h1>
            <span className="text-xs text-gray-400">GESTÃO COMERCIAL</span>
          </div>
        </div>

        <input
          type="text"
          placeholder="Buscar pedidos, clientes ou produtos..."
          className="border border-gray-200 rounded-lg px-4 py-2 w-96 text-sm outline-none focus:border-emerald-500"
        />

        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold">
            MS
          </div>
        </div>
      </header>

      {/* Menu de navegação */}
      <nav className="bg-white border-b border-gray-200 px-6 flex gap-6">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`py-4 text-sm font-medium border-b-2 transition ${
              location.pathname === item.path
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Conteúdo da página */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout