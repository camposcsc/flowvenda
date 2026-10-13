import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Producao() {
  const [abaAtiva, setAbaAtiva] = useState('nova')

  const [producoes, setProducoes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const [materiaPrima, setMateriaPrima] = useState('')
  const [quantidadeUtilizada, setQuantidadeUtilizada] = useState('')
  const [dataProducao, setDataProducao] = useState(new Date().toISOString().split('T')[0])
  const [observacao, setObservacao] = useState('')

  const [lancamentoProduto, setLancamentoProduto] = useState({})
  const [lancamentoQuantidade, setLancamentoQuantidade] = useState({})
  const [mensagensLancamento, setMensagensLancamento] = useState({})

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    setCarregando(true)
    const [resProducoes, resProdutos] = await Promise.all([
      supabase.from('producoes').select('*').order('data_producao', { ascending: false }),
      supabase.from('produtos').select('*').order('nome', { ascending: true }),
    ])
    if (!resProducoes.error) setProducoes(resProducoes.data || [])
    if (!resProdutos.error) setProdutos(resProdutos.data || [])
    setCarregando(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMensagem('')

    if (!materiaPrima || !quantidadeUtilizada || !dataProducao) {
      setMensagem('Preencha a matéria-prima, a quantidade utilizada e a data.')
      return
    }

    setSalvando(true)

    const { error: erroInsercao } = await supabase.from('producoes').insert([
      {
        materia_prima: materiaPrima,
        quantidade_utilizada: Number(quantidadeUtilizada),
        data_producao: dataProducao,
        itens_gerados: [],
        descarte: 0,
        observacao: observacao || null,
        status: 'Em produção',
      },
    ])

    if (erroInsercao) {
      setMensagem('Erro ao salvar produção: ' + erroInsercao.message)
      setSalvando(false)
      return
    }

    const produtoMateriaPrima = produtos.find((p) => p.nome === materiaPrima)
    if (produtoMateriaPrima) {
      const novoEstoque = Number(produtoMateriaPrima.estoque || 0) - Number(quantidadeUtilizada)
      await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', produtoMateriaPrima.id)
    }

    setMateriaPrima('')
    setQuantidadeUtilizada('')
    setDataProducao(new Date().toISOString().split('T')[0])
    setObservacao('')
    setSalvando(false)
    buscarDados()
    setAbaAtiva('andamento')
  }

  function totalAlocado(producao) {
    return (producao.itens_gerados || []).reduce((soma, item) => soma + Number(item.quantidade || 0), 0)
  }

  function restanteDaProducao(producao) {
    return Number(producao.quantidade_utilizada) - totalAlocado(producao)
  }

  async function handleLancarProduto(producao) {
    const produtoEscolhido = lancamentoProduto[producao.id]
    const quantidadeDigitada = Number(lancamentoQuantidade[producao.id])
    const restante = restanteDaProducao(producao)

    setMensagensLancamento((prev) => ({ ...prev, [producao.id]: '' }))

    if (!produtoEscolhido) {
      setMensagensLancamento((prev) => ({ ...prev, [producao.id]: 'Selecione o produto gerado.' }))
      return
    }

    if (!quantidadeDigitada || quantidadeDigitada <= 0) {
      setMensagensLancamento((prev) => ({ ...prev, [producao.id]: 'Informe uma quantidade válida.' }))
      return
    }

    if (quantidadeDigitada > restante) {
      setMensagensLancamento((prev) => ({
        ...prev,
        [producao.id]: `Quantidade maior que o restante disponível (${restante.toLocaleString('pt-BR')} kg).`,
      }))
      return
    }

    const novoItem = {
      produto: produtoEscolhido,
      quantidade: quantidadeDigitada,
      data: new Date().toISOString(),
    }

    const novosItens = [...(producao.itens_gerados || []), novoItem]
    const novoRestante = restante - quantidadeDigitada
    const novoStatus = novoRestante <= 0 ? 'Concluído' : 'Em produção'
    const novoDescarte = novoStatus === 'Concluído' ? Math.max(novoRestante, 0) : 0

    const { error: erroUpdate } = await supabase
      .from('producoes')
      .update({ itens_gerados: novosItens, status: novoStatus, descarte: novoDescarte })
      .eq('id', producao.id)

    if (erroUpdate) {
      setMensagensLancamento((prev) => ({ ...prev, [producao.id]: 'Erro ao salvar: ' + erroUpdate.message }))
      return
    }

    const produtoGerado = produtos.find((p) => p.nome === produtoEscolhido)
    if (produtoGerado) {
      const novoEstoque = Number(produtoGerado.estoque || 0) + quantidadeDigitada
      await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', produtoGerado.id)
    }

    setLancamentoProduto((prev) => ({ ...prev, [producao.id]: '' }))
    setLancamentoQuantidade((prev) => ({ ...prev, [producao.id]: '' }))
    buscarDados()
  }

  async function handleFinalizarProducao(producao) {
    const restante = restanteDaProducao(producao)

    const confirmar = window.confirm(
      restante > 0
        ? `Ainda restam ${restante.toLocaleString('pt-BR')} kg não alocados. Ao finalizar, essa quantidade será registrada como descarte. Deseja continuar?`
        : 'Finalizar esta produção?'
    )
    if (!confirmar) return

    const { error } = await supabase
      .from('producoes')
      .update({ status: 'Concluído', descarte: Math.max(restante, 0) })
      .eq('id', producao.id)

    if (error) {
      setMensagensLancamento((prev) => ({ ...prev, [producao.id]: 'Erro ao finalizar: ' + error.message }))
      return
    }

    buscarDados()
  }

  function formatarData(dataISO) {
    if (!dataISO) return '-'
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  const producoesEmAndamento = producoes.filter((p) => p.status !== 'Concluído')
  const producoesConcluidas = producoes.filter((p) => p.status === 'Concluído')

  const abas = [
    { id: 'nova', label: 'Nova produção' },
    { id: 'andamento', label: `Em andamento (${producoesEmAndamento.length})` },
    { id: 'concluidas', label: `Concluídas (${producoesConcluidas.length})` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Produção</h2>
        <p className="text-gray-500 mt-1">Registre a transformação de matéria-prima em produtos finais.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {abas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              abaAtiva === aba.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'nova' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Nova produção</h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Matéria-prima utilizada</label>
                <select
                  value={materiaPrima}
                  onChange={(e) => setMateriaPrima(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.nome}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Quantidade utilizada (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={quantidadeUtilizada}
                  onChange={(e) => setQuantidadeUtilizada(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Data</label>
                <input
                  type="date"
                  value={dataProducao}
                  onChange={(e) => setDataProducao(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Observação (opcional)</label>
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: lote, identificação, observações gerais"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={salvando}
                className="bg-emerald-600 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Iniciar produção'}
              </button>
            </div>
          </form>

          {mensagem && <p className="text-sm mt-3 text-gray-600">{mensagem}</p>}
        </div>
      )}

      {abaAtiva === 'andamento' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Produções em andamento</h3>

          {carregando ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : producoesEmAndamento.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma produção em andamento.</p>
          ) : (
            <div className="space-y-5">
              {producoesEmAndamento.map((producao) => {
                const alocado = totalAlocado(producao)
                const restante = restanteDaProducao(producao)
                const percentual = Number(producao.quantidade_utilizada) > 0
                  ? Math.min((alocado / Number(producao.quantidade_utilizada)) * 100, 100)
                  : 0

                return (
                  <div key={producao.id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-800">
                          {producao.materia_prima} — {Number(producao.quantidade_utilizada).toLocaleString('pt-BR')} kg
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatarData(producao.data_producao)}{producao.observacao ? ` · ${producao.observacao}` : ''}
                        </p>
                      </div>
                      <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-50 text-amber-600">Em produção</span>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Produzido: {alocado.toLocaleString('pt-BR')} kg</span>
                        <span className="text-gray-500">Restante: {restante.toLocaleString('pt-BR')} kg</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400" style={{ width: `${percentual}%` }} />
                      </div>
                    </div>

                    {(producao.itens_gerados || []).length > 0 && (
                      <div className="mb-3 space-y-1">
                        {producao.itens_gerados.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                            <span className="text-gray-700">{item.produto}</span>
                            <span className="text-gray-500">{Number(item.quantidade).toLocaleString('pt-BR')} kg</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 items-center">
                      <select
                        value={lancamentoProduto[producao.id] || ''}
                        onChange={(e) => setLancamentoProduto((prev) => ({ ...prev, [producao.id]: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
                      >
                        <option value="">Produto gerado</option>
                        {produtos.map((p) => (
                          <option key={p.id} value={p.nome}>{p.nome}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Quantidade (kg)"
                        value={lancamentoQuantidade[producao.id] || ''}
                        onChange={(e) => setLancamentoQuantidade((prev) => ({ ...prev, [producao.id]: e.target.value }))}
                        className="w-40 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => handleLancarProduto(producao)}
                        className="bg-emerald-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-emerald-700 transition"
                      >
                        Lançar
                      </button>
                      <button
                        onClick={() => handleFinalizarProducao(producao)}
                        className="border border-gray-200 text-gray-600 rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-gray-50 transition"
                      >
                        Finalizar
                      </button>
                    </div>
                    {mensagensLancamento[producao.id] && (
                      <p className="text-xs text-red-500 mt-1">{mensagensLancamento[producao.id]}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'concluidas' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Produções concluídas</h3>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="px-6 py-3 font-medium">Data</th>
                <th className="px-6 py-3 font-medium">Matéria-prima</th>
                <th className="px-6 py-3 font-medium">Utilizado</th>
                <th className="px-6 py-3 font-medium">Produtos gerados</th>
                <th className="px-6 py-3 font-medium">Descarte</th>
                <th className="px-6 py-3 font-medium">Observação</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-gray-400">Carregando...</td>
                </tr>
              ) : producoesConcluidas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-gray-400">Nenhuma produção concluída ainda.</td>
                </tr>
              ) : (
                producoesConcluidas.map((producao) => (
                  <tr key={producao.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                    <td className="px-6 py-3 text-gray-600">{formatarData(producao.data_producao)}</td>
                    <td className="px-6 py-3 text-gray-800 font-medium">{producao.materia_prima}</td>
                    <td className="px-6 py-3 text-gray-600">{Number(producao.quantidade_utilizada).toLocaleString('pt-BR')} kg</td>
                    <td className="px-6 py-3 text-gray-600">
                      {(producao.itens_gerados || []).length === 0 ? (
                        <span className="text-gray-400">Nenhum</span>
                      ) : (
                        producao.itens_gerados.map((item, i) => (
                          <div key={i}>{item.produto}: {Number(item.quantidade).toLocaleString('pt-BR')} kg</div>
                        ))
                      )}
                    </td>
                    <td className="px-6 py-3 text-amber-600">{Number(producao.descarte).toLocaleString('pt-BR')} kg</td>
                    <td className="px-6 py-3 text-gray-600">{producao.observacao || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Producao