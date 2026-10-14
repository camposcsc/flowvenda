import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useUsuario } from '../context/UsuarioContext'

function Pedidos() {
  const usuario = useUsuario()
  const [pedidos, setPedidos] = useState([])
  const [clientesLista, setClientesLista] = useState([])
  const [produtosLista, setProdutosLista] = useState([])
  const [empresa, setEmpresa] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos os status')

  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  const [itensNovoPedido, setItensNovoPedido] = useState([{ produto: '', quantidade: '' }])
  const [dataEntrega, setDataEntrega] = useState('')

  const [modalProducaoAberto, setModalProducaoAberto] = useState(false)
  const [pedidoProducao, setPedidoProducao] = useState(null)
  const [quantidadesProduzidas, setQuantidadesProduzidas] = useState({})
  const [notaFiscalEntrega, setNotaFiscalEntrega] = useState('')

  const [modalNFAberto, setModalNFAberto] = useState(false)
  const [pedidoNF, setPedidoNF] = useState(null)
  const [numeroNF, setNumeroNF] = useState('')

  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false)
  const [pedidoDetalhes, setPedidoDetalhes] = useState(null)

  const [excluindoId, setExcluindoId] = useState(null)

  useEffect(() => {
    buscarPedidos()
    buscarClientes()
    buscarProdutos()
    buscarEmpresa()
  }, [])

  async function buscarPedidos() {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setPedidos(data)
  }

  async function buscarClientes() {
    const { data, error } = await supabase.from('clientes').select('*')
    if (error) {
      console.log('Erro ao buscar clientes:', error)
      return
    }
    const ordenado = [...data].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    setClientesLista(ordenado)
  }

  async function buscarProdutos() {
    const { data, error } = await supabase.from('produtos').select('*')
    if (error) {
      console.log('Erro ao buscar produtos:', error)
      return
    }
    const ordenado = [...data].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    setProdutosLista(ordenado)
  }

  async function buscarEmpresa() {
    const { data, error } = await supabase.from('empresa').select('*').limit(1)
    if (error) {
      console.log('Erro ao buscar empresa:', error)
      return
    }
    if (data && data.length > 0) {
      setEmpresa(data[0])
    }
  }

  function gerarNumeroPedido(id) {
    return `PV-2026-${String(id).padStart(5, '0')}`
  }

  function formatarData(dataISO) {
    const d = new Date(dataISO)
    return d.toLocaleDateString('pt-BR')
  }

  function formatarDataHora(dataISO) {
    const d = new Date(dataISO)
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // ---------- FORMATAR DATA SIMPLES (campo tipo "date", sem hora/fuso) ----------
  function formatarDataSimples(dataISO) {
    if (!dataISO) return '-'
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  // ---------- CÁLCULO DE PROGRESSO DO PEDIDO ----------
  function totalProduzido(pedido) {
    return pedido.itens.reduce((soma, item) => soma + Number(item.produzido || 0), 0)
  }

  // ---------- TEXTO DE STATUS EXIBIDO (não altera o valor interno salvo no banco) ----------
  function labelStatus(pedido) {
    if (pedido.status === 'Concluído') return 'Entregue'
    const produzido = totalProduzido(pedido)
    if (produzido > 0) return 'Em andamento'
    return 'Pendente'
  }

  function corStatus(labelTexto) {
    if (labelTexto === 'Entregue') return 'bg-green-100 text-green-700'
    if (labelTexto === 'Em andamento') return 'bg-blue-100 text-blue-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  // ---------- CÁLCULO DE PRAZO DE ENTREGA ----------
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

  function infoEntrega(pedido) {
    if (!pedido.data_entrega) return null
    if (pedido.status === 'Concluído') return null
    const dias = diasParaEntrega(pedido)
    if (dias < 0) return { texto: `⏰ Atrasado há ${Math.abs(dias)} dia(s)`, cor: 'bg-red-100 text-red-700' }
    if (dias === 0) return { texto: '⏰ Entrega é hoje', cor: 'bg-orange-100 text-orange-700' }
    if (dias <= 3) return { texto: `⏰ Entrega em ${dias} dia(s)`, cor: 'bg-yellow-100 text-yellow-700' }
    return null
  }

  // ---------- LISTA DE ENTREGAS/NFS DE UM PEDIDO (a partir do histórico dos itens) ----------
  function todasEntregas(pedido) {
    const lista = []
    pedido.itens.forEach((item) => {
      ;(item.historico || []).forEach((h) => {
        lista.push({
          produto: item.produto,
          quantidade: h.quantidade,
          data: h.data,
          nota_fiscal: h.nota_fiscal || null,
        })
      })
    })
    return lista.sort((a, b) => new Date(a.data) - new Date(b.data))
  }

  function notasFiscaisDoPedido(pedido) {
    const entregas = todasEntregas(pedido)
    const nfs = entregas.map((e) => e.nota_fiscal).filter(Boolean)
    const unicos = [...new Set(nfs)]
    if (unicos.length === 0 && pedido.nota_fiscal) {
      return [pedido.nota_fiscal]
    }
    return unicos
  }

  // ---------- NOVO PEDIDO ----------
  function abrirModalNovoPedido() {
    setClienteSelecionado('')
    setItensNovoPedido([{ produto: '', quantidade: '' }])
    setDataEntrega('')
    setModalNovoAberto(true)
  }

  function adicionarLinhaItem() {
    setItensNovoPedido([...itensNovoPedido, { produto: '', quantidade: '' }])
  }

  function removerLinhaItem(index) {
    setItensNovoPedido(itensNovoPedido.filter((_, i) => i !== index))
  }

  function atualizarItemNovoPedido(index, campo, valor) {
    const novos = [...itensNovoPedido]
    novos[index][campo] = valor
    setItensNovoPedido(novos)
  }

  async function salvarNovoPedido() {
    if (!clienteSelecionado) {
      alert('Selecione um cliente')
      return
    }
    const itensValidos = itensNovoPedido.filter(i => i.produto && i.quantidade)
    if (itensValidos.length === 0) {
      alert('Adicione pelo menos um item com quantidade')
      return
    }

    const itensFormatados = itensValidos.map(i => ({
      produto: i.produto,
      quantidade: Number(i.quantidade),
      produzido: 0,
      historico: []
    }))

    const { error } = await supabase.from('pedidos').insert([{
      cliente: clienteSelecionado,
      itens: itensFormatados,
      status: 'Em produção',
      nota_fiscal: null,
      data_entrega: dataEntrega || null
    }])

    if (error) {
      alert('Erro ao salvar pedido: ' + error.message)
      return
    }

    setModalNovoAberto(false)
    buscarPedidos()
  }

  // ---------- REGISTRAR ENTREGA (com nota fiscal própria desta entrega) ----------
  function abrirModalProducao(pedido) {
    setPedidoProducao(pedido)
    setQuantidadesProduzidas({})
    setNotaFiscalEntrega('')
    setModalProducaoAberto(true)
  }

  function atualizarQuantidadeProduzida(index, valor, falta) {
    let numero = Number(valor)

    if (valor === '') {
      setQuantidadesProduzidas({ ...quantidadesProduzidas, [index]: '' })
      return
    }

    if (numero < 0) numero = 0
    if (numero > falta) {
      numero = falta
      alert(`Você não pode produzir mais do que falta (${falta}kg).`)
    }

    setQuantidadesProduzidas({ ...quantidadesProduzidas, [index]: numero })
  }

  // Abate o estoque só das quantidades entregues NESTA entrega (não do total do pedido)
  async function abaterEstoqueItens(itensEntreguesAgora) {
    for (const item of itensEntreguesAgora) {
      const quantidade = Number(item.quantidade || 0)
      if (quantidade <= 0) continue

      const produto = produtosLista.find((p) => p.nome === item.produto)
      if (!produto) continue

      const novoEstoque = Number(produto.estoque || 0) - quantidade

      const { error } = await supabase
        .from('produtos')
        .update({ estoque: novoEstoque })
        .eq('id', produto.id)

      if (error) {
        console.log(`Erro ao abater estoque do produto ${item.produto}:`, error)
      }
    }
  }

  async function salvarProducao() {
    if (!notaFiscalEntrega.trim()) {
      alert('Informe o número da nota fiscal desta entrega.')
      return
    }

    const agora = new Date().toISOString()
    const itensEntreguesAgora = []

    const itensAtualizados = pedidoProducao.itens.map((item, index) => {
      const falta = item.quantidade - (item.produzido || 0)
      let qtdDigitada = Number(quantidadesProduzidas[index] || 0)

      if (qtdDigitada > falta) qtdDigitada = falta
      if (qtdDigitada < 0) qtdDigitada = 0

      if (qtdDigitada > 0) {
        itensEntreguesAgora.push({ produto: item.produto, quantidade: qtdDigitada })
        return {
          ...item,
          produzido: (item.produzido || 0) + qtdDigitada,
          historico: [
            ...(item.historico || []),
            { quantidade: qtdDigitada, data: agora, nota_fiscal: notaFiscalEntrega.trim() }
          ]
        }
      }
      return item
    })

    if (itensEntreguesAgora.length === 0) {
      alert('Informe ao menos uma quantidade a entregar.')
      return
    }

    const tudoProduzido = itensAtualizados.every(item => item.produzido >= item.quantidade)
    const novoStatus = tudoProduzido ? 'Concluído' : 'Em produção'

    const { error } = await supabase
      .from('pedidos')
      .update({ itens: itensAtualizados, status: novoStatus })
      .eq('id', pedidoProducao.id)

    if (error) {
      alert('Erro ao registrar entrega: ' + error.message)
      return
    }

    await abaterEstoqueItens(itensEntreguesAgora)

    setModalProducaoAberto(false)
    buscarPedidos()
    buscarProdutos()
  }

  // ---------- VER DETALHES ----------
  function abrirModalDetalhes(pedido) {
    setPedidoDetalhes(pedido)
    setModalDetalhesAberto(true)
  }

  // ---------- EXCLUIR PEDIDO (somente admin) ----------
  async function handleExcluirPedido(pedido) {
    const mensagem =
      pedido.status === 'Concluído'
        ? `Este pedido já está ENTREGUE. Excluir não desfaz valores já contados em relatórios anteriores, nem devolve o estoque abatido. Deseja mesmo excluir o pedido ${gerarNumeroPedido(pedido.id)}?`
        : `Tem certeza que deseja excluir o pedido ${gerarNumeroPedido(pedido.id)}? Essa ação não pode ser desfeita.`

    const confirmar = window.confirm(mensagem)
    if (!confirmar) return

    setExcluindoId(pedido.id)

    const { error } = await supabase.from('pedidos').delete().eq('id', pedido.id)

    setExcluindoId(null)

    if (error) {
      console.log('Erro ao excluir pedido:', error)
      alert('Erro ao excluir pedido. Veja o console para detalhes.')
      return
    }

    buscarPedidos()
  }

  // ---------- BAIXA DE ESTOQUE (uso legado: pedidos antigos presos em "Pendente") ----------
  async function baixarEstoqueDoPedido(pedido) {
    for (const item of pedido.itens) {
      const quantidadeVendida = Number(item.produzido || item.quantidade || 0)
      if (quantidadeVendida <= 0) continue

      const produto = produtosLista.find((p) => p.nome === item.produto)
      if (!produto) continue

      const novoEstoque = Number(produto.estoque || 0) - quantidadeVendida

      const { error } = await supabase
        .from('produtos')
        .update({ estoque: novoEstoque })
        .eq('id', produto.id)

      if (error) {
        console.log(`Erro ao abater estoque do produto ${item.produto}:`, error)
      }
    }
  }

  // ---------- IMPRIMIR (PROFISSIONAL) ----------
  function imprimirPedido(pedido) {
    const clienteInfo = clientesLista.find(c => c.nome === pedido.cliente) || {}

    const empresaNome = empresa?.nome || 'Sua Empresa Ltda'
    const empresaCnpj = empresa?.cnpj || ''
    const empresaEndereco = empresa?.endereco || ''
    const empresaTelefone = empresa?.telefone || ''
    const empresaLogo = empresa?.logo_url || ''

    const totalKg = pedido.itens.reduce((soma, item) => soma + Number(item.quantidade || 0), 0)

    const linhasItens = pedido.itens.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.produto}</td>
        <td style="text-align:right">${item.quantidade} kg</td>
      </tr>
    `).join('')

    const entregasPedido = todasEntregas(pedido)
    const linhasEntregas = entregasPedido.map(e => `
      <tr>
        <td>${formatarDataHora(e.data)}</td>
        <td>${e.produto}</td>
        <td style="text-align:right">${e.quantidade} kg</td>
        <td>${e.nota_fiscal || '-'}</td>
      </tr>
    `).join('')

    const blocoNotas = entregasPedido.length > 0 ? `
      <div class="secao">
        <h3>Entregas realizadas / Notas fiscais</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th style="text-align:right; width:100px">Quantidade</th>
              <th style="width:130px">Nota fiscal</th>
            </tr>
          </thead>
          <tbody>
            ${linhasEntregas}
          </tbody>
        </table>
      </div>
    ` : (pedido.nota_fiscal ? `
      <div class="secao">
        <h3>Nota fiscal</h3>
        <p>Número: ${pedido.nota_fiscal}</p>
      </div>
    ` : '')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Pedido ${gerarNumeroPedido(pedido.id)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #1f2937;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .cabecalho {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #059669;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .empresa-bloco {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .empresa-logo {
            height: 60px;
            width: auto;
            object-fit: contain;
          }
          .empresa-nome {
            font-size: 22px;
            font-weight: bold;
            color: #059669;
            margin: 0;
          }
          .empresa-info {
            font-size: 12px;
            color: #6b7280;
            margin-top: 6px;
            line-height: 1.5;
          }
          .pedido-titulo {
            text-align: right;
          }
          .pedido-numero {
            font-size: 20px;
            font-weight: bold;
            margin: 0;
          }
          .pedido-data {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }
          .status-badge {
            display: inline-block;
            margin-top: 8px;
            padding: 4px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: bold;
            background: #fef9c3;
            color: #854d0e;
          }
          .secao {
            margin-bottom: 24px;
          }
          .secao h3 {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
            margin: 0 0 8px 0;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 6px;
          }
          .dados-cliente p {
            margin: 3px 0;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 10px 12px;
            font-size: 14px;
            text-align: left;
          }
          th {
            background: #f0fdf4;
            color: #065f46;
            font-size: 12px;
            text-transform: uppercase;
          }
          .linha-total td {
            font-weight: bold;
            background: #f9fafb;
          }
          .assinaturas {
            display: flex;
            justify-content: space-between;
            margin-top: 80px;
          }
          .assinatura-linha {
            width: 42%;
            border-top: 1px solid #1f2937;
            text-align: center;
            padding-top: 8px;
            font-size: 12px;
            color: #4b5563;
          }
          .rodape {
            margin-top: 50px;
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="cabecalho">
          <div class="empresa-bloco">
            ${empresaLogo ? `<img src="${empresaLogo}" class="empresa-logo" />` : ''}
            <div>
              <p class="empresa-nome">${empresaNome}</p>
              <div class="empresa-info">
                ${empresaCnpj ? `CNPJ: ${empresaCnpj}<br />` : ''}
                ${empresaEndereco ? `${empresaEndereco}<br />` : ''}
                ${empresaTelefone ? `Telefone: ${empresaTelefone}` : ''}
              </div>
            </div>
          </div>
          <div class="pedido-titulo">
            <p class="pedido-numero">Pedido ${gerarNumeroPedido(pedido.id)}</p>
            <p class="pedido-data">Emitido em ${formatarDataHora(new Date().toISOString())}</p>
            ${pedido.data_entrega ? `<p class="pedido-data">Entrega prevista: ${formatarDataSimples(pedido.data_entrega)}</p>` : ''}
            <span class="status-badge">${labelStatus(pedido)}</span>
          </div>
        </div>

        <div class="secao">
          <h3>Dados do cliente</h3>
          <div class="dados-cliente">
            <p><strong>${pedido.cliente}</strong></p>
            ${clienteInfo.cnpj ? `<p>CNPJ: ${clienteInfo.cnpj}</p>` : ''}
            ${clienteInfo.endereco ? `<p>Endereço: ${clienteInfo.endereco}</p>` : ''}
            ${clienteInfo.telefone ? `<p>Telefone: ${clienteInfo.telefone}</p>` : ''}
            ${clienteInfo.email ? `<p>E-mail: ${clienteInfo.email}</p>` : ''}
          </div>
        </div>

        <div class="secao">
          <h3>Itens do pedido</h3>
          <table>
            <thead>
              <tr>
                <th style="width:40px">#</th>
                <th>Produto</th>
                <th style="text-align:right; width:120px">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              ${linhasItens}
              <tr class="linha-total">
                <td colspan="2">Total</td>
                <td style="text-align:right">${totalKg} kg</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${blocoNotas}

        <div class="assinaturas">
          <div class="assinatura-linha">Responsável pela entrega</div>
          <div class="assinatura-linha">Responsável pelo recebimento</div>
        </div>

        <div class="rodape">
          Documento gerado por ${empresaNome} — ${new Date().toLocaleDateString('pt-BR')}
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

  // ---------- NOTA FISCAL (uso legado: pedidos antigos presos em "Pendente") ----------
  function abrirModalNF(pedido) {
    setPedidoNF(pedido)
    setNumeroNF('')
    setModalNFAberto(true)
  }

  async function confirmarNF() {
    if (!numeroNF) {
      alert('Digite o número da nota fiscal')
      return
    }

    const { error } = await supabase
      .from('pedidos')
      .update({ status: 'Concluído', nota_fiscal: numeroNF })
      .eq('id', pedidoNF.id)

    if (error) {
      alert('Erro ao lançar NF: ' + error.message)
      return
    }

    await baixarEstoqueDoPedido(pedidoNF)

    setModalNFAberto(false)
    buscarPedidos()
    buscarProdutos()
  }

  // ---------- FILTROS ----------
  const pedidosFiltrados = pedidos.filter(p => {
    const bateBusca =
      gerarNumeroPedido(p.id).toLowerCase().includes(busca.toLowerCase()) ||
      p.cliente.toLowerCase().includes(busca.toLowerCase())
    const bateStatus = filtroStatus === 'Todos os status' || labelStatus(p) === filtroStatus
    return bateBusca && bateStatus
  })

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <button
          onClick={abrirModalNovoPedido}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          + Novo pedido
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por pedido ou cliente..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2"
        />
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option>Todos os status</option>
          <option>Pendente</option>
          <option>Em andamento</option>
          <option>Entregue</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b text-gray-500 text-sm">
            <tr>
              <th className="p-4">Pedido</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Itens</th>
              <th className="p-4">Dados</th>
              <th className="p-4">Entrega</th>
              <th className="p-4">Status</th>
              <th className="p-4">Ação</th>
              <th className="p-4">Notas fiscais</th>
            </tr>
          </thead>
          <tbody>
            {pedidosFiltrados.map(pedido => {
              const label = labelStatus(pedido)
              const alertaEntrega = infoEntrega(pedido)
              const nfs = notasFiscaisDoPedido(pedido)
              return (
                <tr key={pedido.id} className="border-b">
                  <td className="p-4 font-medium">
                    <button
                      onClick={() => abrirModalDetalhes(pedido)}
                      className="text-blue-600 hover:underline"
                    >
                      {gerarNumeroPedido(pedido.id)}
                    </button>
                  </td>
                  <td className="p-4">{pedido.cliente}</td>
                  <td className="p-4">
                    {pedido.itens.map((item, i) => (
                      <div key={i}>
                        {item.produto} (
                        {pedido.status === 'Em produção'
                          ? `${item.produzido || 0}/${item.quantidade}kg`
                          : `${item.quantidade}kg`}
                        )
                      </div>
                    ))}
                  </td>
                  <td className="p-4">{formatarData(pedido.created_at)}</td>
                  <td className="p-4">
                    {pedido.data_entrega ? (
                      <div>
                        <div className="text-sm">{formatarDataSimples(pedido.data_entrega)}</div>
                        {alertaEntrega && (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${alertaEntrega.cor}`}>
                            {alertaEntrega.texto}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${corStatus(label)}`}>
                      {label}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-3 flex-wrap">
                      <button onClick={() => abrirModalDetalhes(pedido)} className="text-gray-600 hover:underline">
                        👁 Detalhes
                      </button>
                      {pedido.status === 'Em produção' && (
                        <>
                          <button
                            onClick={() => abrirModalProducao(pedido)}
                            className="text-blue-600 hover:underline"
                          >
                            Registrar entrega
                          </button>
                          {label === 'Em andamento' && (
                            <button onClick={() => imprimirPedido(pedido)} className="text-gray-600 hover:underline">
                              🖨 Imprimir
                            </button>
                          )}
                        </>
                      )}
                      {pedido.status === 'Pendente' && (
                        <>
                          <button onClick={() => imprimirPedido(pedido)} className="text-gray-600 hover:underline">
                            🖨 Imprimir
                          </button>
                          <button onClick={() => abrirModalNF(pedido)} className="text-emerald-600 hover:underline">
                            Lançar NF
                          </button>
                        </>
                      )}
                      {pedido.status === 'Concluído' && (
                        <button onClick={() => imprimirPedido(pedido)} className="text-gray-600 hover:underline">
                          🖨 Imprimir
                        </button>
                      )}
                      {usuario?.admin && (
                        <button
                          onClick={() => handleExcluirPedido(pedido)}
                          disabled={excluindoId === pedido.id}
                          className="text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                        >
                          {excluindoId === pedido.id ? 'Excluindo...' : '🗑 Excluir'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-4">{nfs.length > 0 ? nfs.join(', ') : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL NOVO PEDIDO */}
      {modalNovoAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Novo pedido</h2>

            {clientesLista.length === 0 && (
              <p className="bg-yellow-100 text-yellow-700 p-2 rounded mb-3 text-sm">
                Nenhum cliente cadastrado. Cadastre um cliente antes de criar um pedido.
              </p>
            )}
            {produtosLista.length === 0 && (
              <p className="bg-yellow-100 text-yellow-700 p-2 rounded mb-3 text-sm">
                Nenhum produto cadastrado. Cadastre um produto antes de criar um pedido.
              </p>
            )}

            <label className="block mb-1 font-medium">Cliente</label>
            <select
              value={clienteSelecionado}
              onChange={e => setClienteSelecionado(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            >
              <option value="">Selecione um cliente</option>
              {clientesLista.map(c => (
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>

            <label className="block mb-1 font-medium">Data de entrega (opcional)</label>
            <input
              type="date"
              value={dataEntrega}
              onChange={e => setDataEntrega(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />

            <label className="block mb-1 font-medium">Itens</label>
            {itensNovoPedido.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  value={item.produto}
                  onChange={e => atualizarItemNovoPedido(index, 'produto', e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2"
                >
                  <option value="">Selecione um produto</option>
                  {produtosLista.map(p => (
                    <option key={p.id} value={p.nome}>{p.nome}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Qtd (kg)"
                  value={item.quantidade}
                  onChange={e => atualizarItemNovoPedido(index, 'quantidade', e.target.value)}
                  className="w-28 border rounded-lg px-3 py-2"
                />
                {itensNovoPedido.length > 1 && (
                  <button onClick={() => removerLinhaItem(index)} className="text-red-500">✕</button>
                )}
              </div>
            ))}
            <button onClick={adicionarLinhaItem} className="text-emerald-600 text-sm mb-4">
              + Adicionar item
            </button>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setModalNovoAberto(false)} className="px-4 py-2 rounded-lg border">
                Cancelar
              </button>
              <button onClick={salvarNovoPedido} className="px-4 py-2 rounded-lg bg-emerald-600 text-white">
                Salvar pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR ENTREGA */}
      {modalProducaoAberto && pedidoProducao && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1">Registrar entrega</h2>
            <p className="text-gray-500 mb-4">
              Pedido {gerarNumeroPedido(pedidoProducao.id)} — {pedidoProducao.cliente}
            </p>

            <label className="block mb-1 font-medium">Número da nota fiscal desta entrega</label>
            <input
              type="text"
              placeholder="Ex: 123456"
              value={notaFiscalEntrega}
              onChange={e => setNotaFiscalEntrega(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-1"
            />
            <p className="text-xs text-gray-400 mb-4">
              Essa nota fiscal fica vinculada às quantidades informadas abaixo. Se o restante for entregue depois, você poderá lançar uma nota fiscal diferente para aquela parte.
            </p>

            {pedidoProducao.itens.map((item, index) => {
              const falta = item.quantidade - (item.produzido || 0)
              return (
                <div key={index} className="border rounded-lg p-3 mb-3">
                  <p className="font-medium">{item.produto}</p>
                  <p className="text-sm text-gray-500">
                    Pedido: {item.quantidade}kg · Já entregue: {item.produzido || 0}kg · Falta: {falta}kg
                  </p>

                  {item.historico && item.historico.length > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      {item.historico.map((h, hi) => (
                        <div key={hi}>
                          Entregou {h.quantidade}kg em {formatarDataHora(h.data)}
                          {h.nota_fiscal ? ` — NF ${h.nota_fiscal}` : ''}
                        </div>
                      ))}
                    </div>
                  )}

                  {falta > 0 ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="number"
                        min="0"
                        max={falta}
                        placeholder={`Entregar agora (até ${falta}kg)`}
                        value={quantidadesProduzidas[index] || ''}
                        onChange={e => atualizarQuantidadeProduzida(index, e.target.value, falta)}
                        className="flex-1 border rounded-lg px-3 py-2"
                      />
                    </div>
                  ) : (
                    <p className="text-emerald-600 text-sm mt-2">✓ Item 100% entregue</p>
                  )}
                </div>
              )
            })}

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setModalProducaoAberto(false)} className="px-4 py-2 rounded-lg border">
                Cancelar
              </button>
              <button onClick={salvarProducao} className="px-4 py-2 rounded-lg bg-emerald-600 text-white">
                Salvar entrega
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VER DETALHES */}
      {modalDetalhesAberto && pedidoDetalhes && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1">Detalhes do pedido</h2>
            <p className="text-gray-500 mb-2">
              {gerarNumeroPedido(pedidoDetalhes.id)} — {pedidoDetalhes.cliente}
            </p>
            {pedidoDetalhes.data_entrega && (
              <p className="text-sm text-gray-500 mb-2">
                Entrega prevista: <strong>{formatarDataSimples(pedidoDetalhes.data_entrega)}</strong>
                {infoEntrega(pedidoDetalhes) && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${infoEntrega(pedidoDetalhes).cor}`}>
                    {infoEntrega(pedidoDetalhes).texto}
                  </span>
                )}
              </p>
            )}
            <p className="mb-2">
              Status:{' '}
              <span className={`px-3 py-1 rounded-full text-sm ${corStatus(labelStatus(pedidoDetalhes))}`}>
                {labelStatus(pedidoDetalhes)}
              </span>
            </p>
            {notasFiscaisDoPedido(pedidoDetalhes).length > 0 && (
              <p className="text-sm text-gray-500 mb-4">
                Notas fiscais: <strong>{notasFiscaisDoPedido(pedidoDetalhes).join(', ')}</strong>
              </p>
            )}

            {pedidoDetalhes.itens.map((item, index) => {
              const falta = item.quantidade - (item.produzido || 0)
              return (
                <div key={index} className="border rounded-lg p-3 mb-3">
                  <p className="font-medium">{item.produto}</p>
                  <p className="text-sm text-gray-500 mb-2">
                    Pedido: {item.quantidade}kg · Entregue: {item.produzido || 0}kg · Falta: {falta > 0 ? falta : 0}kg
                  </p>

                  {item.historico && item.historico.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Histórico de entregas:</p>
                      <div className="text-xs text-gray-500 space-y-1">
                        {item.historico.map((h, hi) => (
                          <div key={hi}>
                            • Entregou {h.quantidade}kg em {formatarDataHora(h.data)}
                            {h.nota_fiscal ? ` — NF: ${h.nota_fiscal}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Nenhuma entrega registrada ainda.</p>
                  )}
                </div>
              )
            })}

            <div className="flex justify-end mt-4">
              <button onClick={() => setModalDetalhesAberto(false)} className="px-4 py-2 rounded-lg border">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NF (uso legado para pedidos presos em "Pendente") */}
      {modalNFAberto && pedidoNF && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Lançar nota fiscal</h2>
            <p className="mb-2">Pedido {gerarNumeroPedido(pedidoNF.id)} — {pedidoNF.cliente}</p>
            <input
              type="text"
              placeholder="Número da nota fiscal"
              value={numeroNF}
              onChange={e => setNumeroNF(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalNFAberto(false)} className="px-4 py-2 rounded-lg border">
                Cancelar
              </button>
              <button onClick={confirmarNF} className="px-4 py-2 rounded-lg bg-emerald-600 text-white">
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