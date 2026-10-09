import { useState } from 'react'

function Pedidos() {
  const [pedidos, setPedidos] = useState([
    {
      id: 1,
      pedido: 'PV-2026-00128',
      cliente: 'Ana Souza',
      itens: [{ produto: 'Carne suína', quantidade: '50kg' }],
      data: '02/09/2026',
      status: 'Em produção',
      notaFiscal: '',
    },
    {
      id: 2,
      pedido: 'PV-2026-00127',
      cliente: 'Carlos Lima',
      itens: [{ produto: 'Frango', quantidade: '30kg' }],
      data: '01/09/2026',
      status: 'Pendente',
      notaFiscal: '',
    },
    {
      id: 3,
      pedido: 'PV-2026-00126',
      cliente: 'Beatriz Alves',
      itens: [{ produto: 'Carne bovina', quantidade: '80kg' }],
      data: '31/08/2026',
      status: 'Concluído',
      notaFiscal: '45872',
    },
  ])

  const [contadorPedido, setContadorPedido] = useState(129)

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  // Modal novo pedido
  const [modalNovoPedido, setModalNovoPedido] = useState(false)
  const [clienteNovo, setClienteNovo] = useState('')
  const [itensTemp, setItensTemp] = useState([])
  const [produtoAtual, setProdutoAtual] = useState('')
  const [quantidadeAtual, setQuantidadeAtual] = useState('')

  // Modal nota fiscal
  const [modalNF, setModalNF] = useState(false)
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null)
  const [numeroNF, setNumeroNF] = useState('')

  const statusCores = {
    'Em produção': 'bg-blue-100 text-blue-700',
    'Pendente': 'bg-yellow-100 text-yellow-700',
    'Concluído': 'bg-emerald-100 text-emerald-700',
  }

  function adicionarItemTemp() {
    if (!produtoAtual.trim() || !quantidadeAtual.trim()) {
      alert('Preencha o produto e a quantidade.')
      return
    }
    setItensTemp((prev) => [...prev, { produto: produtoAtual, quantidade: quantidadeAtual }])
    setProdutoAtual('')
    setQuantidadeAtual('')
  }

  function removerItemTemp(index) {
    setItensTemp((prev) => prev.filter((_, i) => i !== index))
  }

  function criarPedido() {
    if (!clienteNovo.trim()) {
      alert('Informe o nome do cliente.')
      return
    }
    if (itensTemp.length === 0) {
      alert('Adicione pelo menos um item ao pedido.')
      return
    }

    const novoPedido = {
      id: Date.now(),
      pedido: `PV-2026-${String(contadorPedido).padStart(5, '0')}`,
      cliente: clienteNovo,
      itens: itensTemp,
      data: new Date().toLocaleDateString('pt-BR'),
      status: 'Em produção',
      notaFiscal: '',
    }

    setPedidos((prev) => [novoPedido, ...prev])
    setContadorPedido((prev) => prev + 1)

    // reset modal
    setClienteNovo('')
    setItensTemp([])
    setModalNovoPedido(false)
  }

  function marcarComoProduzido(pedido) {
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedido.id ? { ...p, status: 'Pendente' } : p))
    )
  }

  function imprimirPedido(pedido) {
    const janela = window.open('', '_blank', 'width=600,height=700')
    janela.document.write(`
      <html>
        <head><title>Pedido ${pedido.pedido}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>Pedido ${pedido.pedido}</h2>
          <p><strong>Cliente:</strong> ${pedido.cliente}</p>
          <p><strong>Data:</strong> ${pedido.data}</p>
          <h3>Itens:</h3>
          <ul>
            ${pedido.itens.map((i) => `<li>${i.produto} - ${i.quantidade}</li>`).join('')}
          </ul>
        </body>
      </html>
    `)
    janela.document.close()
    janela.print()
  }

  function abrirModalNF(pedido) {
    setPedidoSelecionado(pedido)
    setNumeroNF('')
    setModalNF(true)
  }

  function confirmarNF() {
    if (!numeroNF.trim()) {
      alert('Informe o número da nota fiscal.')
      return
    }
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === pedidoSelecionado.id
          ? { ...p, status: 'Concluído', notaFiscal: numeroNF }
          : p
      )
    )
    setModalNF(false)
    setPedidoSelecionado(null)
    setNumeroNF('')
  }

  const pedidosFiltrados = pedidos.filter((p) => {
    const condBusca =
      p.pedido.toLowerCase().includes(busca.toLowerCase()) ||
      p.cliente.toLowerCase().includes(busca.toLowerCase())
    const condStatus = filtroStatus === 'Todos' || p.status === filtroStatus
    return condBusca && condStatus
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pedidos</h1>
        <button
          onClick={() => setModalNovoPedido(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Novo pedido
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por pedido ou cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="Todos">Todos os status</option>
          <option value="Em produção">Em produção</option>
          <option value="Pendente">Pendente</option>
          <option value="Concluído">Concluído</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3 font-medium">Pedido</th>
              <th className="px-6 py-3 font-medium">Cliente</th>
              <th className="px-6 py-3 font-medium">Itens</th>
              <th className="px-6 py-3 font-medium">Data</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Ação</th>
              <th className="px-6 py-3 font-medium">Nota Fiscal</th>
            </tr>
          </thead>
          <tbody>
            {pedidosFiltrados.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0">
                <td className="px-6 py-4 font-medium text-gray-800">{p.pedido}</td>
                <td className="px-6 py-4 text-gray-600">{p.cliente}</td>
                <td className="px-6 py-4 text-gray-600">
                  {p.itens.map((i) => `${i.produto} (${i.quantidade})`).join(', ')}
                </td>
                <td className="px-6 py-4 text-gray-600">{p.data}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusCores[p.status]}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {p.status === 'Em produção' && (
                    <button
                      onClick={() => marcarComoProduzido(p)}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      ✅ Marcar como produzido
                    </button>
                  )}
                  {p.status === 'Pendente' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => imprimirPedido(p)}
                        className="text-xs font-medium text-gray-600 hover:underline"
                      >
                        🖨️ Imprimir
                      </button>
                      <button
                        onClick={() => abrirModalNF(p)}
                        className="text-xs font-medium text-emerald-600 hover:underline"
                      >
                        📄 Lançar NF
                      </button>
                    </div>
                  )}
                  {p.status === 'Concluído' && (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {p.notaFiscal ? p.notaFiscal : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Novo pedido */}
      {modalNovoPedido && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-4">Novo pedido</h3>

            <label className="text-sm text-gray-600 mb-1 block">Cliente</label>
            <input
              type="text"
              placeholder="Nome do cliente"
              value={clienteNovo}
              onChange={(e) => setClienteNovo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <label className="text-sm text-gray-600 mb-1 block">Adicionar item</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Produto (ex: Carne suína)"
                value={produtoAtual}
                onChange={(e) => setProdutoAtual(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="text"
                placeholder="Qtd (ex: 50kg)"
                value={quantidadeAtual}
                onChange={(e) => setQuantidadeAtual(e.target.value)}
                className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={adicionarItemTemp}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                +
              </button>
            </div>

            {itensTemp.length > 0 && (
              <div className="mb-4 space-y-2">
                {itensTemp.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-sm"
                  >
                    <span>{item.produto} - {item.quantidade}</span>
                    <button
                      onClick={() => removerItemTemp(index)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      remover
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setModalNovoPedido(false)
                  setClienteNovo('')
                  setItensTemp([])
                }}
                className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={criarPedido}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Criar pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lançar nota fiscal */}
      {modalNF && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 mb-2">Concluir pedido</h3>
            <p className="text-sm text-gray-500 mb-4">
              Informe o número da nota fiscal do pedido{' '}
              <span className="font-medium text-gray-700">{pedidoSelecionado?.pedido}</span>
            </p>
            <input
              type="text"
              placeholder="Número da nota fiscal"
              value={numeroNF}
              onChange={(e) => setNumeroNF(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalNF(false)}
                className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarNF}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Pedidos