import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx'
import { useUsuario } from '../context/UsuarioContext'

function Producao() {
  const usuario = useUsuario()
  const [abaAtiva, setAbaAtiva] = useState('nova')

  const [producoes, setProducoes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [clientesLista, setClientesLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [excluindoId, setExcluindoId] = useState(null)

  const [materiaPrima, setMateriaPrima] = useState('')
  const [quantidadeUtilizada, setQuantidadeUtilizada] = useState('')
  const [dataProducao, setDataProducao] = useState(new Date().toISOString().split('T')[0])
  const [cliente, setCliente] = useState('')
  const [observacao, setObservacao] = useState('')

  const [lancamentoProduto, setLancamentoProduto] = useState({})
  const [lancamentoQuantidade, setLancamentoQuantidade] = useState({})
  const [mensagensLancamento, setMensagensLancamento] = useState({})

  // Filtros do relatório (aba Concluídas)
  const [filtroMateriaPrima, setFiltroMateriaPrima] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    setCarregando(true)
    const [resProducoes, resProdutos, resClientes] = await Promise.all([
      supabase.from('producoes').select('*').order('data_producao', { ascending: false }),
      supabase.from('produtos').select('*').order('nome', { ascending: true }),
      supabase.from('clientes').select('*').order('nome', { ascending: true }),
    ])
    if (!resProducoes.error) setProducoes(resProducoes.data || [])
    if (!resProdutos.error) setProdutos(resProdutos.data || [])
    if (!resClientes.error) setClientesLista(resClientes.data || [])
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
        cliente: cliente || null,
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
    setCliente('')
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

  function totalDescarteLancado(itens) {
    return (itens || [])
      .filter((item) => item.produto === 'Descarte')
      .reduce((soma, item) => soma + Number(item.quantidade || 0), 0)
  }

  async function handleLancarProduto(producao) {
    const produtoEscolhido = lancamentoProduto[producao.id]
    const quantidadeDigitada = Number(lancamentoQuantidade[producao.id])
    const restante = restanteDaProducao(producao)

    setMensagensLancamento((prev) => ({ ...prev, [producao.id]: '' }))

    if (!produtoEscolhido) {
      setMensagensLancamento((prev) => ({ ...prev, [producao.id]: 'Selecione o produto gerado (ou Descarte).' }))
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

    const descarteAcumulado = totalDescarteLancado(novosItens)
    const novoDescarte = descarteAcumulado + (novoStatus === 'Concluído' ? Math.max(novoRestante, 0) : 0)

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

    const descarteJaLancado = totalDescarteLancado(producao.itens_gerados)
    const novoDescarteTotal = descarteJaLancado + Math.max(restante, 0)

    const { error } = await supabase
      .from('producoes')
      .update({ status: 'Concluído', descarte: novoDescarteTotal })
      .eq('id', producao.id)

    if (error) {
      setMensagensLancamento((prev) => ({ ...prev, [producao.id]: 'Erro ao finalizar: ' + error.message }))
      return
    }

    if (restante > 0) {
      const produtoDescarte = produtos.find((p) => p.nome === 'Descarte')
      if (produtoDescarte) {
        const novoEstoque = Number(produtoDescarte.estoque || 0) + restante
        await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', produtoDescarte.id)
      }
    }

    buscarDados()
  }

  // ---------- EXCLUIR PRODUÇÃO (somente admin) ----------
  async function handleExcluirProducao(producao) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir esta produção de ${producao.materia_prima} (${Number(producao.quantidade_utilizada).toLocaleString('pt-BR')} kg)? Essa ação não pode ser desfeita e não devolve automaticamente o estoque movimentado.`
    )
    if (!confirmar) return

    setExcluindoId(producao.id)

    const { error } = await supabase.from('producoes').delete().eq('id', producao.id)

    setExcluindoId(null)

    if (error) {
      console.log('Erro ao excluir produção:', error)
      alert('Erro ao excluir produção. Veja o console para detalhes.')
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

  // ---------- FILTROS DO RELATÓRIO ----------
  const materiasPrimasUnicas = [...new Set(producoesConcluidas.map((p) => p.materia_prima))].sort()

  const producoesFiltradas = producoesConcluidas.filter((p) => {
    const bateMateriaPrima = !filtroMateriaPrima || p.materia_prima === filtroMateriaPrima
    const bateCliente = !filtroCliente || p.cliente === filtroCliente
    const bateInicio = !filtroDataInicio || p.data_producao >= filtroDataInicio
    const bateFim = !filtroDataFim || p.data_producao <= filtroDataFim
    return bateMateriaPrima && bateCliente && bateInicio && bateFim
  })

  function limparFiltros() {
    setFiltroMateriaPrima('')
    setFiltroCliente('')
    setFiltroDataInicio('')
    setFiltroDataFim('')
  }

  const totalUtilizadoFiltrado = producoesFiltradas.reduce(
    (soma, p) => soma + Number(p.quantidade_utilizada || 0),
    0
  )
  const totalDescarteFiltrado = producoesFiltradas.reduce(
    (soma, p) => soma + Number(p.descarte || 0),
    0
  )

  function listarItensSemDescarteTexto(producao) {
    const itens = (producao.itens_gerados || []).filter((item) => item.produto !== 'Descarte')
    if (itens.length === 0) return '—'
    return itens.map((item) => `${item.produto}: ${Number(item.quantidade).toLocaleString('pt-BR')} kg`).join(' | ')
  }

  // ---------- FICHA DE PRODUÇÃO (impressão para a equipe anotar à caneta) ----------
  function imprimirFichaProducao(producao) {
    const alocado = totalAlocado(producao)
    const restante = restanteDaProducao(producao)

    const linhasLancadas = (producao.itens_gerados || [])
      .map((item) => {
        const dataItem = item.data ? new Date(item.data).toLocaleString('pt-BR') : '-'
        const nomeProduto = item.produto === 'Descarte' ? '⚠️ Descarte / perda' : item.produto
        return `
          <tr>
            <td>${dataItem}</td>
            <td>${nomeProduto}</td>
            <td style="text-align:right">${Number(item.quantidade).toLocaleString('pt-BR')} kg</td>
          </tr>
        `
      })
      .join('')

    const linhasEmBranco = Array.from({ length: 10 })
      .map(
        () => `
        <tr>
          <td class="celula-vazia"></td>
          <td class="celula-vazia"></td>
          <td class="celula-vazia"></td>
          <td class="celula-vazia"></td>
        </tr>
      `
      )
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Ficha de Produção</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; padding: 30px; }
          .cabecalho { border-bottom: 3px solid #059669; padding-bottom: 12px; margin-bottom: 16px; }
          .titulo-ficha { color: #059669; font-size: 22px; margin: 0; }
          .subtitulo-ficha { color: #6b7280; font-size: 12px; margin-top: 4px; }
          .info-producao { background: #f0fdf4; border: 1px solid #d1fae5; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; }
          .info-producao p { margin: 4px 0; }
          .info-producao strong { color: #065f46; }
          .destaque-restante { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; border-radius: 8px; padding: 12px 18px; font-size: 14px; font-weight: bold; margin-bottom: 20px; }
          h3 { color: #111827; font-size: 14px; margin-bottom: 8px; margin-top: 24px; }
          table.tabela-lancados { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          table.tabela-lancados th, table.tabela-lancados td { border: 1px solid #e5e7eb; padding: 6px 10px; font-size: 12px; }
          table.tabela-lancados th { background: #f0fdf4; color: #065f46; text-align: left; }
          table.tabela-anotacao { width: 100%; border-collapse: collapse; margin-top: 6px; }
          table.tabela-anotacao th { background: #e5e7eb; font-size: 12px; padding: 8px 10px; text-align: left; }
          table.tabela-anotacao td.celula-vazia { border: 1px solid #d1d5db; height: 34px; }
          .observacoes { margin-top: 24px; }
          .linha-observacao { border-bottom: 1px solid #d1d5db; height: 26px; margin-top: 14px; }
          .rodape { margin-top: 30px; font-size: 11px; color: #9ca3af; text-align: center; }
          @media print {
            table.tabela-anotacao { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="cabecalho">
          <p class="titulo-ficha">📋 Ficha de Produção</p>
          <p class="subtitulo-ficha">Documento interno para controle manual da equipe de produção</p>
        </div>

        <div class="info-producao">
          <p><strong>Produção nº:</strong> ${producao.id}</p>
          <p><strong>Matéria-prima:</strong> ${producao.materia_prima}</p>
          <p><strong>Quantidade total a utilizar:</strong> ${Number(producao.quantidade_utilizada).toLocaleString('pt-BR')} kg</p>
          <p><strong>Cliente / destino:</strong> ${producao.cliente || 'Produção para estoque (sem cliente definido)'}</p>
          <p><strong>Data da produção:</strong> ${formatarData(producao.data_producao)}</p>
          ${producao.observacao ? `<p><strong>Observação:</strong> ${producao.observacao}</p>` : ''}
          <p><strong>Impresso em:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <div class="destaque-restante">
          Já produzido: ${alocado.toLocaleString('pt-BR')} kg &nbsp;·&nbsp; Restante a produzir: ${restante.toLocaleString('pt-BR')} kg
        </div>

        ${linhasLancadas ? `
          <h3>Produtos já lançados no sistema</h3>
          <table class="tabela-lancados">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Produto</th>
                <th style="text-align:right">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              ${linhasLancadas}
            </tbody>
          </table>
        ` : ''}

        <h3>Anotação manual conforme a produção for sendo feita</h3>
        <table class="tabela-anotacao">
          <thead>
            <tr>
              <th style="width:25%">Data/Hora</th>
              <th style="width:25%">Produto gerado</th>
              <th style="width:25%">Quantidade produzida (kg)</th>
              <th style="width:25%">Responsável</th>
            </tr>
          </thead>
          <tbody>
            ${linhasEmBranco}
          </tbody>
        </table>

        <div class="observacoes">
          <h3>Observações</h3>
          <div class="linha-observacao"></div>
          <div class="linha-observacao"></div>
          <div class="linha-observacao"></div>
        </div>

        <div class="rodape">
          Ficha de uso interno — anote à caneta conforme a produção for sendo feita e lance depois no sistema.
        </div>
      </body>
      </html>
    `

    const janela = window.open('', '_blank')
    janela.document.write(html)
    janela.document.close()
    janela.focus()
    setTimeout(() => janela.print(), 300)
  }

  // ---------- IMPRIMIR RELATÓRIO ----------
  function imprimirRelatorio() {
    const linhas = producoesFiltradas
      .map(
        (p) => `
        <tr>
          <td>${formatarData(p.data_producao)}</td>
          <td>${p.materia_prima}</td>
          <td>${p.cliente || '—'}</td>
          <td style="text-align:right">${Number(p.quantidade_utilizada).toLocaleString('pt-BR')} kg</td>
          <td>${listarItensSemDescarteTexto(p)}</td>
          <td style="text-align:right">${Number(p.descarte).toLocaleString('pt-BR')} kg</td>
          <td>${p.observacao || '-'}</td>
        </tr>
      `
      )
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Relatório de Produção</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; padding: 30px; }
          h1 { color: #059669; font-size: 20px; margin-bottom: 4px; }
          p.subtitulo { color: #6b7280; font-size: 12px; margin-top: 0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; text-align: left; }
          th { background: #f0fdf4; color: #065f46; text-transform: uppercase; font-size: 11px; }
          .resumo { margin-top: 16px; font-size: 13px; }
          .resumo strong { color: #065f46; }
        </style>
      </head>
      <body>
        <h1>Relatório de Produção</h1>
        <p class="subtitulo">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Matéria-prima</th>
              <th>Cliente</th>
              <th style="text-align:right">Utilizado</th>
              <th>Produtos gerados</th>
              <th style="text-align:right">Descarte</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            ${linhas || '<tr><td colspan="7" style="text-align:center;color:#9ca3af">Nenhum registro encontrado</td></tr>'}
          </tbody>
        </table>
        <div class="resumo">
          <p>Total de produções: <strong>${producoesFiltradas.length}</strong></p>
          <p>Total utilizado: <strong>${totalUtilizadoFiltrado.toLocaleString('pt-BR')} kg</strong></p>
          <p>Total descarte: <strong>${totalDescarteFiltrado.toLocaleString('pt-BR')} kg</strong></p>
        </div>
      </body>
      </html>
    `

    const janela = window.open('', '_blank')
    janela.document.write(html)
    janela.document.close()
    janela.focus()
    setTimeout(() => janela.print(), 300)
  }

  // ---------- EXPORTAR EXCEL ----------
  function exportarExcel() {
    const linhasProducoes = producoesFiltradas.map((p) => ({
      Data: formatarData(p.data_producao),
      'Matéria-prima': p.materia_prima,
      Cliente: p.cliente || '—',
      'Utilizado (kg)': Number(p.quantidade_utilizada),
      'Produtos gerados': listarItensSemDescarteTexto(p),
      'Descarte (kg)': Number(p.descarte),
      Observação: p.observacao || '-',
    }))

    const linhasResumo = [
      { Indicador: 'Total de produções', Valor: producoesFiltradas.length },
      { Indicador: 'Total utilizado (kg)', Valor: totalUtilizadoFiltrado },
      { Indicador: 'Total descarte (kg)', Valor: totalDescarteFiltrado },
    ]

    const planilha = XLSX.utils.book_new()
    const abaProducoes = XLSX.utils.json_to_sheet(linhasProducoes)
    const abaResumo = XLSX.utils.json_to_sheet(linhasResumo)

    XLSX.utils.book_append_sheet(planilha, abaProducoes, 'Produções')
    XLSX.utils.book_append_sheet(planilha, abaResumo, 'Resumo')

    XLSX.writeFile(planilha, `relatorio-producao-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Cliente / destino (opcional)</label>
                <select
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">Produção para estoque (sem cliente definido)</option>
                  {clientesLista.map((c) => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
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
                          {formatarData(producao.data_producao)}
                          {producao.cliente ? ` · Cliente: ${producao.cliente}` : ' · Sem cliente definido'}
                          {producao.observacao ? ` · ${producao.observacao}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-50 text-amber-600">Em produção</span>
                        <button
                          onClick={() => imprimirFichaProducao(producao)}
                          className="text-gray-500 hover:text-gray-700 text-xs font-medium hover:underline"
                        >
                          📋 Ficha de produção
                        </button>
                        {usuario?.admin && (
                          <button
                            onClick={() => handleExcluirProducao(producao)}
                            disabled={excluindoId === producao.id}
                            className="text-red-500 hover:text-red-700 text-xs font-medium hover:underline disabled:opacity-50"
                          >
                            {excluindoId === producao.id ? 'Excluindo...' : '🗑 Excluir'}
                          </button>
                        )}
                      </div>
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
                          <div
                            key={i}
                            className={`flex justify-between text-sm rounded px-3 py-1.5 ${
                              item.produto === 'Descarte' ? 'bg-amber-50' : 'bg-gray-50'
                            }`}
                          >
                            <span className={item.produto === 'Descarte' ? 'text-amber-700' : 'text-gray-700'}>
                              {item.produto === 'Descarte' ? '⚠️ Descarte' : item.produto}
                            </span>
                            <span className={item.produto === 'Descarte' ? 'text-amber-600' : 'text-gray-500'}>
                              {Number(item.quantidade).toLocaleString('pt-BR')} kg
                            </span>
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
                        <option value="Descarte">⚠️ Descarte / perda</option>
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
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Relatório de produção</h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Matéria-prima</label>
                <select
                  value={filtroMateriaPrima}
                  onChange={(e) => setFiltroMateriaPrima(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">Todas</option>
                  {materiasPrimasUnicas.map((mp) => (
                    <option key={mp} value={mp}>{mp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Cliente</label>
                <select
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">Todos</option>
                  {clientesLista.map((c) => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Data início</label>
                <input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Data fim</label>
                <input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={limparFiltros}
                  className="w-full border border-gray-200 text-gray-600 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Limpar filtros
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <div className="text-sm text-gray-500">
                {producoesFiltradas.length} registro(s) · Total utilizado: <strong className="text-gray-700">{totalUtilizadoFiltrado.toLocaleString('pt-BR')} kg</strong> · Total descarte: <strong className="text-amber-600">{totalDescarteFiltrado.toLocaleString('pt-BR')} kg</strong>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={imprimirRelatorio}
                  className="border border-gray-200 text-gray-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition"
                >
                  🖨 Imprimir
                </button>
                <button
                  onClick={exportarExcel}
                  className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 transition"
                >
                  📊 Exportar Excel
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Produções concluídas</h3>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Data</th>
                  <th className="px-6 py-3 font-medium">Matéria-prima</th>
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-6 py-3 font-medium">Utilizado</th>
                  <th className="px-6 py-3 font-medium">Produtos gerados</th>
                  <th className="px-6 py-3 font-medium">Descarte</th>
                  <th className="px-6 py-3 font-medium">Observação</th>
                  {usuario?.admin && <th className="px-6 py-3 font-medium">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan={usuario?.admin ? 8 : 7} className="px-6 py-6 text-center text-gray-400">Carregando...</td>
                  </tr>
                ) : producoesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={usuario?.admin ? 8 : 7} className="px-6 py-6 text-center text-gray-400">Nenhuma produção encontrada.</td>
                  </tr>
                ) : (
                  producoesFiltradas.map((producao) => {
                    const itensSemDescarte = (producao.itens_gerados || []).filter((item) => item.produto !== 'Descarte')
                    return (
                      <tr key={producao.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                        <td className="px-6 py-3 text-gray-600">{formatarData(producao.data_producao)}</td>
                        <td className="px-6 py-3 text-gray-800 font-medium">{producao.materia_prima}</td>
                        <td className="px-6 py-3 text-gray-600">{producao.cliente || '—'}</td>
                        <td className="px-6 py-3 text-gray-600">{Number(producao.quantidade_utilizada).toLocaleString('pt-BR')} kg</td>
                        <td className="px-6 py-3 text-gray-600">
                          {itensSemDescarte.length === 0 ? (
                            <span className="text-gray-400">Nenhum</span>
                          ) : (
                            itensSemDescarte.map((item, i) => (
                              <div key={i}>{item.produto}: {Number(item.quantidade).toLocaleString('pt-BR')} kg</div>
                            ))
                          )}
                        </td>
                        <td className="px-6 py-3 text-amber-600">{Number(producao.descarte).toLocaleString('pt-BR')} kg</td>
                        <td className="px-6 py-3 text-gray-600">{producao.observacao || '-'}</td>
                        {usuario?.admin && (
                          <td className="px-6 py-3">
                            <button
                              onClick={() => handleExcluirProducao(producao)}
                              disabled={excluindoId === producao.id}
                              className="text-red-500 hover:text-red-700 text-xs font-medium hover:underline disabled:opacity-50"
                            >
                              {excluindoId === producao.id ? 'Excluindo...' : 'Excluir'}
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Producao