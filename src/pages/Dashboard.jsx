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

  function gerarNumeroPedido(id) {
    return `PV-2026-${String(id).padStart(5, '0')}`
  }

  function formatarDataSimples(dataISO) {
    if (!dataISO) return '-'
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  // ---------- STATUS VISUAL DO PEDIDO (igual à página Pedidos) ----------
  function totalProduzido(pedido) {
    return (pedido.itens || []).reduce((soma, item) => soma + Number(item.produzido || 0), 0)
  }

  function labelStatus(pedido) {
    if (pedido.status === 'Concluído') return 'Entregue'
    const produzido = totalProduzido(pedido)
    if (produzido > 0) return 'Em andamento'
    return 'Pendente'
  }

  const pedidosPendentes = pedidos.filter((p) => labelStatus(p) === 'Pendente')
  const pedidosEmProducao = pedidos.filter((p) => labelStatus(p) === 'Em andamento')
  const pedidosEntregues = pedidos.filter((p) => labelStatus(p) === 'Entregue')

  const agora = new Date()

  // ---------- LEMBRETES DE ENTREGA ----------
  function diasParaEntrega(pedido) {
    if (!pedido.data_entrega) return null
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const [ano, mes, dia] = pedido.data_entrega.split('-').map(Number)
    const dataEntregaObj = new Date(ano, mes - 1, dia)
    dataEntregaObj.setHours(0, 0, 0, 0)
    const diffMs = dataEntregaObj - hoje
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
  }

  const pedidosComEntregaPendente = pedidos
    .filter((p) => p.data_entrega && p.status !== 'Concluído')
    .map((p) => ({ ...p, dias: diasParaEntrega(p) }))
    .sort((a, b) => a.dias - b.dias)

  const pedidosAtrasados = pedidosComEntregaPendente.filter((p) => p.dias < 0)
  const pedidosProximos = pedidosComEntregaPendente.filter((p) => p.dias >= 0 && p.dias <= 3)

  function textoPrazo(dias) {
    if (dias < 0) return `Atrasado há ${Math.abs(dias)} dia(s)`
    if (dias === 0) return 'Entrega é hoje'
    if (dias === 1) return 'Entrega amanhã'
    return `Entrega em ${dias} dias`
  }

  const metricas = [
    {
      titulo: 'Pedidos pendentes',
      valor: String(pedidosPendentes.length),
      variacao: pedidosPendentes.length > 0 ? `${pedidosPendentes.length} aguardando início de produção` : 'Nenhum pedido pendente',
      corVariacao: 'text-amber-600',
      corIcone: 'bg-amber-50 text-amber-600',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      titulo: 'Produção',
      valor: String(pedidosEmProducao.length),
      variacao: pedidosEmProducao.length > 0 ? `${pedidosEmProducao.length} em andamento` : 'Nenhum pedido em produção',
      corVariacao: 'text-blue-600',
      corIcone: 'bg-blue-50 text-blue-600',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      titulo: 'Entregas',
      valor: String(pedidosEntregues.length),
      variacao: pedidosEntregues.length > 0 ? `${pedidosEntregues.length} pedido(s) entregue(s)` : 'Nenhuma entrega registrada',
      corVariacao: 'text-emerald-600',
      corIcone: 'bg-emerald-50 text-emerald-600',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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

      {/* Lembretes de entrega */}
      {!carregando && (pedidosAtrasados.length > 0 || pedidosProximos.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            ⏰ Lembretes de entrega
          </h3>

          <div className="space-y-2">
            {pedidosAtrasados.map((pedido) => (
              <div
                key={pedido.id}
                className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {gerarNumeroPedido(pedido.id)} — {pedido.cliente}
                  </p>
                  <p className="text-sm text-red-600">
                    🔴 {textoPrazo(pedido.dias)} · Previsto para {formatarDataSimples(pedido.data_entrega)}
                  </p>
                </div>
                <a href="/pedidos" className="text-sm text-red-700 font-medium hover:underline">
                  Ver pedido →
                </a>
              </div>
            ))}

            {pedidosProximos.map((pedido) => (
              <div
                key={pedido.id}
                className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {gerarNumeroPedido(pedido.id)} — {pedido.cliente}
                  </p>
                  <p className="text-sm text-amber-600">
                    🟡 {textoPrazo(pedido.dias)} · Previsto para {formatarDataSimples(pedido.data_entrega)}
                  </p>
                </div>
                <a href="/pedidos" className="text-sm text-amber-700 font-medium hover:underline">
                  Ver pedido →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards de métricas */}
      <div className="grid grid-cols-3 gap-4">
        {carregando ? (
          [1, 2, 3].map((i) => (
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