import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useUsuario } from '../context/UsuarioContext'

function Dashboard() {
  const usuario = useUsuario()
  const [pedidos, setPedidos] = useState([])
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    setCarregando(true)
    const [resPedidos, resProdutos] = await Promise.all([
      supabase.from('pedidos').select('*'),
      supabase.from('produtos').select('*'),
    ])
    if (!resPedidos.error) setPedidos(resPedidos.data || [])
    if (!resProdutos.error) setProdutos(resProdutos.data || [])
    setCarregando(false)
  }

  const precoPorProduto = useMemo(() => {
    const mapa = {}
    produtos.forEach((p) => {
      mapa[p.nome] = Number(p.preco) || 0
    })
    return mapa
  }, [produtos])

  function valorDoPedido(pedido) {
    return (pedido.itens || []).reduce((soma, item) => {
      const preco = precoPorProduto[item.produto] || 0
      return soma + preco * Number(item.quantidade || 0)
    }, 0)
  }

  function ehDoMes(dataISO, mes, ano) {
    const d = new Date(dataISO)
    return d.getMonth() === mes && d.getFullYear() === ano
  }

  const agora = new Date()
  const mesAtual = agora.getMonth()
  const anoAtual = agora.getFullYear()
  const dataMesAnterior = new Date(anoAtual, mesAtual - 1, 1)
  const mesAnterior = dataMesAnterior.getMonth()
  const anoMesAnterior = dataMesAnterior.getFullYear()

  const pedidosMesAtual = pedidos.filter((p) => ehDoMes(p.created_at, mesAtual, anoAtual))
  const pedidosMesAnterior = pedidos.filter((p) => ehDoMes(p.created_at, mesAnterior, anoMesAnterior))

  const concluidosMesAtual = pedidosMesAtual.filter((p) => p.status === 'Concluído')
  const concluidosMesAnterior = pedidosMesAnterior.filter((p) => p.status === 'Concluído')

  const faturamentoMesAtual = concluidosMesAtual.reduce((soma, p) => soma + valorDoPedido(p), 0)
  const faturamentoMesAnterior = concluidosMesAnterior.reduce((soma, p) => soma + valorDoPedido(p), 0)

  const ticketMedioAtual = concluidosMesAtual.length > 0 ? faturamentoMesAtual / concluidosMesAtual.length : 0
  const ticketMedioAnterior = concluidosMesAnterior.length > 0 ? faturamentoMesAnterior / concluidosMesAnterior.length : 0

  const pendentes = pedidos.filter((p) => p.status === 'Pendente')

  function calcularVariacao(atual, anterior) {
    if (anterior === 0) return atual === 0 ? 0 : 100
    return ((atual - anterior) / anterior) * 100
  }

  const variacaoFaturamento = calcularVariacao(faturamentoMesAtual, faturamentoMesAnterior)
  const variacaoPedidos = calcularVariacao(pedidosMesAtual.length, pedidosMesAnterior.length)
  const variacaoTicket = calcularVariacao(ticketMedioAtual, ticketMedioAnterior)

  function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatarVariacao(valor) {
    const sinal = valor >= 0 ? '↗' : '↘'
    return `${sinal} ${Math.abs(valor).toFixed(1)}% vs. mês anterior`
  }

  const metricas = [
    {
      titulo: 'Faturamento no mês',
      valor: formatarMoeda(faturamentoMesAtual),
      variacao: formatarVariacao(variacaoFaturamento),
      corVariacao: variacaoFaturamento >= 0 ? 'text-emerald-600' : 'text-red-500',
      corIcone: 'bg-emerald-50 text-emerald-600',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      titulo: 'Pedidos emitidos',
      valor: String(pedidosMesAtual.length),
      variacao: formatarVariacao(variacaoPedidos),
      corVariacao: variacaoPedidos >= 0 ? 'text-emerald-600' : 'text-red-500',
      corIcone: 'bg-blue-50 text-blue-600',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      titulo: 'Ticket médio',
      valor: formatarMoeda(ticketMedioAtual),
      variacao: formatarVariacao(variacaoTicket),
      corVariacao: variacaoTicket >= 0 ? 'text-emerald-600' : 'text-red-500',
      corIcone: 'bg-violet-50 text-violet-600',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      titulo: 'Aguardando aprovação',
      valor: String(pendentes.length),
      variacao: pendentes.length > 0 ? `${pendentes.length} aguardando nota fiscal` : 'Nenhum pedido pendente',
      corVariacao: 'text-amber-600',
      corIcone: 'bg-amber-50 text-amber-600',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <p className="text-sm text-gray-400 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          {agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h2 className="text-3xl font-bold text-gray-800 mt-1">
          Bom dia, {usuario?.nome_completo?.split(' ')[0] || ''} 👋
        </h2>
        <p className="text-gray-500 mt-1">
          Acompanhe o que está acontecendo nas suas vendas hoje.
        </p>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 relative overflow-hidden border border-gray-200 shadow-sm">
        <div className="absolute -top-10 -right-10 w-56 h-56 bg-emerald-500/5 rounded-full"></div>
        <div className="absolute -bottom-16 -right-24 w-72 h-72 bg-emerald-500/5 rounded-full"></div>

        <div className="relative">
          <p className="text-xs font-semibold text-emerald-600 flex items-center gap-2 tracking-wide">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            SUA OPERAÇÃO ESTÁ EM DIA
          </p>
          <h3 className="text-3xl font-bold mt-2 text-gray-800">Venda mais, organize melhor.</h3>
          <p className="text-gray-500 mt-2 max-w-md">
            Tenha pedidos, clientes e produtos conectados em um único fluxo comercial.
          </p>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-4 gap-4">
        {carregando ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm h-28 animate-pulse" />
          ))
        ) : (
          metricas.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{item.titulo}</p>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.corIcone}`}>
                  {item.icone}
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800 mt-3">{item.valor}</p>
              <p className={`text-xs mt-1 ${item.corVariacao}`}>{item.variacao}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Dashboard