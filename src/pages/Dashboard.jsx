function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Sexta-feira, 18 de setembro de 2026
          </p>
          <h2 className="text-3xl font-bold text-gray-800 mt-1">
            Bom dia, Mariana 👋
          </h2>
          <p className="text-gray-500 mt-1">
            Acompanhe o que está acontecendo nas suas vendas hoje.
          </p>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            ⬇ Exportar
          </button>
          <button className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800">
            + Novo pedido
          </button>
        </div>
      </div>

      {/* Banner */}
      <div className="bg-emerald-700 rounded-2xl p-8 text-white relative overflow-hidden">
        <p className="text-xs font-semibold text-emerald-200 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-300 rounded-full"></span>
          SUA OPERAÇÃO ESTÁ EM DIA
        </p>
        <h3 className="text-3xl font-bold mt-2">Venda mais, organize melhor.</h3>
        <p className="text-emerald-100 mt-2 max-w-md">
          Tenha pedidos, clientes e produtos conectados em um único fluxo comercial.
        </p>

        <div className="flex gap-3 mt-6">
          <button className="bg-white text-emerald-700 px-4 py-2 rounded-lg font-medium text-sm">
            + Emitir pedido
          </button>
          <button className="text-white font-medium text-sm flex items-center gap-1">
            Acompanhar pedidos ↗
          </button>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Faturamento no mês</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">R$ 84.290,50</p>
          <p className="text-xs text-emerald-600 mt-1">↗ 12,8% vs. mês anterior</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Pedidos emitidos</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">128</p>
          <p className="text-xs text-emerald-600 mt-1">↗ 8,4% vs. mês anterior</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Ticket médio</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">R$ 658,52</p>
          <p className="text-xs text-emerald-600 mt-1">↗ 4,2% vs. mês anterior</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Aguardando aprovação</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">7</p>
          <p className="text-xs text-gray-400 mt-1">3 vencem hoje</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard