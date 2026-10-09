function Pedidos() {
  const pedidos = [
    { id: 'PV-2026-00128', cliente: 'Ana Souza', data: '18/09/2026', valor: 'R$ 4.260,00', status: 'Aprovado' },
    { id: 'PV-2026-00127', cliente: 'Carlos Lima', data: '17/09/2026', valor: 'R$ 1.890,00', status: 'Pendente' },
    { id: 'PV-2026-00126', cliente: 'Beatriz Alves', data: '17/09/2026', valor: 'R$ 3.150,00', status: 'Aprovado' },
    { id: 'PV-2026-00125', cliente: 'João Pedro', data: '16/09/2026', valor: 'R$ 980,00', status: 'Cancelado' },
    { id: 'PV-2026-00124', cliente: 'Fernanda Dias', data: '16/09/2026', valor: 'R$ 2.420,00', status: 'Aprovado' },
  ]

  const statusStyle = {
    Aprovado: 'bg-emerald-50 text-emerald-700',
    Pendente: 'bg-yellow-50 text-yellow-700',
    Cancelado: 'bg-red-50 text-red-700',
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Pedidos</h2>
          <p className="text-gray-500 mt-1">Gerencie todos os pedidos da sua operação.</p>
        </div>

        <button className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800">
          + Novo pedido
        </button>
      </div>

      {/* Barra de busca/filtro */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Buscar por cliente ou número do pedido..."
          className="border border-gray-200 rounded-lg px-4 py-2 w-80 text-sm outline-none focus:border-emerald-500"
        />
        <select className="border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500">
          <option>Todos os status</option>
          <option>Aprovado</option>
          <option>Pendente</option>
          <option>Cancelado</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Pedido</th>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium">Valor</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr key={pedido.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-800">{pedido.id}</td>
                <td className="px-5 py-4 text-gray-600">{pedido.cliente}</td>
                <td className="px-5 py-4 text-gray-600">{pedido.data}</td>
                <td className="px-5 py-4 text-gray-800 font-medium">{pedido.valor}</td>
                <td className="px-5 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[pedido.status]}`}>
                    {pedido.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button className="text-gray-400 hover:text-gray-700">⋮</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Pedidos