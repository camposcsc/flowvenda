import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx'

function Relatorios() {
  const [pedidos, setPedidos] = useState([])
  const [clientesLista, setClientesLista] = useState([])
  const [produtosLista, setProdutosLista] = useState([])
  const [carregando, setCarregando] = useState(true)

  const [clienteSelecionado, setClienteSelecionado] = useState('Todos')
  const [grupoSelecionado, setGrupoSelecionado] = useState('Todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    setCarregando(true)

    const { data: pedidosData, error: erroPedidos } = await supabase
      .from('pedidos')
      .select('*')
      .eq('status', 'Concluído')

    const { data: clientesData, error: erroClientes } = await supabase
      .from('clientes')
      .select('*')

    const { data: produtosData, error: erroProdutos } = await supabase
      .from('produtos')
      .select('*')

    if (erroPedidos) console.log('Erro ao buscar pedidos:', erroPedidos)
    if (erroClientes) console.log('Erro ao buscar clientes:', erroClientes)
    if (erroProdutos) console.log('Erro ao buscar produtos:', erroProdutos)

    setPedidos(pedidosData || [])
    setClientesLista(clientesData || [])
    setProdutosLista(produtosData || [])
    setCarregando(false)
  }

  // Monta a lista "achatada" de vendas: cada item de cada pedido concluído vira uma linha
  const vendasDetalhadas = []
  pedidos.forEach((pedido) => {
    const dataPedido = (pedido.created_at || '').split('T')[0] // yyyy-mm-dd
    ;(pedido.itens || []).forEach((item) => {
      const produtoInfo = produtosLista.find((p) => p.nome === item.produto)
      const preco = produtoInfo?.preco || 0
      const grupo = produtoInfo?.grupo || 'Sem grupo'
      const valor = Number(item.quantidade || 0) * Number(preco)

      vendasDetalhadas.push({
        cliente: pedido.cliente,
        grupo,
        produto: item.produto,
        quantidade: Number(item.quantidade || 0),
        data: dataPedido,
        valor,
      })
    })
  })

  const clientes = ['Todos', ...new Set(clientesLista.map((c) => c.nome))]
  const grupos = ['Todos', ...new Set(produtosLista.map((p) => p.grupo).filter(Boolean))]

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
    const nomeMes = mesesNomes[mesNum] || '—'
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

  function exportarExcel() {
    if (vendasFiltradas.length === 0) {
      alert('Não há dados para exportar com esse filtro.')
      return
    }

    // Monta as linhas da planilha de detalhamento
    const linhas = vendasFiltradas.map((v) => ({
      'Data': formatarDataBR(v.data),
      'Cliente': v.cliente,
      'Grupo': v.grupo,
      'Produto': v.produto,
      'Quantidade (kg)': v.quantidade,
      'Valor (R$)': v.valor,
    }))

    // Linha de total no final
    linhas.push({
      'Data': '',
      'Cliente': '',
      'Grupo': '',
      'Produto': 'TOTAL',
      'Quantidade (kg)': '',
      'Valor (R$)': faturamentoTotal,
    })

    const planilhaVendas = XLSX.utils.json_to_sheet(linhas)

    // Segunda aba: resumo por produto
    const linhasResumo = Object.values(produtosAgrupados)
      .sort((a, b) => b.total - a.total)
      .map((p) => ({
        'Produto': p.nome,
        'Quantidade de vendas': p.vendas,
        'Total (R$)': p.total,
      }))
    const planilhaResumo = XLSX.utils.json_to_sheet(linhasResumo)

    const livro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(livro, planilhaVendas, 'Detalhamento')
    XLSX.utils.book_append_sheet(livro, planilhaResumo, 'Produtos mais vendidos')

    const dataHoje = new Date().toISOString().split('T')[0]
    XLSX.writeFile(livro, `relatorio-flowvenda-${dataHoje}.xlsx`)
  }

  if (carregando) {
    return <p className="p-6 text-gray-500">Carregando relatórios...</p>
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
        <div className="flex gap-2">
          <button
            onClick={exportarExcel}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            📊 Exportar Excel
          </button>
          <button
            onClick={imprimirRelatorio}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      <h1 className="hidden print:block text-2xl font-bold text-gray-800 mb-6">Relatórios</h1>

      {vendasDetalhadas.length === 0 && (
        <p className="bg-yellow-50 text-yellow-700 p-3 rounded-lg mb-4 text-sm print:hidden">
          Nenhuma venda encontrada ainda. Os relatórios consideram apenas pedidos com status
          "Concluído" (com nota fiscal lançada).
        </p>
      )}

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