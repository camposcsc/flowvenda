import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useUsuario } from '../context/UsuarioContext'

function normalizarTexto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function resumoObs(texto) {
  const valor = String(texto || '').trim()
  return valor.length <= 60 ? valor : valor.slice(0, 60) + '...'
}

function formatarDataSimples(dataISO) {
  if (!dataISO) return '-'
  const [ano, mes, dia] = String(dataISO).slice(0, 10).split('-')
  if (!ano || !mes || !dia) return '-'
  return `${dia}/${mes}/${ano}`
}

function formatarDataHora(dataISO) {
  if (!dataISO) return '-'

  const data = new Date(dataISO)
  if (Number.isNaN(data.getTime())) return '-'

  return (
    data.toLocaleDateString('pt-BR') +
    ' às ' +
    data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  )
}

function gerarNumeroPedido(id) {
  return `PV-2026-${String(id).padStart(5, '0')}`
}

function itensDoPedido(pedido) {
  return Array.isArray(pedido?.itens) ? pedido.itens : []
}

function valorTotalPedido(pedido) {
  return itensDoPedido(pedido).reduce(
    (soma, item) =>
      soma + Number(item.preco || 0) * Number(item.quantidade || 0),
    0
  )
}

function totalProduzido(pedido) {
  return itensDoPedido(pedido).reduce(
    (soma, item) => soma + Number(item.produzido || 0),
    0
  )
}

function labelStatus(pedido) {
  if (pedido.status === 'Concluído') return 'Entregue'
  if (totalProduzido(pedido) > 0) return 'Em andamento'
  return 'Pendente'
}

function corStatus(status) {
  if (status === 'Entregue') return 'bg-green-100 text-green-700'
  if (status === 'Em andamento') return 'bg-blue-100 text-blue-700'
  return 'bg-yellow-100 text-yellow-700'
}

function infoEntrega(pedido) {
  if (!pedido.data_entrega || pedido.status === 'Concluído') return null

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [ano, mes, dia] = String(pedido.data_entrega)
    .slice(0, 10)
    .split('-')
    .map(Number)

  if (!ano || !mes || !dia) return null

  const entrega = new Date(ano, mes - 1, dia)
  const dias = Math.round((entrega - hoje) / (1000 * 60 * 60 * 24))

  if (dias < 0) {
    return {
      texto: `⏰ Atrasado há ${Math.abs(dias)} dia(s)`,
      cor: 'bg-red-100 text-red-700',
    }
  }

  if (dias === 0) {
    return {
      texto: '⏰ Entrega é hoje',
      cor: 'bg-orange-100 text-orange-700',
    }
  }

  if (dias <= 3) {
    return {
      texto: `⏰ Entrega em ${dias} dia(s)`,
      cor: 'bg-yellow-100 text-yellow-700',
    }
  }

  return null
}

function todasEntregas(pedido) {
  const lista = []

  itensDoPedido(pedido).forEach((item) => {
    const historico = Array.isArray(item.historico) ? item.historico : []

    historico.forEach((entrega) => {
      lista.push({
        produto: item.produto,
        quantidade: entrega.quantidade,
        data: entrega.data,
        nota_fiscal: entrega.nota_fiscal || null,
        recebido_por: entrega.recebido_por || null,
      })
    })
  })

  return lista.sort((a, b) => new Date(a.data) - new Date(b.data))
}

function notasFiscaisDoPedido(pedido) {
  const notas = todasEntregas(pedido)
    .map((entrega) => entrega.nota_fiscal)
    .filter(Boolean)

  const unicas = [...new Set(notas)]

  if (unicas.length === 0 && pedido.nota_fiscal) {
    return [pedido.nota_fiscal]
  }

  return unicas
}

function receptoresDoPedido(pedido) {
  return [
    ...new Set(
      todasEntregas(pedido)
        .map((entrega) => entrega.recebido_por)
        .filter(Boolean)
    ),
  ]
}

