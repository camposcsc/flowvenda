import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)

  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas as categorias')

  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('Produto')
  const [preco, setPreco] = useState('')
  const [estoque, setEstoque] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    buscarProdutos()
  }, [])

  async function buscarProdutos() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log('Erro ao buscar produtos:', error)
      alert('Erro ao carregar produtos. Veja o console para detalhes.')
    } else {
      setProdutos(data)
    }
    setCarregando(false)
  }

  function calcularStatus(produto) {
    if (produto.categoria === 'Serviço') return 'Ativo'
    if (produto.estoque === 0) return 'Esgotado'
    if (produto.estoque <= 5) return 'Baixo estoque'
    return 'Ativo'
  }

  const statusStyle = {
    'Ativo': 'bg-emerald-50 text-emerald-700',
    'Baixo estoque': 'bg-yellow-50 text-yellow-700',
    'Esgotado': 'bg-red-50 text-red-700',
  }

  function formatarPreco(valor) {
    const numero = Number(valor) || 0
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const produtosFiltrados = produtos.filter((p) => {
    const bateBusca = (p.nome || '').toLowerCase().includes(busca.toLowerCase())
    const bateCategoria =
      filtroCategoria === 'Todas as categorias' || p.categoria === filtroCategoria
    return bateBusca && bateCategoria
  })

  const totalBaixoEstoque = produtos.filter((p) => calcularStatus(p) === 'Baixo estoque').length
  const totalEsgotado = produtos.filter((p) => calcularStatus(p) === 'Esgotado').length

  async function salvarProduto() {
    if (!nome.trim()) {
      alert('Informe o nome do produto ou serviço.')
      return
    }

    setSalvando(true)

    const { error } = await supabase.from('produtos').insert([
      {
        nome,
        categoria,
        preco: Number(preco) || 0,
        estoque: categoria === 'Serviço' ? 0 : Number(estoque) || 0,
      },
    ])

    setSalvando(false)

    if (error) {
      console.log('Erro ao salvar produto:', error)
      alert('Erro ao salvar produto. Veja o console para detalhes.')
      return
    }

    await buscarProdutos()
    fecharModal()
  }

  function fecharModal() {
    setModalAberto(false)
    setNome('')
    setCategoria('Produto')
    setPreco('')
    setEstoque('')
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Produtos e Serviços</h2>
          <p className="text-gray-500 mt-1">Gerencie seu catálogo de produtos e serviços.</p>
        </div>

        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
        >
          + Novo item
        </button>
      </div>

      {/* Busca e filtro */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Buscar produto ou serviço..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 w-80 text-sm outline-none focus:border-emerald-500"
        />
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500"
        >
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
          <p className="text-2xl font-bold text-yellow-600 mt-2">{totalBaixoEstoque}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-sm text-gray-500">Esgotados</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{totalEsgotado}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {carregando ? (
          <p className="p-6 text-gray-500 text-sm">Carregando produtos...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Categoria</th>
                <th className="px-5 py-3 font-medium">Preço</th>
                <th className="px-5 py-3 font-medium">Estoque</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.map((produto) => {
                const status = calcularStatus(produto)
                return (
                  <tr key={produto.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-800">{produto.nome}</td>
                    <td className="px-5 py-4 text-gray-600">{produto.categoria}</td>
                    <td className="px-5 py-4 text-gray-800 font-medium">
                      {formatarPreco(produto.preco)}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {produto.categoria === 'Serviço' ? '—' : produto.estoque}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[status]}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal novo item */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-4">Novo item</h3>

            <label className="text-sm text-gray-600 mb-1 block">Nome</label>
            <input
              type="text"
              placeholder="Nome do produto ou serviço"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <label className="text-sm text-gray-600 mb-1 block">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option>Produto</option>
              <option>Serviço</option>
            </select>

            <label className="text-sm text-gray-600 mb-1 block">Preço (R$)</label>
            <input
              type="number"
              placeholder="0,00"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {categoria === 'Produto' && (
              <>
                <label className="text-sm text-gray-600 mb-1 block">Estoque</label>
                <input
                  type="number"
                  placeholder="0"
                  value={estoque}
                  onChange={(e) => setEstoque(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={fecharModal}
                className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={salvarProduto}
                disabled={salvando}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Produtos