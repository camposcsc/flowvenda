function Relatorios() {
  const vendasPorMes = [
    { mes: 'Mai', valor: 45 },
    { mes: 'Jun', valor: 62 },
    { mes: 'Jul', valor: 58 },
    { mes: 'Ago', valor: 75 },
    { mes: 'Set', valor: 90 },
  ]

  const produtosMaisVendidos = [
    { nome: 'Notebook Gamer X1', vendas: 42, total: 'R$ 205.380,00' },
    { nome: 'Consultoria Comercial', vendas: 28, total: 'R$ 33.600,00' },
    { nome: 'Monitor 27" 4K', vendas: 19, total: 'R$ 31.350,00' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Relatórios</h1>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Faturamento total</p>
          <p className="text-2xl font-bold text-gray-800">R$ 330.290,50</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Pedidos no período</p>
          <p className="text-2xl font-bold text-gray-800">512</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Novos clientes</p>
          <p className="text-2xl font-bold text-gray-800">48</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Taxa de conversão</p>
          <p className="text-2xl font-bold text-gray-800">68%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras simples */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">Vendas por mês</h3>
          <div className="flex items-end justify-between gap-4 h-48">
            {vendasPorMes.map((item) => (
              <div key={item.mes} className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
                <div
                  className="w-full bg-emerald-600 rounded-t-lg transition-all"
                  style={{ height: `${item.valor}%` }}
                ></div>
                <span className="text-xs text-gray-500">{item.mes}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Produtos mais vendidos */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">Produtos mais vendidos</h3>
          <div className="space-y-4">
            {produtosMaisVendidos.map((produto, index) => (
              <div key={produto.nome} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{produto.nome}</p>
                    <p className="text-xs text-gray-500">{produto.vendas} vendas</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-800">{produto.total}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Relatorios