function Pedidos() {
  const usuario = useUsuario()

  const [pedidos, setPedidos] = useState([])
  const [clientesLista, setClientesLista] = useState([])
  const [produtosLista, setProdutosLista] = useState([])
  const [empresa, setEmpresa] = useState(null)

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos os status')
  const [filtroDataEntrega, setFiltroDataEntrega] = useState('')

  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [origemDuplicacao, setOrigemDuplicacao] = useState(null)
  const [pedidoEditando, setPedidoEditando] = useState(null)
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false)
  const [itensNovoPedido, setItensNovoPedido] = useState([
    { produto: '', quantidade: '', preco: '' },
  ])
  const [dataEntrega, setDataEntrega] = useState('')
  const [fornecedorNovoPedido, setFornecedorNovoPedido] = useState('')
  const [obsPedido, setObsPedido] = useState('')
  const [usarCredito, setUsarCredito] = useState(true)
  const [salvandoPedido, setSalvandoPedido] = useState(false)
  const [pedidoRecemCriado, setPedidoRecemCriado] = useState(null)

  const [modalProducaoAberto, setModalProducaoAberto] = useState(false)
  const [pedidoProducao, setPedidoProducao] = useState(null)
  const [quantidadesProduzidas, setQuantidadesProduzidas] = useState({})
  const [notaFiscalEntrega, setNotaFiscalEntrega] = useState('')
  const [recebidoPor, setRecebidoPor] = useState('')
  const [salvandoEntrega, setSalvandoEntrega] = useState(false)

  const [modalNFAberto, setModalNFAberto] = useState(false)
  const [pedidoNF, setPedidoNF] = useState(null)
  const [numeroNF, setNumeroNF] = useState('')
  const [salvandoNF, setSalvandoNF] = useState(false)

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

    if (error) {
      console.error('Erro ao buscar pedidos:', error)
      alert('Erro ao carregar pedidos: ' + error.message)
      return
    }

    setPedidos(data || [])
  }

  async function buscarClientes() {
    const { data, error } = await supabase.from('clientes').select('*')

    if (error) {
      console.error('Erro ao buscar clientes:', error)
      return
    }

    setClientesLista(
      [...(data || [])].sort((a, b) =>
        (a.nome || '').localeCompare(b.nome || '')
      )
    )
  }

  async function buscarProdutos() {
    const { data, error } = await supabase.from('produtos').select('*')

    if (error) {
      console.error('Erro ao buscar produtos:', error)
      return
    }

    setProdutosLista(
      [...(data || [])].sort((a, b) =>
        (a.nome || '').localeCompare(b.nome || '')
      )
    )
  }

  async function buscarEmpresa() {
    const { data, error } = await supabase
      .from('empresa')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Erro ao buscar empresa:', error)
      return
    }

    if (data?.length) setEmpresa(data[0])
  }

  function fecharModalNovo() {
    if (salvandoPedido) return

    setModalNovoAberto(false)
    setPedidoEditando(null)
    setOrigemDuplicacao(null)
  }

  function abrirModalNovoPedido() {
    setOrigemDuplicacao(null)
    setPedidoEditando(null)
    setClienteSelecionado(null)
    setBuscaCliente('')
    setMostrarListaClientes(false)
    setItensNovoPedido([{ produto: '', quantidade: '', preco: '' }])
    setDataEntrega('')
    setFornecedorNovoPedido('')
    setObsPedido('')
    setUsarCredito(true)
    setModalNovoAberto(true)
  }

  function clienteDoPedido(pedido) {
    if (pedido.cliente_id != null) {
      return clientesLista.find(
        (cliente) => String(cliente.id) === String(pedido.cliente_id)
      )
    }

    const encontrados = clientesLista.filter(
      (cliente) => cliente.nome === pedido.cliente
    )

    return encontrados.length === 1 ? encontrados[0] : null
  }

  function duplicarPedido(pedido) {
    const cliente = clienteDoPedido(pedido)

    setPedidoEditando(null)
    setClienteSelecionado(cliente || null)
    setBuscaCliente(cliente?.nome || pedido.cliente || '')
    setMostrarListaClientes(false)

    setItensNovoPedido(
      itensDoPedido(pedido).map((item) => {
        const produtoAtual = produtosLista.find(
          (produto) => produto.nome === item.produto
        )

        const precoInicial =
          item.preco != null ? item.preco : produtoAtual?.preco ?? ''

        return {
          produto: item.produto,
          quantidade: String(item.quantidade ?? ''),
          preco: String(precoInicial),
        }
      })
    )

    setDataEntrega('')
    setFornecedorNovoPedido(pedido.fornecedor || '')
    setObsPedido(pedido.obs || '')
    setUsarCredito(true)
    setOrigemDuplicacao(gerarNumeroPedido(pedido.id))
    setModalNovoAberto(true)
  }

  function abrirModalEdicao(pedido) {
    if (pedido.status === 'Concluído') {
      alert(
        'Pedidos concluídos não podem ser editados. Use Duplicar para criar um novo pedido.'
      )
      return
    }

    const cliente = clienteDoPedido(pedido)

    setOrigemDuplicacao(null)
    setPedidoEditando(pedido)
    setClienteSelecionado(cliente || null)
    setBuscaCliente(pedido.cliente || '')
    setMostrarListaClientes(false)

    setItensNovoPedido(
      itensDoPedido(pedido).map((item) => {
        const produtoAtual = produtosLista.find(
          (produto) => produto.nome === item.produto
        )

        const precoInicial =
          item.preco != null ? item.preco : produtoAtual?.preco ?? ''

        return {
          produto: item.produto,
          quantidade: String(item.quantidade ?? ''),
          preco: String(precoInicial),
          produzido: Number(item.produzido || 0),
          historico: Array.isArray(item.historico) ? item.historico : [],
        }
      })
    )

    setDataEntrega(pedido.data_entrega || '')
    setFornecedorNovoPedido(pedido.fornecedor || '')
    setObsPedido(pedido.obs || '')
    setUsarCredito(
      pedido.cliente_id == null ? false : Boolean(pedido.usar_credito)
    )
    setModalNovoAberto(true)
  }

  function selecionarCliente(cliente) {
    setClienteSelecionado(cliente)
    setBuscaCliente(cliente.nome || '')
    setMostrarListaClientes(false)
  }

  function adicionarLinhaItem() {
    setItensNovoPedido((atuais) => [
      ...atuais,
      { produto: '', quantidade: '', preco: '' },
    ])
  }

  function removerLinhaItem(index) {
    setItensNovoPedido((atuais) => atuais.filter((_, i) => i !== index))
  }

  function atualizarItemNovoPedido(index, campo, valor) {
    setItensNovoPedido((atuais) =>
      atuais.map((item, i) =>
        i === index ? { ...item, [campo]: valor } : item
      )
    )
  }

  function selecionarProdutoNoItem(index, nomeProduto) {
    const produto = produtosLista.find((p) => p.nome === nomeProduto)

    setItensNovoPedido((atuais) =>
      atuais.map((item, i) =>
        i === index
          ? {
              ...item,
              produto: nomeProduto,
              preco: produto ? String(produto.preco ?? '') : '',
            }
          : item
      )
    )
  }

  const totalNovoPedido = itensNovoPedido.reduce((soma, item) => {
    const quantidade = Number(item.quantidade)
    const preco = Number(item.preco)

    if (!Number.isFinite(quantidade) || !Number.isFinite(preco)) return soma

    return soma + quantidade * preco
  }, 0)

  const pedidoAntigo = Boolean(
    pedidoEditando && pedidoEditando.cliente_id == null
  )

  const creditoAnterior = pedidoEditando
    ? Number(pedidoEditando.credito_usado || 0)
    : 0

  const saldoClienteAtual = Number(clienteSelecionado?.saldo_credito || 0)

  const totalOriginal = pedidoEditando
    ? Math.round(valorTotalPedido(pedidoEditando) * 100) / 100
    : 0

  const totalAtualArredondado = Math.round(totalNovoPedido * 100) / 100

  const mesmoCreditoEValor =
    pedidoEditando &&
    pedidoEditando.cliente_id != null &&
    Boolean(pedidoEditando.usar_credito) === usarCredito &&
    totalAtualArredondado === totalOriginal

  const creditoEstimado = pedidoAntigo
    ? 0
    : mesmoCreditoEValor
      ? creditoAnterior
      : usarCredito
        ? Math.min(
            Math.max(totalAtualArredondado, 0),
            Math.max(saldoClienteAtual + creditoAnterior, 0)
          )
        : 0

  const saldoEstimado = pedidoAntigo
    ? saldoClienteAtual
    : mesmoCreditoEValor
      ? saldoClienteAtual
      : saldoClienteAtual + creditoAnterior - creditoEstimado

  async function salvarNovoPedido() {
    if (salvandoPedido) return

    let cliente = clienteSelecionado

    if (!pedidoEditando && !cliente) {
      const encontrados = clientesLista.filter(
        (c) => normalizarTexto(c.nome) === normalizarTexto(buscaCliente)
      )

      if (encontrados.length === 1) {
        cliente = encontrados[0]
      }
    }

    if (!pedidoEditando && !cliente) {
      alert(
        'Selecione um cliente na lista. Se houver nomes iguais, clique no cliente correto.'
      )
      return
    }

    if (
      pedidoEditando &&
      pedidoEditando.cliente_id != null &&
      !cliente
    ) {
      alert('Não foi possível localizar o cliente vinculado a este pedido.')
      return
    }

    if (itensNovoPedido.length === 0) {
      alert('Adicione pelo menos um item.')
      return
    }

    const itensFormatados = []

    for (const item of itensNovoPedido) {
      const quantidade = Number(item.quantidade)
      const preco = Number(item.preco)
      const produzido = Number(item.produzido || 0)

      if (!item.produto) {
        alert('Selecione um produto em cada linha.')
        return
      }

      if (
        item.quantidade === '' ||
        !Number.isFinite(quantidade) ||
        quantidade <= 0
      ) {
        alert(`Informe uma quantidade maior que zero para ${item.produto}.`)
        return
      }

      if (
        item.preco === '' ||
        !Number.isFinite(preco) ||
        preco < 0
      ) {
        alert(`Informe um preço válido para ${item.produto}.`)
        return
      }

      if (quantidade < produzido) {
        alert(
          `${item.produto} já teve ${produzido} kg entregues. A quantidade não pode ser menor que isso.`
        )
        return
      }

      itensFormatados.push({
        produto: item.produto,
        quantidade,
        preco,
        produzido,
        historico: Array.isArray(item.historico) ? item.historico : [],
      })
    }

    setSalvandoPedido(true)

    try {
      if (pedidoEditando) {
        const tudoEntregue = itensFormatados.every(
          (item) => item.produzido >= item.quantidade
        )

        let novoStatus = pedidoEditando.status

        if (pedidoEditando.status === 'Em produção' && tudoEntregue) {
          novoStatus = 'Concluído'
        }

        const dadosEdicao = {
          itens: itensFormatados,
          status: novoStatus,
          data_entrega: dataEntrega || null,
          fornecedor: fornecedorNovoPedido.trim() || null,
          obs: obsPedido.trim() || null,
        }

        if (!pedidoAntigo) {
          dadosEdicao.usar_credito = usarCredito
        }

        const { data, error } = await supabase
          .from('pedidos')
          .update(dadosEdicao)
          .eq('id', pedidoEditando.id)
          .eq('status', pedidoEditando.status)
          .select()
          .maybeSingle()

        if (error) throw error

        if (!data) {
          throw new Error(
            'O pedido pode ter sido alterado por outra pessoa ou você não tem permissão. Atualize a lista e tente novamente.'
          )
        }

        setModalNovoAberto(false)
        setPedidoEditando(null)
        setOrigemDuplicacao(null)

        await Promise.all([buscarPedidos(), buscarClientes()])

        alert('Pedido atualizado com sucesso.')
        return
      }

      const dadosPedido = {
        cliente: cliente.nome,
        cliente_id: cliente.id,
        itens: itensFormatados,
        status: 'Em produção',
        nota_fiscal: null,
        data_entrega: dataEntrega || null,
        fornecedor: fornecedorNovoPedido.trim() || null,
        obs: obsPedido.trim() || null,
        usar_credito: usarCredito,
      }

      const { data, error } = await supabase
        .from('pedidos')
        .insert([dadosPedido])
        .select()
        .single()

      if (error) throw error

      setModalNovoAberto(false)
      setPedidoEditando(null)
      setOrigemDuplicacao(null)
      setPedidoRecemCriado(data)

      await Promise.all([buscarPedidos(), buscarClientes()])
    } catch (error) {
      console.error('Erro ao salvar pedido:', error)
      alert('Erro ao salvar pedido: ' + (error.message || 'Erro desconhecido.'))
    } finally {
      setSalvandoPedido(false)
    }
  }

  function abrirModalProducao(pedido) {
    setPedidoProducao(pedido)
    setQuantidadesProduzidas({})
    setNotaFiscalEntrega('')
    setRecebidoPor('')
    setModalProducaoAberto(true)
  }

  function atualizarQuantidadeProduzida(index, valor, falta) {
    if (valor === '') {
      setQuantidadesProduzidas((atuais) => ({ ...atuais, [index]: '' }))
      return
    }

    let numero = Number(valor)

    if (!Number.isFinite(numero)) return
    if (numero < 0) numero = 0

    if (numero > falta) {
      numero = falta
      alert(`Você não pode entregar mais do que falta (${falta} kg).`)
    }

    setQuantidadesProduzidas((atuais) => ({
      ...atuais,
      [index]: numero,
    }))
  }

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
        console.error(`Erro ao abater estoque de ${item.produto}:`, error)
        alert(
          `A entrega foi registrada, mas ocorreu um erro ao atualizar o estoque de ${item.produto}. Confira o estoque.`
        )
      }
    }
  }

  async function salvarProducao() {
    if (salvandoEntrega || !pedidoProducao) return

    if (!notaFiscalEntrega.trim()) {
      alert('Informe o número da nota fiscal desta entrega.')
      return
    }

    if (!recebidoPor.trim()) {
      alert('Informe o nome de quem recebeu o produto.')
      return
    }

    const agora = new Date().toISOString()
    const itensEntreguesAgora = []

    const itensAtualizados = itensDoPedido(pedidoProducao).map(
      (item, index) => {
        const falta =
          Number(item.quantidade || 0) - Number(item.produzido || 0)

        let quantidade = Number(quantidadesProduzidas[index] || 0)

        if (!Number.isFinite(quantidade) || quantidade < 0) quantidade = 0
        if (quantidade > falta) quantidade = falta

        if (quantidade > 0) {
          itensEntreguesAgora.push({
            produto: item.produto,
            quantidade,
          })

          return {
            ...item,
            produzido: Number(item.produzido || 0) + quantidade,
            historico: [
              ...(Array.isArray(item.historico) ? item.historico : []),
              {
                quantidade,
                data: agora,
                nota_fiscal: notaFiscalEntrega.trim(),
                recebido_por: recebidoPor.trim(),
              },
            ],
          }
        }

        return item
      }
    )

    if (itensEntreguesAgora.length === 0) {
      alert('Informe ao menos uma quantidade a entregar.')
      return
    }

    const tudoEntregue = itensAtualizados.every(
      (item) => Number(item.produzido || 0) >= Number(item.quantidade || 0)
    )

    setSalvandoEntrega(true)

    try {
      const { data, error } = await supabase
        .from('pedidos')
        .update({
          itens: itensAtualizados,
          status: tudoEntregue ? 'Concluído' : 'Em produção',
        })
        .eq('id', pedidoProducao.id)
        .eq('status', pedidoProducao.status)
        .select('id')
        .maybeSingle()

      if (error) throw error

      if (!data) {
        throw new Error(
          'O pedido pode ter sido alterado ou você não tem permissão. Atualize a lista.'
        )
      }

      await abaterEstoqueItens(itensEntreguesAgora)

      setModalProducaoAberto(false)
      await Promise.all([buscarPedidos(), buscarProdutos(), buscarClientes()])
    } catch (error) {
      alert('Erro ao registrar entrega: ' + error.message)
    } finally {
      setSalvandoEntrega(false)
    }
  }

  function abrirModalDetalhes(pedido) {
    setPedidoDetalhes(pedido)
    setModalDetalhesAberto(true)
  }

  async function handleExcluirPedido(pedido) {
    const credito = Number(pedido.credito_usado || 0)

    let mensagem =
      `Tem certeza que deseja excluir o pedido ${gerarNumeroPedido(pedido.id)}? ` +
      'Essa ação não pode ser desfeita.'

    if (credito > 0) {
      mensagem += ` O crédito usado de ${formatarMoeda(credito)} será devolvido ao cliente.`
    }

    if (pedido.status === 'Concluído' || totalProduzido(pedido) > 0) {
      mensagem +=
        ' Atenção: excluir o pedido não devolve automaticamente o estoque das entregas registradas.'
    }

    if (!window.confirm(mensagem)) return

    setExcluindoId(pedido.id)

    const { data, error } = await supabase
      .from('pedidos')
      .delete()
      .eq('id', pedido.id)
      .select('id')
      .maybeSingle()

    setExcluindoId(null)

    if (error) {
      alert('Erro ao excluir pedido: ' + error.message)
      return
    }

    if (!data) {
      alert('O pedido não foi excluído. Ele pode não existir ou você não tem permissão.')
      return
    }

    await Promise.all([buscarPedidos(), buscarClientes()])
  }

  async function baixarEstoqueDoPedido(pedido) {
    const itens = itensDoPedido(pedido).map((item) => ({
      produto: item.produto,
      quantidade: Number(item.produzido || item.quantidade || 0),
    }))

    await abaterEstoqueItens(itens)
  }

  function imprimirPedido(pedido) {
    const clienteInfo = clienteDoPedido(pedido) || {}
    const empresaNome = empresa?.nome || 'Sua Empresa Ltda'
    const empresaCnpj = empresa?.cnpj || ''
    const empresaEndereco = empresa?.endereco || ''
    const empresaTelefone = empresa?.telefone || ''
    const empresaLogo = empresa?.logo_url || ''

    const itens = itensDoPedido(pedido)
    const totalKg = itens.reduce(
      (soma, item) => soma + Number(item.quantidade || 0),
      0
    )

    const linhasItens = itens
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escaparHtml(item.produto)}</td>
            <td style="text-align:right">${escaparHtml(item.quantidade)} kg</td>
          </tr>
        `
      )
      .join('')

    const entregas = todasEntregas(pedido)
    const receptores = receptoresDoPedido(pedido)

    const linhasEntregas = entregas
      .map(
        (entrega) => `
          <tr>
            <td>${escaparHtml(formatarDataHora(entrega.data))}</td>
            <td>${escaparHtml(entrega.produto)}</td>
            <td style="text-align:right">${escaparHtml(entrega.quantidade)} kg</td>
            <td>${escaparHtml(entrega.nota_fiscal || '-')}</td>
            <td>${escaparHtml(entrega.recebido_por || '-')}</td>
          </tr>
        `
      )
      .join('')

    const blocoNotas =
      entregas.length > 0
        ? `
          <div class="secao">
            <h3>Entregas realizadas / Notas fiscais</h3>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Nota fiscal</th>
                  <th>Recebido por</th>
                </tr>
              </thead>
              <tbody>${linhasEntregas}</tbody>
            </table>
          </div>
        `
        : pedido.nota_fiscal
          ? `
            <div class="secao">
              <h3>Nota fiscal</h3>
              <p>Número: ${escaparHtml(pedido.nota_fiscal)}</p>
            </div>
          `
          : ''

    const blocoObs = pedido.obs
      ? `
        <div class="secao">
          <h3>Observações</h3>
          <p class="obs-texto">${escaparHtml(pedido.obs)}</p>
        </div>
      `
      : ''

    const nomesReceptores =
      receptores.length > 0
        ? escaparHtml(receptores.join(', '))
        : '________________________________'

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Pedido ${escaparHtml(gerarNumeroPedido(pedido.id))}</title>
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
          .empresa-bloco { display: flex; align-items: center; gap: 14px; }
          .empresa-logo { height: 60px; width: auto; object-fit: contain; }
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
          .pedido-titulo { text-align: right; }
          .pedido-numero { font-size: 20px; font-weight: bold; margin: 0; }
          .pedido-data { font-size: 12px; color: #6b7280; margin-top: 4px; }
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
          .secao { margin-bottom: 24px; }
          .secao h3 {
            font-size: 12px;
            text-transform: uppercase;
            color: #6b7280;
            margin: 0 0 8px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 6px;
          }
          .dados-cliente p { margin: 3px 0; font-size: 14px; }
          .obs-texto { font-size: 14px; white-space: pre-wrap; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
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
          .linha-total td { font-weight: bold; background: #f9fafb; }
          .assinaturas { display: flex; justify-content: space-between; margin-top: 80px; }
          .assinatura-linha {
            width: 42%;
            border-top: 1px solid #1f2937;
            text-align: center;
            padding-top: 8px;
            font-size: 12px;
            color: #4b5563;
          }
          .recebido-por { margin-top: 24px; font-size: 14px; }
          .rodape {
            margin-top: 50px;
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
          }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="cabecalho">
          <div class="empresa-bloco">
            ${empresaLogo ? `<img src="${escaparHtml(empresaLogo)}" class="empresa-logo" alt="Logo da empresa" />` : ''}
            <div>
              <p class="empresa-nome">${escaparHtml(empresaNome)}</p>
              <div class="empresa-info">
                ${empresaCnpj ? `CNPJ: ${escaparHtml(empresaCnpj)}<br />` : ''}
                ${empresaEndereco ? `${escaparHtml(empresaEndereco)}<br />` : ''}
                ${empresaTelefone ? `Telefone: ${escaparHtml(empresaTelefone)}` : ''}
              </div>
            </div>
          </div>
          <div class="pedido-titulo">
            <p class="pedido-numero">Pedido ${escaparHtml(gerarNumeroPedido(pedido.id))}</p>
            <p class="pedido-data">Emitido em ${escaparHtml(formatarDataHora(new Date().toISOString()))}</p>
            ${pedido.data_entrega ? `<p class="pedido-data">Entrega prevista: ${escaparHtml(formatarDataSimples(pedido.data_entrega))}</p>` : ''}
            <span class="status-badge">${escaparHtml(labelStatus(pedido))}</span>
          </div>
        </div>

        <div class="secao">
          <h3>Dados do cliente</h3>
          <div class="dados-cliente">
            <p><strong>${escaparHtml(pedido.cliente)}</strong></p>
            ${clienteInfo.cnpj ? `<p>CNPJ: ${escaparHtml(clienteInfo.cnpj)}</p>` : ''}
            ${clienteInfo.endereco ? `<p>Endereço: ${escaparHtml(clienteInfo.endereco)}</p>` : ''}
            ${clienteInfo.telefone ? `<p>Telefone: ${escaparHtml(clienteInfo.telefone)}</p>` : ''}
            ${clienteInfo.email ? `<p>E-mail: ${escaparHtml(clienteInfo.email)}</p>` : ''}
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
                <td style="text-align:right">${escaparHtml(totalKg)} kg</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${blocoObs}
        ${blocoNotas}

        <p class="recebido-por"><strong>Recebido por:</strong> ${nomesReceptores}</p>

        <div class="assinaturas">
          <div class="assinatura-linha">Responsável pela entrega</div>
          <div class="assinatura-linha">
            Responsável pelo recebimento
            ${receptores.length > 0 ? `<br /><strong>${escaparHtml(receptores.join(', '))}</strong>` : ''}
          </div>
        </div>

        <div class="rodape">
          Documento gerado por ${escaparHtml(empresaNome)} — ${escaparHtml(new Date().toLocaleDateString('pt-BR'))}
        </div>
      </body>
      </html>
    `

    const janela = window.open('', '_blank')

    if (!janela) {
      alert('A janela de impressão foi bloqueada. Permita pop-ups para este site e tente novamente.')
      return
    }

    janela.document.open()
    janela.document.write(html)
    janela.document.close()
    janela.focus()
    setTimeout(() => janela.print(), 300)
  }

  function abrirModalNF(pedido) {
    setPedidoNF(pedido)
    setNumeroNF('')
    setModalNFAberto(true)
  }

  async function confirmarNF() {
    if (salvandoNF || !pedidoNF) return

    if (!numeroNF.trim()) {
      alert('Digite o número da nota fiscal.')
      return
    }

    setSalvandoNF(true)

    try {
      const { data, error } = await supabase
        .from('pedidos')
        .update({
          status: 'Concluído',
          nota_fiscal: numeroNF.trim(),
        })
        .eq('id', pedidoNF.id)
        .eq('status', pedidoNF.status)
        .select('id')
        .maybeSingle()

      if (error) throw error

      if (!data) {
        throw new Error(
          'O pedido pode ter sido alterado ou você não tem permissão. Atualize a lista.'
        )
      }

      await baixarEstoqueDoPedido(pedidoNF)

      setModalNFAberto(false)
      await Promise.all([buscarPedidos(), buscarProdutos(), buscarClientes()])
    } catch (error) {
      alert('Erro ao lançar NF: ' + error.message)
    } finally {
      setSalvandoNF(false)
    }
  }

  const fornecedoresUsados = [
    ...new Set(pedidos.map((pedido) => pedido.fornecedor).filter(Boolean)),
  ]

  const clientesFiltradosModal = clientesLista
    .filter((cliente) =>
      normalizarTexto(cliente.nome).includes(normalizarTexto(buscaCliente))
    )
    .slice(0, 50)

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const termo = normalizarTexto(busca)

    const bateBusca =
      normalizarTexto(gerarNumeroPedido(pedido.id)).includes(termo) ||
      normalizarTexto(pedido.cliente).includes(termo) ||
      normalizarTexto(pedido.fornecedor).includes(termo) ||
      normalizarTexto(pedido.obs).includes(termo)

    const bateStatus =
      filtroStatus === 'Todos os status' ||
      labelStatus(pedido) === filtroStatus

    const bateData =
      !filtroDataEntrega || pedido.data_entrega === filtroDataEntrega

    return bateBusca && bateStatus && bateData
  })

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <button
          onClick={abrirModalNovoPedido}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          + Novo pedido
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por pedido, cliente, fornecedor ou observação..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 min-w-[220px] border rounded-lg px-4 py-2"
        />

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option>Todos os status</option>
          <option>Pendente</option>
          <option>Em andamento</option>
          <option>Entregue</option>
        </select>

        <div className="flex items-center gap-2">
          <label htmlFor="filtro-entrega" className="text-sm text-gray-600">
            Entrega:
          </label>
          <input
            id="filtro-entrega"
            type="date"
            value={filtroDataEntrega}
            onChange={(e) => setFiltroDataEntrega(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
          {filtroDataEntrega && (
            <button
              onClick={() => setFiltroDataEntrega('')}
              className="text-sm text-gray-600 hover:underline"
            >
              Limpar data
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Pedido</th>
              <th className="px-4 py-3 font-medium min-w-[200px]">Cliente</th>
              <th className="px-4 py-3 font-medium min-w-[260px]">Itens</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Criado em</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Entrega</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Ações</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Notas fiscais</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {pedidosFiltrados.map((pedido) => {
              const status = labelStatus(pedido)
              const alerta = infoEntrega(pedido)
              const notas = notasFiscaisDoPedido(pedido)

              return (
                <tr key={pedido.id} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-4 font-medium whitespace-nowrap">
                    <button
                      onClick={() => abrirModalDetalhes(pedido)}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      {gerarNumeroPedido(pedido.id)}
                    </button>
                  </td>

                  <td className="px-4 py-4 text-gray-800">
                    {pedido.cliente}
                    {pedido.fornecedor && (
                      <div className="text-xs text-gray-400 mt-1">
                        Fornecedor: {pedido.fornecedor}
                      </div>
                    )}
                    {pedido.obs && (
                      <div
                        className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1 max-w-[260px]"
                        title={pedido.obs}
                      >
                        📝 {resumoObs(pedido.obs)}
                      </div>
                    )}
                    {Number(pedido.credito_usado || 0) > 0 && (
                      <div className="text-xs text-emerald-700 mt-1">
                        Crédito usado: {formatarMoeda(pedido.credito_usado)}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <ul className="space-y-1">
                      {itensDoPedido(pedido).map((item, index) => (
                        <li key={index} className="text-sm text-gray-700">
                          {item.produto}{' '}
                          <span className="text-gray-400 whitespace-nowrap">
                            (
                            {pedido.status === 'Em produção'
                              ? `${item.produzido || 0}/${item.quantidade}kg`
                              : `${item.quantidade}kg`}
                            )
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>

                  <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                    {pedido.created_at
                      ? new Date(pedido.created_at).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>

                  <td className="px-4 py-4">
                    {pedido.data_entrega ? (
                      <div className="flex flex-col items-start gap-1">
                        <span className="whitespace-nowrap text-gray-700">
                          {formatarDataSimples(pedido.data_entrega)}
                        </span>
                        {alerta && (
                          <span
                            className={`whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${alerta.cor}`}
                          >
                            {alerta.texto}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${corStatus(status)}`}
                    >
                      {status}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-col items-start gap-1.5 whitespace-nowrap text-sm">
                      <button
                        onClick={() => abrirModalDetalhes(pedido)}
                        className="text-gray-600 hover:underline"
                      >
                        👁 Detalhes
                      </button>

                      {pedido.status !== 'Concluído' && (
                        <button
                          onClick={() => abrirModalEdicao(pedido)}
                          className="text-amber-600 hover:underline"
                        >
                          ✏️ Editar
                        </button>
                      )}

                      <button
                        onClick={() => duplicarPedido(pedido)}
                        className="text-emerald-700 hover:underline"
                      >
                        📋 Duplicar
                      </button>

                      {pedido.status === 'Em produção' && (
                        <button
                          onClick={() => abrirModalProducao(pedido)}
                          className="text-blue-600 hover:underline"
                        >
                          Registrar entrega
                        </button>
                      )}

                      <button
                        onClick={() => imprimirPedido(pedido)}
                        className="text-gray-600 hover:underline"
                      >
                        🖨 Imprimir
                      </button>

                      {pedido.status === 'Pendente' && (
                        <button
                          onClick={() => abrirModalNF(pedido)}
                          className="text-emerald-600 hover:underline"
                        >
                          Lançar NF
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

                  <td className="px-4 py-4 text-gray-700">
                    {notas.length > 0 ? notas.join(', ') : '-'}
                  </td>
                </tr>
              )
            })}

            {pedidosFiltrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-gray-500">
                  Nenhum pedido encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalNovoAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {pedidoEditando
                ? `Editar pedido ${gerarNumeroPedido(pedidoEditando.id)}`
                : 'Novo pedido'}
            </h2>

            {pedidoEditando && (
              <p className="bg-emerald-50 text-emerald-700 p-2 rounded mb-3 text-sm">
                O cliente não pode ser alterado. Itens já entregues não podem
                ser removidos nem reduzidos abaixo da quantidade entregue.
              </p>
            )}

            {origemDuplicacao && (
              <p className="bg-blue-50 text-blue-700 p-2 rounded mb-3 text-sm">
                Duplicando {origemDuplicacao}. Ao salvar, este será um novo
                pedido e poderá usar o saldo disponível do cliente.
              </p>
            )}

            {clientesLista.length === 0 && (
              <p className="bg-yellow-100 text-yellow-700 p-2 rounded mb-3 text-sm">
                Nenhum cliente carregado. Cadastre um cliente ou confira a conexão.
              </p>
            )}

            {produtosLista.length === 0 && (
              <p className="bg-yellow-100 text-yellow-700 p-2 rounded mb-3 text-sm">
                Nenhum produto carregado. Cadastre um produto ou confira a conexão.
              </p>
            )}

            <label className="block mb-1 font-medium">Cliente</label>

            {pedidoEditando ? (
              <input
                type="text"
                value={pedidoEditando.cliente || ''}
                disabled
                className="w-full border rounded-lg px-3 py-2 mb-4 bg-gray-100"
              />
            ) : (
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Digite o nome do cliente para buscar..."
                  value={buscaCliente}
                  onChange={(e) => {
                    setBuscaCliente(e.target.value)
                    setClienteSelecionado(null)
                    setMostrarListaClientes(true)
                  }}
                  onFocus={() => setMostrarListaClientes(true)}
                  onBlur={() => setMostrarListaClientes(false)}
                  autoComplete="off"
                  className="w-full border rounded-lg px-3 py-2"
                />

                {clienteSelecionado && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Cliente selecionado: {clienteSelecionado.nome}
                  </p>
                )}

                {mostrarListaClientes && (
                  <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {clientesFiltradosModal.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-400">
                        Nenhum cliente encontrado.
                      </p>
                    ) : (
                      clientesFiltradosModal.map((cliente) => (
                        <button
                          type="button"
                          key={cliente.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            selecionarCliente(cliente)
                          }}
                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 ${
                            clienteSelecionado?.id === cliente.id
                              ? 'bg-emerald-100 font-medium'
                              : ''
                          }`}
                        >
                          {cliente.nome}
                          {cliente.cnpj && cliente.cnpj !== '-' && (
                            <span className="block text-xs text-gray-500">
                              CNPJ: {cliente.cnpj}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <label className="block mb-1 font-medium">
              Produto recebido de (fornecedor) — opcional
            </label>
            <input
              type="text"
              list="lista-fornecedores"
              placeholder="Ex: Frigorífico Silva"
              value={fornecedorNovoPedido}
              onChange={(e) => setFornecedorNovoPedido(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-1"
            />
            <datalist id="lista-fornecedores">
              {fornecedoresUsados.map((fornecedor) => (
                <option key={fornecedor} value={fornecedor} />
              ))}
            </datalist>
            <p className="text-xs text-gray-400 mb-4">
              De quem você comprou o produto. Não aparece na impressão.
            </p>

            <label className="block mb-1 font-medium">
              Data de entrega (opcional)
            </label>
            <input
              type="date"
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />

            <label className="block mb-1 font-medium">Itens</label>

            {itensNovoPedido.map((item, index) => {
              const jaEntregue = Number(item.produzido || 0)
              const travado = jaEntregue > 0

              return (
                <div key={index} className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={item.produto}
                      onChange={(e) =>
                        selecionarProdutoNoItem(index, e.target.value)
                      }
                      disabled={travado}
                      className="flex-1 min-w-[160px] border rounded-lg px-3 py-2 disabled:bg-gray-100"
                    >
                      <option value="">Selecione um produto</option>
                      {item.produto &&
                        !produtosLista.some((p) => p.nome === item.produto) && (
                          <option value={item.produto}>
                            {item.produto} (não encontrado no cadastro)
                          </option>
                        )}
                      {produtosLista.map((produto) => (
                        <option key={produto.id} value={produto.nome}>
                          {produto.nome}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="any"
                      min={travado ? jaEntregue : 0}
                      placeholder="Qtd (kg)"
                      value={item.quantidade}
                      onChange={(e) =>
                        atualizarItemNovoPedido(index, 'quantidade', e.target.value)
                      }
                      className="w-24 border rounded-lg px-2 py-2"
                    />

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="R$/kg"
                      title="Preço por kg neste pedido"
                      value={item.preco}
                      onChange={(e) =>
                        atualizarItemNovoPedido(index, 'preco', e.target.value)
                      }
                      className="w-28 border rounded-lg px-2 py-2"
                    />

                    {itensNovoPedido.length > 1 && !travado && (
                      <button
                        onClick={() => removerLinhaItem(index)}
                        className="text-red-500 px-2"
                        aria-label="Remover item"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {travado && (
                    <p className="text-xs text-amber-600 mt-1">
                      Já entregue: {jaEntregue} kg. Este item não pode ser
                      removido nem reduzido abaixo disso.
                    </p>
                  )}
                </div>
              )
            })}

            <p className="text-xs text-gray-400 mb-2">
              O preço vem do cadastro do produto e pode ser alterado para este pedido.
            </p>

            <button
              onClick={adicionarLinhaItem}
              className="text-emerald-600 text-sm mb-4"
            >
              + Adicionar item
            </button>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <p>
                Total estimado: <strong>{formatarMoeda(totalNovoPedido)}</strong>
              </p>

              {pedidoAntigo ? (
                <p className="text-amber-700 mt-2">
                  Este pedido é anterior ao crédito. Sua edição não abaterá
                  crédito novamente.
                </p>
              ) : (
                <>
                  <label className="flex items-center gap-2 mt-3 font-medium">
                    <input
                      type="checkbox"
                      checked={usarCredito}
                      onChange={(e) => setUsarCredito(e.target.checked)}
                    />
                    Usar crédito do cliente
                  </label>

                  {clienteSelecionado ? (
                    <div className="mt-2 space-y-1">
                      <p>Saldo atual: {formatarMoeda(saldoClienteAtual)}</p>
                      {pedidoEditando && (
                        <p>
                          Crédito já usado neste pedido:{' '}
                          {formatarMoeda(creditoAnterior)}
                        </p>
                      )}
                      <p>
                        Crédito estimado para o pedido:{' '}
                        <strong>{formatarMoeda(creditoEstimado)}</strong>
                      </p>
                      <p>
                        Falta pagar estimado:{' '}
                        <strong>
                          {formatarMoeda(
                            Math.max(totalAtualArredondado - creditoEstimado, 0)
                          )}
                        </strong>
                      </p>
                      <p>
                        Saldo restante estimado: {formatarMoeda(saldoEstimado)}
                      </p>
                      <p className="text-xs text-gray-500">
                        O saldo definitivo é calculado ao salvar e pode mudar
                        se outro pedido for lançado ao mesmo tempo.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">
                      Selecione um cliente para ver o saldo.
                    </p>
                  )}
                </>
              )}
            </div>

            <label className="block mb-1 font-medium">
              Observações (opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Entregar pela manhã, ligar antes de chegar..."
              value={obsPedido}
              onChange={(e) => setObsPedido(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-1"
            />
            <p className="text-xs text-gray-400">
              Aparece na tabela, nos detalhes e na impressão do pedido.
            </p>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={fecharModalNovo}
                disabled={salvandoPedido}
                className="px-4 py-2 rounded-lg border disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovoPedido}
                disabled={salvandoPedido}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
              >
                {salvandoPedido
                  ? 'Salvando...'
                  : pedidoEditando
                    ? 'Salvar alterações'
                    : 'Salvar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pedidoRecemCriado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Pedido criado!</h2>
            <p className="text-gray-600 mb-3">
              {gerarNumeroPedido(pedidoRecemCriado.id)} — {pedidoRecemCriado.cliente}
            </p>
            <p className="text-sm">
              Total: <strong>{formatarMoeda(valorTotalPedido(pedidoRecemCriado))}</strong>
            </p>
            <p className="text-sm">
              Crédito usado:{' '}
              <strong>{formatarMoeda(pedidoRecemCriado.credito_usado)}</strong>
            </p>
            <p className="text-sm mb-4">
              Falta pagar:{' '}
              <strong>
                {formatarMoeda(
                  Math.max(
                    valorTotalPedido(pedidoRecemCriado) -
                      Number(pedidoRecemCriado.credito_usado || 0),
                    0
                  )
                )}
              </strong>
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPedidoRecemCriado(null)}
                className="px-4 py-2 rounded-lg border"
              >
                Fechar
              </button>
              <button
                onClick={() => imprimirPedido(pedidoRecemCriado)}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white"
              >
                🖨 Imprimir pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {modalProducaoAberto && pedidoProducao && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1">Registrar entrega</h2>
            <p className="text-gray-500 mb-4">
              Pedido {gerarNumeroPedido(pedidoProducao.id)} — {pedidoProducao.cliente}
            </p>

            <label className="block mb-1 font-medium">
              Número da nota fiscal desta entrega
            </label>
            <input
              type="text"
              placeholder="Ex: 123456"
              value={notaFiscalEntrega}
              onChange={(e) => setNotaFiscalEntrega(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-1"
            />
            <p className="text-xs text-gray-400 mb-4">
              A nota fica vinculada às quantidades desta entrega.
            </p>

            <label className="block mb-1 font-medium">
              Quem recebeu o produto
            </label>
            <input
              type="text"
              placeholder="Ex: João da Silva"
              value={recebidoPor}
              onChange={(e) => setRecebidoPor(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />

            {itensDoPedido(pedidoProducao).map((item, index) => {
              const falta =
                Number(item.quantidade || 0) - Number(item.produzido || 0)

              return (
                <div key={index} className="border rounded-lg p-3 mb-3">
                  <p className="font-medium">{item.produto}</p>
                  <p className="text-sm text-gray-500">
                    Pedido: {item.quantidade} kg · Já entregue: {item.produzido || 0} kg
                    · Falta: {Math.max(falta, 0)} kg
                  </p>

                  {Array.isArray(item.historico) && item.historico.length > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      {item.historico.map((entrega, i) => (
                        <div key={i}>
                          Entregou {entrega.quantidade} kg em{' '}
                          {formatarDataHora(entrega.data)}
                          {entrega.nota_fiscal ? ` — NF ${entrega.nota_fiscal}` : ''}
                          {entrega.recebido_por
                            ? ` — Recebido por: ${entrega.recebido_por}`
                            : ''}
                        </div>
                      ))}
                    </div>
                  )}

                  {falta > 0 ? (
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={falta}
                      placeholder={`Entregar agora (até ${falta} kg)`}
                      value={quantidadesProduzidas[index] ?? ''}
                      onChange={(e) =>
                        atualizarQuantidadeProduzida(index, e.target.value, falta)
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-2"
                    />
                  ) : (
                    <p className="text-emerald-600 text-sm mt-2">
                      ✓ Item 100% entregue
                    </p>
                  )}
                </div>
              )
            })}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setModalProducaoAberto(false)}
                disabled={salvandoEntrega}
                className="px-4 py-2 rounded-lg border disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarProducao}
                disabled={salvandoEntrega}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
              >
                {salvandoEntrega ? 'Salvando...' : 'Salvar entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalDetalhesAberto && pedidoDetalhes && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1">Detalhes do pedido</h2>
            <p className="text-gray-500 mb-2">
              {gerarNumeroPedido(pedidoDetalhes.id)} — {pedidoDetalhes.cliente}
            </p>

            {pedidoDetalhes.data_entrega && (
              <p className="text-sm text-gray-500 mb-2">
                Entrega prevista:{' '}
                <strong>{formatarDataSimples(pedidoDetalhes.data_entrega)}</strong>
                {infoEntrega(pedidoDetalhes) && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${infoEntrega(pedidoDetalhes).cor}`}
                  >
                    {infoEntrega(pedidoDetalhes).texto}
                  </span>
                )}
              </p>
            )}

            <p className="mb-2">
              Status:{' '}
              <span
                className={`px-3 py-1 rounded-full text-sm ${corStatus(labelStatus(pedidoDetalhes))}`}
              >
                {labelStatus(pedidoDetalhes)}
              </span>
            </p>

            {pedidoDetalhes.fornecedor && (
              <p className="text-sm text-gray-500 mb-1">
                Produto recebido de: <strong>{pedidoDetalhes.fornecedor}</strong>
              </p>
            )}

            {notasFiscaisDoPedido(pedidoDetalhes).length > 0 && (
              <p className="text-sm text-gray-500 mb-1">
                Notas fiscais:{' '}
                <strong>{notasFiscaisDoPedido(pedidoDetalhes).join(', ')}</strong>
              </p>
            )}

            {receptoresDoPedido(pedidoDetalhes).length > 0 && (
              <p className="text-sm text-gray-500 mb-2">
                Recebido por:{' '}
                <strong>{receptoresDoPedido(pedidoDetalhes).join(', ')}</strong>
              </p>
            )}

            {pedidoDetalhes.obs && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-amber-700 mb-1">
                  📝 Observações
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {pedidoDetalhes.obs}
                </p>
              </div>
            )}

            {itensDoPedido(pedidoDetalhes).some((item) => item.preco != null) && (
              <div className="text-sm text-gray-800 mb-4">
                <p>
                  Valor total: <strong>{formatarMoeda(valorTotalPedido(pedidoDetalhes))}</strong>
                </p>
                {pedidoDetalhes.cliente_id != null && (
                  <>
                    <p>
                      Crédito usado:{' '}
                      <strong>{formatarMoeda(pedidoDetalhes.credito_usado)}</strong>
                    </p>
                    <p>
                      Falta pagar:{' '}
                      <strong>
                        {formatarMoeda(
                          Math.max(
                            valorTotalPedido(pedidoDetalhes) -
                              Number(pedidoDetalhes.credito_usado || 0),
                            0
                          )
                        )}
                      </strong>
                    </p>
                  </>
                )}
              </div>
            )}

            {itensDoPedido(pedidoDetalhes).map((item, index) => {
              const falta =
                Number(item.quantidade || 0) - Number(item.produzido || 0)

              return (
                <div key={index} className="border rounded-lg p-3 mb-3">
                  <p className="font-medium">{item.produto}</p>
                  <p className="text-sm text-gray-500">
                    Pedido: {item.quantidade} kg · Entregue: {item.produzido || 0} kg
                    · Falta: {Math.max(falta, 0)} kg
                  </p>

                  {item.preco != null && (
                    <p className="text-sm text-gray-500 mb-2">
                      Preço: {formatarMoeda(item.preco)}/kg · Total do item:{' '}
                      {formatarMoeda(Number(item.preco) * Number(item.quantidade))}
                    </p>
                  )}

                  {Array.isArray(item.historico) && item.historico.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        Histórico de entregas:
                      </p>
                      <div className="text-xs text-gray-500 space-y-1">
                        {item.historico.map((entrega, i) => (
                          <div key={i}>
                            • Entregou {entrega.quantidade} kg em{' '}
                            {formatarDataHora(entrega.data)}
                            {entrega.nota_fiscal ? ` — NF: ${entrega.nota_fiscal}` : ''}
                            {entrega.recebido_por
                              ? ` — Recebido por: ${entrega.recebido_por}`
                              : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Nenhuma entrega registrada ainda.
                    </p>
                  )}
                </div>
              )
            })}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => imprimirPedido(pedidoDetalhes)}
                className="px-4 py-2 rounded-lg border"
              >
                🖨 Imprimir
              </button>
              <button
                onClick={() => setModalDetalhesAberto(false)}
                className="px-4 py-2 rounded-lg border"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalNFAberto && pedidoNF && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Lançar nota fiscal</h2>
            <p className="mb-2">
              Pedido {gerarNumeroPedido(pedidoNF.id)} — {pedidoNF.cliente}
            </p>
            <input
              type="text"
              placeholder="Número da nota fiscal"
              value={numeroNF}
              onChange={(e) => setNumeroNF(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalNFAberto(false)}
                disabled={salvandoNF}
                className="px-4 py-2 rounded-lg border disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarNF}
                disabled={salvandoNF}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
              >
                {salvandoNF ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Pedidos