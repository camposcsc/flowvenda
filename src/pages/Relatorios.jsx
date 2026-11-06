import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx'

const mesesNomes = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

function gerarNumeroPedido(id) {
  return `PV-2026-${String(id).padStart(5, '0')}`
}

// Converte uma data ISO para yyyy-mm-dd no fuso local (evita erro de um dia)
function dataLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function formatarDataBR(dataYMD) {
  if (!dataYMD) return '-'
  const [ano, mes, dia] = dataYMD.split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarKg(valor) {
  return `${Number(valor || 0).toLocaleString('pt-BR')} kg`
}

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

    // Busca todos os pedidos, porque entregas parciais já contam mesmo com o pedido "Em produção"
    const { data: pedidosData, error: erroPedidos } = await supabase
      .from('pedidos')
      .select('*')

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

  // Monta uma linha por ENTREGA realizada (cada item do pedido pode ter várias entregas)
  const vendasDetalhadas = []
  pedidos.forEach((pedido) => {
    ;(pedido.itens || []).forEach((item) => {
      const produtoInfo = produtosLista.find((p) => p.nome === item.produto)
      const preco = Number(produtoInfo?.preco || 0)
      const grupo = produtoInfo?.grupo || 'Sem grupo'
      const entregas = item.historico || []

      if (entregas.length > 0) {
        entregas.forEach((h) => {
          const quantidade = Number(h.quantidade || 0)
          if (quantidade <= 0) return
          vendasDetalhadas.push({
            cliente: pedido.cliente,
            pedido: gerarNumeroPedido(pedido.id),
            grupo,
            produto: item.produto,
            quantidade,
            data: dataLocal(h.data),
            nota_fiscal: h.nota_fiscal || '',
            valor: quantidade * preco,
            semPreco: preco <= 0,
          })
        })
      } else if (pedido.status === 'Concluído') {
        // Pedidos antigos, feitos antes do histórico de entregas existir
        const quantidade = Number(item.produzido || item.quantidade || 0)
        if (quantidade <= 0) return
        vendasDetalhadas.push({
          cliente: pedido.cliente,
          pedido: gerarNumeroPedido(pedido.id),
          grupo,
          produto: item.produto,
          quantidade,
          data: dataLocal(pedido.created_at),
          nota_fiscal: pedido.nota_fiscal || '',
          valor: quantidade * preco,
          semPreco: preco <= 0,
        })
      }
    })
  })

  const clientes = ['Todos', ...new Set(clientesLista.map((c) => c.nome))]
  const grupos = ['Todos', ...new Set(produtosLista.map((p) => p.grupo).filter(Boolean))]

  // Aplica os filtros
  const vendasFiltradas = vendasDetalhadas.filter((v) => {
    const condCliente = clienteSelecionado === 'Todos' || v.cliente === clienteSelecionado
    const condGrupo = grupoSelecionado === 'Todos' || v.grupo === grupoSelecionado
    const condDataInicio = !dataInicio || v.data >= dataInicio
    const condDataFim = !dataFim || v.data <= dataFim
    return condCliente && condGrupo && condDataInicio && condDataFim
  })

  const faturamentoTotal = vendasFiltradas.reduce((acc, v) => acc + v.valor, 0)
  const totalKg = vendasFiltradas.reduce((acc, v) => acc + v.quantidade, 0)
  const clientesAtendidos = new Set(vendasFiltradas.map((v) => v.cliente)).size
  const produtosSemPreco = [...new Set(vendasFiltradas.filter((v) => v.semPreco).map((v) => v.produto))]

  // Agrupa por produto (quantidade em kg e valor)
  const produtosAgrupados = {}
  vendasFiltradas.forEach((v) => {
    if (!produtosAgrupados[v.produto]) {
      produtosAgrupados[v.produto] = { nome: v.produto, grupo: v.grupo, quantidade: 0, valor: 0, entregas: 0 }
    }
    produtosAgrupados[v.produto].quantidade += v.quantidade
    produtosAgrupados[v.produto].valor += v.valor
    produtosAgrupados[v.produto].entregas += 1
  })
  const listaProdutos = Object.values(produtosAgrupados).sort((a, b) => b.quantidade - a.quantidade)
  const produtosMaisVendidos = listaProdutos.slice(0, 5)

  // Agrupa por mês para o gráfico (pela data da entrega)
  const vendasPorMesMap = {}
  vendasFiltradas.forEach((v) => {
    const chave = v.data.slice(0, 7)
    vendasPorMesMap[chave] = (vendasPorMesMap[chave] || 0) + v.valor
  })
  const vendasPorMes = Object.keys(vendasPorMesMap)
    .sort()
    .map((chave) => {
      const [ano, mes] = chave.split('-')
      return { mes: `${mesesNomes[mes] || '—'}/${(ano || '').slice(2)}`, total: vendasPorMesMap[chave] }
    })
  const maiorValorMes = Math.max(...vendasPorMes.map((v) => v.total), 1)

  const entregasOrdenadas = [...vendasFiltradas].sort((a, b) => b.data.localeCompare(a.data))

  function imprimirRelatorio() {
    window.print()
  }

  function exportarExcel() {
    if (vendasFiltradas.length === 0) {
      alert('Não há dados para exportar com esse filtro.')
      return
    }

    const linhas = vendasFiltradas.map((v) => ({
      'Data': formatarDataBR(v.data),
      'Pedido': v.pedido,
      'Cliente': v.cliente,
      'Grupo': v.grupo,
      'Produto': v.produto,
      'Quantidade (kg)': v.quantidade,
      'Nota fiscal': v.nota_fiscal,
      'Valor (R$)': v.valor,
    }))

    linhas.push({
      'Data': '',
      'Pedido': '',
      'Cliente': '',
      'Grupo': '',
      'Produto': 'TOTAL',
      'Quantidade (kg)': totalKg,
      'Nota fiscal': '',
      'Valor (R$)': faturamentoTotal,
    })

    const planilhaVendas = XLSX.utils.json_to_sheet(linhas)

    const linhasProdutos = listaProdutos.map((p) => ({
      'Produto': p.nome,
      'Grupo': p.grupo,
      'Quantidade (kg)': p.quantidade,
      'Entregas': p.entregas,
      'Valor (R$)': p.valor,
    }))
    const planilhaProdutos = XLSX.utils.json_to_sheet(linhasProdutos)

    const livro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(livro, planilhaVendas, 'Detalhamento')
    XLSX.utils.book_append_sheet(livro, planilhaProdutos, 'Produtos')

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
          Nenhuma entrega encontrada ainda. Os relatórios contam as entregas registradas em Pedidos
          (com nota fiscal e quem recebeu).
        </p>
      )}

      {produtosSemPreco.length > 0 && (
        <p className="bg-orange-50 text-orange-700 p-3 rounded-lg mb-4 text-sm print:hidden">
          Estes produtos estão com preço zerado no cadastro, então o valor em R$ aparece como zero:{' '}
          <strong>{produtosSemPreco.join(', ')}</strong>. Preencha o preço em Produtos para corrigir.
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

      {(dataInicio || dataFim) && (
        <p className="hidden print:block text-sm text-gray-500 mb-4">
          Período: {dataInicio ? formatarDataBR(dataInicio) : '...'} até {dataFim ? formatarDataBR(dataFim) : '...'}
        </p>
      )}

      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 border border-gray-100 print:border print:border-gray-300">
          <p className="text-sm text-gray-500 mb-1">Faturamento total</p>
          <p className="text-2xl font-bold text-gray-800">{formatarMoeda(faturamentoTotal)}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 print:border print:border-gray-300">
          <p className="text-sm text-gray-500 mb-1">Quantidade entregue</p>
          <p className="text-2xl font-bold text-gray-800">{formatarKg(totalKg)}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 print:border print:border-gray-300">
          <p className="text-sm text-gray-500 mb-1">Entregas no período</p>
          <p className="text-2xl font-bold text-gray-800">{vendasFiltradas.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 print:border print:border-gray-300">
          <p className="text-sm text-gray-500 mb-1">Clientes atendidos</p>
          <p className="text-2xl font-bold text-gray-800">{clientesAtendidos}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 print:border print:border-gray-300">
          <h3 className="font-bold text-gray-800 mb-6">Faturamento por mês</h3>
          {vendasFiltradas.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma entrega encontrada para esse filtro.</p>
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

        {/* Produtos mais vendidos (por quantidade) */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 print:border print:border-gray-300">
          <h3 className="font-bold text-gray-800 mb-6">Produtos mais vendidos (kg)</h3>
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
                      <p className="text-xs text-gray-500">{produto.entregas} entrega(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">{formatarKg(produto.quantidade)}</p>
                    <p className="text-xs text-gray-500">{formatarMoeda(produto.valor)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabela completa por produto */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mt-6 print:border print:border-gray-300">
        <h3 className="font-bold text-gray-800 mb-4">Quantidade vendida por produto</h3>
        {listaProdutos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum produto encontrado para esse filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Produto</th>
                  <th className="py-2 pr-4">Grupo</th>
                  <th className="py-2 pr-4 text-right">Quantidade</th>
                  <th className="py-2 pr-4 text-right">Entregas</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {listaProdutos.map((p) => (
                  <tr key={p.nome} className="border-b">
                    <td className="py-2 pr-4 font-medium text-gray-800">{p.nome}</td>
                    <td className="py-2 pr-4 text-gray-600">{p.grupo}</td>
                    <td className="py-2 pr-4 text-right">{formatarKg(p.quantidade)}</td>
                    <td className="py-2 pr-4 text-right">{p.entregas}</td>
                    <td className="py-2 text-right">{formatarMoeda(p.valor)}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2 pr-4" colSpan={2}>Total</td>
                  <td className="py-2 pr-4 text-right">{formatarKg(totalKg)}</td>
                  <td className="py-2 pr-4 text-right">{vendasFiltradas.length}</td>
                  <td className="py-2 text-right">{formatarMoeda(faturamentoTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lista das entregas do período */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mt-6 print:border print:border-gray-300">
        <h3 className="font-bold text-gray-800 mb-4">Entregas do período</h3>
        {entregasOrdenadas.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma entrega encontrada para esse filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Pedido</th>
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Produto</th>
                  <th className="py-2 pr-4 text-right">Quantidade</th>
                  <th className="py-2 pr-4">NF</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {entregasOrdenadas.map((v, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 pr-4">{formatarDataBR(v.data)}</td>
                    <td className="py-2 pr-4">{v.pedido}</td>
                    <td className="py-2 pr-4">{v.cliente}</td>
                    <td className="py-2 pr-4">{v.produto}</td>
                    <td className="py-2 pr-4 text-right">{formatarKg(v.quantidade)}</td>
                    <td className="py-2 pr-4">{v.nota_fiscal || '-'}</td>
                    <td className="py-2 text-right">{formatarMoeda(v.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Relatorios