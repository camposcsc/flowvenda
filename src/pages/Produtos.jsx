function Produtos() {
  const produtos = [
    { nome: 'Consultoria Comercial', categoria: 'Serviço', preco: 'R$ 1.200,00', estoque: '—', status: 'Ativo' },
    { nome: 'Notebook Gamer X1', categoria: 'Produto', preco: 'R$ 4.890,00', estoque: 15, status: 'Ativo' },
    { nome: 'Suporte Técnico Mensal', categoria: 'Serviço', preco: 'R$ 350,00', estoque: '—', status: 'Ativo' },
    { nome: 'Monitor 27" 4K', categoria: 'Produto', preco: 'R$ 1.650,00', estoque: 3, status: 'Baixo estoque' },
    { nome: 'Cadeira Ergonômica', categoria: 'Produto', preco: 'R$ 980,00', estoque: 0, status: 'Esgotado' },
  ]

  const statusStyle = {
    'Ativo': 'bg-emerald-50 text-emerald-700',
    'Baixo estoque': 'bg-yellow-50 text-yellow-700',
    'Esgotado': 'bg-red-50 text-red-700',
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Produtos e Serviços</h2>
          <p className="text-gray-500 mt-1">Gerencie seu catálogo de produtos e serviços.</p>
        </div>

        <button className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800">
          + Novo item
        </button>
      </div>

      {/* Busca e filtro */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Buscar produto ou serviço..."
          className="border border-gray-200 rounded-lg px-4 py-2 w-80 text-sm outline-none focus:border-emerald-500"
        />
        <select className="border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500">
          <option>Todas as categorias</option>
          <option>Produto</option>
          <option>Serviço</option>
        </select>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Total de itens</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">{produtos.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Baixo estoque</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">
            {produtos.filter((p) => p.status === 'Baixo estoque').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Esgotados</p>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {produtos.filter((p) => p.status === 'Esgotado').length}
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Categoria</th>
              <th className="px-5 py-3 font-medium">Preço</th>
              <th className="px-5 py-3 font-medium">Estoque</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((produto) => (
              <tr key={produto.nome} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-800">{produto.nome}</td>
                <td className="px-5 py-4 text-gray-600">{produto.categoria}</td>
                <td className="px-5 py-4 text-gray-800 font-medium">{produto.preco}</td>
                <td className="px-5 py-4 text-gray-600">{produto.estoque}</td>
                <td className="px-5 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[produto.status]}`}>
                    {produto.status}
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

export default Produtos