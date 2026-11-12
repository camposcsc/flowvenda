import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function lerValorCredito(valor) {
  const texto = String(valor).trim().replace(',', '.')

  if (texto === '') return 0

  const numero = Number(texto)

  if (!Number.isFinite(numero) || numero < 0 || numero > 999999999999.99) {
    return null
  }

  // O saldo é armazenado com no máximo duas casas decimais.
  if (!/^\d+([.]\d{1,2})?$/.test(texto)) {
    return null
  }

  return numero
}

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)

  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)

  const [cnpj, setCnpj] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [creditoInicial, setCreditoInicial] = useState('')

  const [clienteCredito, setClienteCredito] = useState(null)
  const [novoSaldo, setNovoSaldo] = useState('')
  const [salvandoCredito, setSalvandoCredito] = useState(false)

  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [erroCnpj, setErroCnpj] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    buscarClientes()
  }, [])

  async function buscarClientes() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log('Erro ao buscar clientes:', error)
      alert('Erro ao carregar clientes: ' + error.message)
    } else {
      setClientes(data || [])
    }

    setCarregando(false)
  }

  const totalClientes = clientes.length
  const clientesAtivos = clientes.filter((c) => c.status === 'Ativo').length

  const clientesFiltrados = clientes.filter(
    (c) =>
      (c.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(busca.toLowerCase())
  )

  function formatarTelefone(ddd, numero) {
    if (!ddd || !numero) return ''
    return `(${ddd}) ${numero}`
  }

  async function tentarBrasilApi(cnpjLimpo) {
    const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`)

    if (!resposta.ok) {
      throw new Error(`status ${resposta.status}`)
    }

    const dados = await resposta.json()

    return {
      nome: dados.razao_social || dados.nome_fantasia || '',
      email: dados.email || '',
      telefone: formatarTelefone(
        dados.ddd_telefone_1?.slice(0, 2),
        dados.ddd_telefone_1?.slice(2)
      ),
      endereco: [dados.logradouro, dados.numero, dados.bairro, dados.municipio, dados.uf]
        .filter(Boolean)
        .join(', '),
    }
  }

  async function tentarPublicaCnpjWs(cnpjLimpo) {
    const resposta = await fetch(`https://publica.cnpj.ws/cnpj/${cnpjLimpo}`)

    if (!resposta.ok) {
      throw new Error(`status ${resposta.status}`)
    }

    const dados = await resposta.json()
    const estab = dados.estabelecimento || {}

    return {
      nome: dados.razao_social || estab.nome_fantasia || '',
      email: estab.email || '',
      telefone: formatarTelefone(estab.ddd1, estab.telefone1),
      endereco: [
        estab.logradouro,
        estab.numero,
        estab.bairro,
        estab.cidade?.nome,
        estab.estado?.sigla,
      ]
        .filter(Boolean)
        .join(', '),
    }
  }

  async function buscarCnpj() {
    const cnpjLimpo = cnpj.replace(/\D/g, '')

    if (cnpjLimpo.length !== 14) {
      setErroCnpj('Digite um CNPJ válido com 14 números.')
      return
    }

    setBuscandoCnpj(true)
    setErroCnpj('')

    try {
      let resultado

      try {
        resultado = await tentarBrasilApi(cnpjLimpo)
      } catch (erro1) {
        console.log('BrasilAPI falhou, tentando plano B...', erro1.message)
        resultado = await tentarPublicaCnpjWs(cnpjLimpo)
      }

      setNome(resultado.nome)
      setEmail(resultado.email)
      setTelefone(resultado.telefone)
      setEndereco(resultado.endereco)
    } catch (erroFinal) {
      console.log('Ambos os serviços falharam:', erroFinal)
      setErroCnpj(
        'Não foi possível buscar esse CNPJ agora. Tente novamente em instantes ou preencha manualmente.'
      )
    } finally {
      setBuscandoCnpj(false)
    }
  }

  async function salvarCliente() {
    if (salvando) return

    if (!nome.trim()) {
      alert('Informe o nome do cliente.')
      return
    }

    const saldo = lerValorCredito(creditoInicial)

    if (saldo === null) {
      alert('Informe um crédito válido e não negativo, com até duas casas decimais.')
      return
    }

    setSalvando(true)

    const { error } = await supabase.from('clientes').insert([
      {
        nome: nome.trim(),
        email: email || '-',
        telefone: telefone || '-',
        cnpj: cnpj || '-',
        endereco: endereco || '-',
        status: 'Ativo',
        saldo_credito: saldo,
      },
    ])

    setSalvando(false)

    if (error) {
      console.log('Erro ao salvar cliente:', error)
      alert('Erro ao salvar cliente: ' + error.message)
      return
    }

    fecharModal()
    await buscarClientes()
  }

  function fecharModal() {
    if (salvando) return

    setModalAberto(false)
    setCnpj('')
    setNome('')
    setEmail('')
    setTelefone('')
    setEndereco('')
    setCreditoInicial('')
    setErroCnpj('')
  }

  function abrirCredito(cliente) {
    setClienteCredito(cliente)
    setNovoSaldo(Number(cliente.saldo_credito || 0).toFixed(2))
  }

  function fecharCredito() {
    if (salvandoCredito) return

    setClienteCredito(null)
    setNovoSaldo('')
  }

  async function salvarCredito() {
    if (salvandoCredito || !clienteCredito) return

    const saldo = lerValorCredito(novoSaldo)

    if (saldo === null) {
      alert('Informe um saldo válido e não negativo, com até duas casas decimais.')
      return
    }

    const confirmar = window.confirm(
      `O saldo restante de ${clienteCredito.nome} será definido como ${formatarMoeda(saldo)}. Deseja continuar?`
    )

    if (!confirmar) return

    setSalvandoCredito(true)

    // Evita sobrescrever um saldo que mudou desde que o formulário foi aberto.
    const { data, error } = await supabase
      .from('clientes')
      .update({ saldo_credito: saldo })
      .eq('id', clienteCredito.id)
      .eq('saldo_credito', clienteCredito.saldo_credito ?? 0)
      .select('id')

    setSalvandoCredito(false)

    if (error) {
      alert('Erro ao salvar crédito: ' + error.message)
      return
    }

    if (!data || data.length === 0) {
      alert(
        'O saldo pode ter sido alterado por outra pessoa ou você não tem permissão para alterá-lo. A lista será atualizada; confira o saldo e tente novamente.'
      )
      setClienteCredito(null)
      setNovoSaldo('')
      await buscarClientes()
      return
    }

    setClienteCredito(null)
    setNovoSaldo('')
    await buscarClientes()
    alert('Saldo de crédito atualizado com sucesso.')
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Novo cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total de clientes</p>
          <p className="text-2xl font-bold text-gray-800">{totalClientes}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Clientes ativos</p>
          <p className="text-2xl font-bold text-gray-800">{clientesAtivos}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Novos este mês</p>
          <p className="text-2xl font-bold text-emerald-600">+12</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome ou e-mail..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full sm:w-80 border border-gray-200 rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        {carregando ? (
          <p className="p-6 text-gray-500 text-sm">Carregando clientes...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-6 py-3 font-medium">Nome</th>
                <th className="px-6 py-3 font-medium">E-mail</th>
                <th className="px-6 py-3 font-medium">Telefone</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Saldo de crédito</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-gray-800">{c.nome}</td>
                  <td className="px-6 py-4 text-gray-600">{c.email}</td>
                  <td className="px-6 py-4 text-gray-600">{c.telefone}</td>
                  <td className="px-6 py-4 text-gray-800 whitespace-nowrap">
                    {formatarMoeda(c.saldo_credito)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full ${
                        c.status === 'Ativo'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => abrirCredito(c)}
                      className="text-emerald-700 hover:underline"
                    >
                      💰 Ajustar crédito
                    </button>
                  </td>
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-gray-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 mb-4">Novo cliente</h3>

            <label className="text-sm text-gray-600 mb-1 block">CNPJ</label>
            <div className="flex gap-2 mb-1">
              <input
                type="text"
                placeholder="Com ou sem pontos/traços"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={buscarCnpj}
                disabled={buscandoCnpj}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg whitespace-nowrap disabled:opacity-50"
              >
                {buscandoCnpj ? 'Buscando...' : '🔍 Buscar CNPJ'}
              </button>
            </div>
            {erroCnpj && <p className="text-xs text-red-500 mb-3">{erroCnpj}</p>}
            {!erroCnpj && <div className="mb-3"></div>}

            <label className="text-sm text-gray-600 mb-1 block">Nome / Razão Social</label>
            <input
              type="text"
              placeholder="Nome do cliente"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <label className="text-sm text-gray-600 mb-1 block">E-mail</label>
            <input
              type="text"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <label className="text-sm text-gray-600 mb-1 block">Telefone</label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <label className="text-sm text-gray-600 mb-1 block">Endereço</label>
            <input
              type="text"
              placeholder="Endereço completo"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <label className="text-sm text-gray-600 mb-1 block">
              Saldo inicial de crédito (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 500,00"
              value={creditoInicial}
              onChange={(e) => setCreditoInicial(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-500 mb-4">
              Informe o saldo que ainda resta. Deixe vazio se o cliente não tiver crédito.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={fecharModal}
                disabled={salvando}
                className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCliente}
                disabled={salvando}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {clienteCredito && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-2">Ajustar saldo de crédito</h3>
            <p className="text-sm text-gray-600 mb-3">{clienteCredito.nome}</p>
            <p className="text-sm text-gray-600 mb-3">
              Saldo atual: <strong>{formatarMoeda(clienteCredito.saldo_credito)}</strong>
            </p>

            <label className="text-sm text-gray-600 mb-1 block">
              Novo saldo restante (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 500,00"
              value={novoSaldo}
              onChange={(e) => setNovoSaldo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mb-4">
              Este valor substitui o saldo atual. Informe quanto o cliente ainda tem
              disponível, já descontando os pedidos antigos.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={fecharCredito}
                disabled={salvandoCredito}
                className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCredito}
                disabled={salvandoCredito}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                {salvandoCredito ? 'Salvando...' : 'Salvar saldo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes