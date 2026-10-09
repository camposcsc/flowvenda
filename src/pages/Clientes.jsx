function Clientes() {
  const clientes = [
    { nome: 'Ana Souza', email: 'ana.souza@email.com', telefone: '(11) 98765-4321', pedidos: 12, status: 'Ativo' },
    { nome: 'Carlos Lima', email: 'carlos.lima@email.com', telefone: '(11) 91234-5678', pedidos: 5, status: 'Ativo' },
    { nome: 'Beatriz Alves', email: 'beatriz.alves@email.com', telefone: '(21) 99876-5432', pedidos: 8, status: 'Ativo' },
    { nome: 'João Pedro', email: 'joao.pedro@email.com', telefone: '(31) 98888-7777', pedidos: 2, status: 'Inativo' },
    { nome: 'Fernanda Dias', email: 'fernanda.dias@email.com', telefone: '(11) 97777-6666', pedidos: 20, status: 'Ativo' },
  ]

  const statusStyle = {
    Ativo: 'bg-emerald-50 text-emerald-700',
    Inativo: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
          <p className="text-gray-500 mt-1">Gerencie sua base de clientes.</p>
        </div>

        <button className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800">
          + Novo cliente
        </button>
      </div>

      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar cliente por nome ou e-mail..."
        className="border border-gray-200 rounded-lg px-4 py-2 w-80 text-sm outline-none focus:border-emerald-500"
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Total de clientes</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">{clientes.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Clientes ativos</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {clientes.filter((c) => c.status === 'Ativo').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Novos este mês</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">+12</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">E-mail</th>
              <th className="px-5 py-3 font-medium">Telefone</th>
              <th className="px-5 py-3 font-medium">Pedidos</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.email} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-800">{cliente.nome}</td>
                <td className="px-5 py-4 text-gray-600">{cliente.email}</td>
                <td className="px-5 py-4 text-gray-600">{cliente.telefone}</td>
                <td className="px-5 py-4 text-gray-600">{cliente.pedidos}</td>
                <td className="px-5 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[cliente.status]}`}>
                    {cliente.status}
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

export default Clientes