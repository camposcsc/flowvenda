import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx'
import { useUsuario } from '../context/UsuarioContext'

function Entradas() {
  const usuario = useUsuario()

  const [entradas, setEntradas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [excluindoId, setExcluindoId] = useState(null)

  const [form, setForm] = useState({
    produto: '',
    quantidade: '',
    data_entrada: new Date().toISOString().split('T')[0],
    fornecedor: '',
    observacao: '',
  })

  const [filtroProduto, setFiltroProduto] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    setCarregando(true)
    const [resEntradas, resProdutos] = await Promise.all([
      supabase.from('entradas_estoque').select('*').order('data_entrada', { ascending: false }),
      supabase.from('produtos').select('*').order('nome', { ascending: true }),
    ])
    if (!resEntradas.error) setEntradas(resEntradas.data || [])
    if (!resProdutos.error) setProdutos(resProdutos.data || [])
    setCarregando(false)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.produto || !form.quantidade || !form.data_entrada) {
      setMensagem('Preencha produto, quantidade e data.')
      return
    }

    setSalvando(true)
    setMensagem('')

    const quantidadeNumero = Number(form.quantidade)

    const { error: erroInsercao } = await supabase.from('entradas_estoque').insert([
      {
        produto: form.produto,
        quantidade: quantidadeNumero,
        data_entrada: form.data_entrada,
        fornecedor: form.fornecedor || null,
        observacao: form.observacao || null,
      },
    ])

    if (erroInsercao) {
      setMensagem('Erro ao salvar entrada: ' + erroInsercao.message)
      setSalvando(false)
      return
    }

    const produtoSelecionado = produtos.find((p) => p.nome === form.produto)

    if (produtoSelecionado) {
      const novoEstoque = Number(produtoSelecionado.estoque || 0) + quantidadeNumero

      const { error: erroEstoque } = await supabase
        .from('produtos')
        .update({ estoque: novoEstoque })
        .eq('id', produtoSelecionado.id)

      if (erroEstoque) {
        setMensagem('Entrada salva, mas houve erro ao atualizar o estoque: ' + erroEstoque.message)
      }
    }

    setForm({
      produto: '',
      quantidade: '',
      data_entrada: new Date().toISOString().split('T')[0],
      fornecedor: '',
      observacao: '',
    })

    setSalvando(false)
    if (!mensagem) setMensagem('Entrada registrada com sucesso!')
    buscarDados()
  }

  async function handleExcluirEntrada(entrada) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir a entrada de "${entrada.produto}" (${Number(entrada.quantidade).toLocaleString('pt-BR')} kg)?\n\nEssa ação não devolve automaticamente a quantidade do estoque do produto.`
    )
    if (!confirmar) return

    setExcluindoId(entrada.id)

    const { error } = await supabase.from('entradas_estoque').delete().eq('id', entrada.id)

    if (error) {
      alert('Erro ao excluir entrada: ' + error.message)
      setExcluindoId(null)
      return
    }

    setExcluindoId(null)
    buscarDados()
  }

  function formatarData(dataISO) {
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  const entradasFiltradas = useMemo(() => {
    return entradas.filter((entrada) => {
      if (filtroProduto && entrada.produto !== filtroProduto) return false
      if (filtroDataInicio && entrada.data_entrada < filtroDataInicio) return false
      if (filtroDataFim && entrada.data_entrada > filtroDataFim) return false
      return true
    })
  }, [entradas, filtroProduto, filtroDataInicio, filtroDataFim])

  const totalQuantidade = entradasFiltradas.reduce((soma, e) => soma + Number(e.quantidade || 0), 0)

  function limparFiltros() {
    setFiltroProduto('')
    setFiltroDataInicio('')
    setFiltroDataFim('')
  }

  function handleExportarExcel() {
    const dados = entradasFiltradas.map((e) => ({
      Data: formatarData(e.data_entrada),
      Produto: e.produto,
      'Quantidade (kg)': Number(e.quantidade),
      Fornecedor: e.fornecedor || '-',
      Observação: e.observacao || '-',
    }))

    const planilha = XLSX.utils.json_to_sheet(dados)
    const livro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(livro, planilha, 'Entradas')

    const resumo = [
      { Indicador: 'Total de entradas', Valor: entradasFiltradas.length },
      { Indicador: 'Total de quantidade (kg)', Valor: totalQuantidade },
    ]
    const planilhaResumo = XLSX.utils.json_to_sheet(resumo)
    XLSX.utils.book_append_sheet(livro, planilhaResumo, 'Resumo')

    XLSX.writeFile(livro, `entradas-estoque-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  function handleImprimir() {
    const linhas = entradasFiltradas
      .map(
        (e) => `
        <tr>
          <td>${formatarData(e.data_entrada)}</td>
          <td>${e.produto}</td>
          <td>${Number(e.quantidade).toLocaleString('pt-BR')} kg</td>
          <td>${e.fornecedor || '-'}</td>
          <td>${e.observacao || '-'}</td>
        </tr>`
      )
      .join('')

    const html = `
      <html>
        <head>
          <title>Relatório de Entradas</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            p { color: #6b7280; font-size: 13px; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            th { color: #6b7280; font-weight: 600; }
            .resumo { margin-top: 16px; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>Relatório de Entradas de Mercadoria</h1>
          <p>Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Fornecedor</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              ${linhas}
            </tbody>
          </table>
          <div class="resumo">
            <strong>Total de entradas:</strong> ${entradasFiltradas.length} &nbsp;&nbsp;
            <strong>Total em quantidade:</strong> ${totalQuantidade.toLocaleString('pt-BR')} kg
          </div>
        </body>
      </html>
    `

    const janela = window.open('', '_blank')
    janela.document.write(html)
    janela.document.close()
    janela.focus()
    janela.print()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Entradas de mercadoria</h2>
        <p className="text-gray-500 mt-1">Registre as compras e acompanhe a entrada de produtos no estoque.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Nova entrada</h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-500 mb-1">Produto</label>
            <select
              name="produto"
              value={form.produto}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">Selecione um produto</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.nome}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Quantidade (kg)</label>
            <input
              type="number"
              step="0.01"
              name="quantidade"
              value={form.quantidade}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Data</label>
            <input
              type="date"
              name="data_entrada"
              value={form.data_entrada}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Fornecedor</label>
            <input
              type="text"
              name="fornecedor"
              value={form.fornecedor}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-sm text-gray-500 mb-1">Observação (opcional)</label>
            <input
              type="text"
              name="observacao"
              value={form.observacao}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Registrar entrada'}
            </button>
          </div>
        </form>

        {mensagem && (
          <p className="text-sm mt-3 text-gray-600">{mensagem}</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Filtros do relatório</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Produto</label>
            <select
              value={filtroProduto}
              onChange={(e) => setFiltroProduto(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">Todos</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.nome}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Data início</label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Data fim</label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={limparFiltros}
            className="border border-gray-200 text-gray-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition"
          >
            Limpar filtros
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleImprimir}
              className="flex-1 border border-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition"
            >
              Imprimir
            </button>
            <button
              onClick={handleExportarExcel}
              className="flex-1 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 transition"
            >
              Exportar Excel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Histórico de entradas</h3>
          <span className="text-sm text-gray-500">
            {entradasFiltradas.length} registro(s) — {totalQuantidade.toLocaleString('pt-BR')} kg
          </span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="px-6 py-3 font-medium">Data</th>
              <th className="px-6 py-3 font-medium">Produto</th>
              <th className="px-6 py-3 font-medium">Quantidade</th>
              <th className="px-6 py-3 font-medium">Fornecedor</th>
              <th className="px-6 py-3 font-medium">Observação</th>
              {usuario?.admin && (
                <th className="px-6 py-3 font-medium">Ações</th>
              )}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={usuario?.admin ? 6 : 5} className="px-6 py-6 text-center text-gray-400">Carregando...</td>
              </tr>
            ) : entradasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={usuario?.admin ? 6 : 5} className="px-6 py-6 text-center text-gray-400">Nenhuma entrada encontrada.</td>
              </tr>
            ) : (
              entradasFiltradas.map((entrada) => (
                <tr key={entrada.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-600">{formatarData(entrada.data_entrada)}</td>
                  <td className="px-6 py-3 text-gray-800 font-medium">{entrada.produto}</td>
                  <td className="px-6 py-3 text-gray-600">{Number(entrada.quantidade).toLocaleString('pt-BR')} kg</td>
                  <td className="px-6 py-3 text-gray-600">{entrada.fornecedor || '-'}</td>
                  <td className="px-6 py-3 text-gray-600">{entrada.observacao || '-'}</td>
                  {usuario?.admin && (
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleExcluirEntrada(entrada)}
                        disabled={excluindoId === entrada.id}
                        className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                      >
                        {excluindoId === entrada.id ? 'Excluindo...' : '🗑 Excluir'}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Entradas