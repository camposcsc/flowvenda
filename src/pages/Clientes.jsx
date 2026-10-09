import { useState } from 'react'

function Clientes() {
  const [clientes, setClientes] = useState([
    { id: 1, nome: 'Ana Souza', email: 'ana.souza@email.com', telefone: '(11) 98765-4321', pedidos: 12, status: 'Ativo' },
    { id: 2, nome: 'Carlos Lima', email: 'carlos.lima@email.com', telefone: '(11) 91234-5678', pedidos: 8, status: 'Ativo' },
    { id: 3, nome: 'Beatriz Alves', email: 'beatriz.alves@email.com', telefone: '(21) 99876-5432', pedidos: 5, status: 'Inativo' },
    { id: 4, nome: 'João Pedro', email: 'joao.pedro@email.com', telefone: '(31) 98888-1234', pedidos: 3, status: 'Ativo' },
    { id: 5, nome: 'Fernanda Dias', email: 'fernanda.dias@email.com', telefone: '(41) 97777-4321', pedidos: 15, status: 'Ativo' },
  ])

  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)

  const [cnpj, setCnpj] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')

  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [erroCnpj, setErroCnpj] = useState('')

  const totalClientes = clientes.length
  const clientesAtivos = clientes.filter((c) => c.status === 'Ativo').length

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.email.toLowerCase().includes(busca.toLowerCase())
  )

  function formatarTelefone(ddd, numero) {
    if (!ddd || !numero) return ''
    return `(${ddd}) ${numero}`
  }

  // Tenta buscar na BrasilAPI
  async function tentarBrasilApi(cnpjLimpo) {
    const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`)
    if (!resposta.ok) {
      throw new Error(`status ${resposta.status}`)
    }
    const dados = await resposta.json()

    return {
      nome: dados.razao_social || dados.nome_fantasia || '',
      email: dados.email || '',
      telefone: formatarTelefone(dados.ddd_telefone_1?.slice(0, 2), dados.ddd_telefone_1?.slice(2)),
      endereco: [dados.logradouro, dados.numero, dados.bairro, dados.municipio, dados.uf]
        .filter(Boolean)
        .join(', '),
    }
  }

  // Plano B: Publica CNPJ.ws
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
      setErroCnpj('Não foi possível buscar esse CNPJ agora. Tente novamente em instantes ou preencha manualmente.')
    } finally {
      setBuscandoCnpj(false)
    }
  }

  function salvarCliente() {
    if (!nome.trim()) {
      alert('Informe o nome do cliente.')
      return
    }

    const novoCliente = {
      id: Date.now(),
      nome,
      email: email || '-',
      telefone: telefone || '-',
      pedidos: 0,
      status: 'Ativo',
    }

    setClientes((prev) => [novoCliente, ...prev])
    fecharModal()
  }

  function fecharModal() {
    setModalAberto(false)
    setCnpj('')
    setNome('')
    setEmail('')
    setTelefone('')
    setEndereco('')
    setErroCnpj('')
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
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
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3 font-medium">Nome</th>
              <th className="px-6 py-3 font-medium">E-mail</th>
              <th className="px-6 py-3 font-medium">Telefone</th>
              <th className="px-6 py-3 font-medium">Pedidos</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 last:border-0">
                <td className="px-6 py-4 font-medium text-gray-800">{c.nome}</td>
                <td className="px-6 py-4 text-gray-600">{c.email}</td>
                <td className="px-6 py-4 text-gray-600">{c.telefone}</td>
                <td className="px-6 py-4 text-gray-600">{c.pedidos}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
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
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={fecharModal}
                className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCliente}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Salvar cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes