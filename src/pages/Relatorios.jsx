import { useState } from 'react'

function Relatorios() {
  // Lista de vendas de exemplo (depois isso virá do banco de dados real)
  const vendasDetalhadas = [
    { cliente: 'Ana Souza', grupo: 'Suíno', produto: 'Carne suína', data: '2026-05-10', valor: 4200 },
    { cliente: 'Ana Souza', grupo: 'Bovino', produto: 'Carne bovina', data: '2026-06-14', valor: 6800 },
    { cliente: 'Ana Souza', grupo: 'Ave', produto: 'Frango', data: '2026-07-20', valor: 3100 },
    { cliente: 'Carlos Lima', grupo: 'Suíno', produto: 'Carne suína', data: '2026-05-18', valor: 5200 },
    { cliente: 'Carlos Lima', grupo: 'Ave', produto: 'Frango', data: '2026-08-05', valor: 7200 },
    { cliente: 'Carlos Lima', grupo: 'Bovino', produto: 'Carne bovina', data: '2026-09-02', valor: 9100 },
    { cliente: 'Beatriz Alves', grupo: 'Bovino', produto: 'Carne bovina', data: '2026-06-22', valor: 8800 },
    { cliente: 'Beatriz Alves', grupo: 'Suíno', produto: 'Linguiça suína', data: '2026-07-11', valor: 4100 },
    { cliente: 'Beatriz Alves', grupo: 'Ave', produto: 'Frango', data: '2026-09-15', valor: 6200 },
    { cliente: 'João Pedro', grupo: 'Ave', produto: 'Frango', data: '2026-08-28', valor: 3900 },
    { cliente: 'João Pedro', grupo: 'Suíno', produto: 'Carne suína', data: '2026-09-09', valor: 5400 },
    { cliente: 'Fernanda Dias', grupo: 'Bovino', produto: 'Carne bovina', data: '2026-05-30', valor: 7600 },
    { cliente: 'Fernanda Dias', grupo: 'Ave', produto: 'Frango', data: '2026-06-19', valor: 4800 },
  ]

  const [clienteSelecionado, setClienteSelecionado] = useState('Todos')
  const [grupoSelecionado, setGrupoSelecionado] = useState('Todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const clientes = ['Todos', ...new Set(vendasDetalhadas.map((v) => v.cliente))]
  const grupos = ['Todos', ...new Set(vendasDetalhadas.map((v) => v.grupo))]

  // Aplica todos os filtros
  const vendasFiltradas = vendasDetalhadas.filter((v) => {
    const condCliente = clienteSelecionado === 'Todos' || v.cliente === clienteSelecionado
    const condGrupo = grupoSelecionado === 'Todos' || v.grupo === grupoSelecionado
    const condDataInicio = !dataInicio || v.data >= dataInicio
    const condDataFim = !dataFim || v.data <= dataFim
    return condCliente && condGrupo && condDataInicio && condDataFim
  })

  const faturamentoTotal = vendasFiltradas.reduce((acc, v) => acc + v.valor, 0)
  const totalRegistros = vendasFiltradas.length
  const clientesAtendidos = new Set(vendasFiltradas.map((v) => v.cliente)).size

  function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatarDataBR(data) {
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  // Agrupa por mês para o gráfico
  const mesesNomes = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
  }
  const vendasPorMesMap = {}
  vendasFiltradas.forEach((v) => {
    const mesNum = v.data.split('-')[1]
    const nomeMes = mesesNomes[mesNum]
    vendasPorMesMap[nomeMes] = (vendasPorMesMap[nomeMes] || 0) + v.valor
  })
  const vendasPorMes = Object.entries(vendasPorMesMap).map(([mes, total]) => ({ mes, total }))
  const maiorValorMes = Math.max(...vendasPorMes.map((v) => v.total), 1)

  // Produtos mais vendidos
  const produtosAgrupados = {}
  vendasFiltradas.forEach((v) => {
    if (!produtosAgrupados[v.produto]) {
      produtosAgrupados[v.produto] = { nome: v.produto, vendas: 0, total: 0 }
    }
    produtosAgrupados[v.produto].vendas += 1
    produtosAgrupados[v.produto].total += v.valor
  })
  const produtosMaisVendidos = Object.values(produtosAgrupados)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  function imprimirRelatorio() {
    window.print()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
        <button
          onClick={imprimirRelatorio}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          🖨️ Imprimir
        </button>
      </div>

      <h1 className="hidden print:block text-2xl font-bold text-gray-800 mb-6">Relatórios</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6 print:hidden">
        <select
          value={clienteSelecionado}
          onChange={(e) => setClienteSelecionado(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {clientes.map((c) => (
            <option key={c} value={c}>
              {c === 'Todos' ? 'Todos os clientes' : c}
            </option>
          ))}
        </select>

        <select
          value={grupoSelecionado}
          onChange={(e) => setGrupoSelecionado(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {grupos.map((g) => (
            <option key={g} value={g}>
              {g === 'Todos' ? 'Todos os grupos' : g}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">De</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Até</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Período no cabeçalho de impressão */}
      {(dataInicio || dataFim) && (
        <p className="hidden print:block text-sm text-gray-500 mb-4">
          Período: {dataInicio ? formatarDataBR(dataInicio) : '...'} até {dataFim ? formatarDataBR(dataFim) : '...'}
        </p>
      )}

      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 border border-gray-100 print:border print:border-gray-300">
          <p className="text-sm text-gray-500 mb-1">Faturamento total</p>
          <p className="text-2xl font-bold text-gray-800">{formatarMoeda(faturamentoTotal)}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 print:border print:border-gray-300">
          <p className="text-sm text-gray-500 mb-1">Vendas no período</p>
          <p className="text-2xl font-bold text-gray-800">{totalRegistros}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 print:border print:border-gray-300">
          <p className="text-sm text-gray-500 mb-1">Clientes atendidos</p>
          <p className="text-2xl font-bold text-gray-800">{clientesAtendidos}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 print:border print:border-gray-300">
          <h3 className="font-bold text-gray-800 mb-6">Vendas por mês</h3>
          {faturamentoTotal === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma venda encontrada para esse filtro.</p>
          ) : (
            <div className="flex items-end justify-between gap-4 h-48">
              {vendasPorMes.map((item) => (
                <div key={item.mes} className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
                  <div
                    className="w-full bg-emerald-600 rounded-t-lg transition-all"
                    style={{ height: `${(item.total / maiorValorMes) * 100}%` }}
                  ></div>
                  <span className="text-xs text-gray-500">{item.mes}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Produtos mais vendidos */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 print:border print:border-gray-300">
          <h3 className="font-bold text-gray-800 mb-6">Produtos mais vendidos</h3>
          {produtosMaisVendidos.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum produto encontrado para esse filtro.</p>
          ) : (
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
                  <p className="text-sm font-bold text-gray-800">{formatarMoeda(produto.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Relatorios