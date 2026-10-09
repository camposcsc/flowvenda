import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function Configuracoes() {
  const [empresaId, setEmpresaId] = useState(null)
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [endereco, setEndereco] = useState('')
  const [telefone, setTelefone] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)

  useEffect(() => {
    buscarEmpresa()
  }, [])

  async function buscarEmpresa() {
    const { data, error } = await supabase.from('empresa').select('*').limit(1)
    if (error) {
      console.log('Erro ao buscar empresa:', error)
      setCarregando(false)
      return
    }
    if (data && data.length > 0) {
      const emp = data[0]
      setEmpresaId(emp.id)
      setNome(emp.nome || '')
      setCnpj(emp.cnpj || '')
      setEndereco(emp.endereco || '')
      setTelefone(emp.telefone || '')
      setLogoUrl(emp.logo_url || '')
    }
    setCarregando(false)
  }

  async function buscarDadosCnpj() {
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) {
      alert('Digite um CNPJ válido (14 números)')
      return
    }

    setBuscandoCnpj(true)

    try {
      // Tenta primeiro a BrasilAPI
      const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`)
      if (!resposta.ok) throw new Error('BrasilAPI falhou')
      const dados = await resposta.json()

      setNome(dados.razao_social || dados.nome_fantasia || '')
      const enderecoMontado = [
        dados.logradouro,
        dados.numero,
        dados.bairro,
        dados.municipio,
        dados.uf,
      ].filter(Boolean).join(', ')
      setEndereco(enderecoMontado)
      if (dados.ddd_telefone_1) setTelefone(dados.ddd_telefone_1)

    } catch (erroBrasilApi) {
      console.log('BrasilAPI falhou, tentando fallback...', erroBrasilApi)

      try {
        const resposta2 = await fetch(`https://publica.cnpj.ws/cnpj/${cnpjLimpo}`)
        if (!resposta2.ok) throw new Error('Fallback também falhou')
        const dados2 = await resposta2.json()

        setNome(dados2.razao_social || '')
        const est = dados2.estabelecimento || {}
        const enderecoMontado2 = [
          est.logradouro,
          est.numero,
          est.bairro,
          est.cidade?.nome,
          est.estado?.sigla,
        ].filter(Boolean).join(', ')
        setEndereco(enderecoMontado2)
        if (est.ddd1 && est.telefone1) setTelefone(`(${est.ddd1}) ${est.telefone1}`)

      } catch (erroFallback) {
        console.log('Erro no fallback:', erroFallback)
        alert('Não foi possível buscar os dados desse CNPJ. Verifique e tente novamente, ou preencha manualmente.')
      }
    }

    setBuscandoCnpj(false)
  }

  function handleFileChange(e) {
    const arquivo = e.target.files[0]
    if (!arquivo) return
    setLogoFile(arquivo)
    setLogoPreview(URL.createObjectURL(arquivo))
  }

  async function salvarConfiguracoes() {
    if (!nome) {
      alert('Digite o nome da empresa')
      return
    }

    setSalvando(true)
    let logoUrlFinal = logoUrl

    if (logoFile) {
      const nomeArquivo = `logo-${Date.now()}-${logoFile.name}`
      const { error: erroUpload } = await supabase.storage
        .from('logos')
        .upload(nomeArquivo, logoFile, { upsert: true })

      if (erroUpload) {
        alert('Erro ao enviar a logo: ' + erroUpload.message)
        setSalvando(false)
        return
      }

      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(nomeArquivo)
      logoUrlFinal = urlData.publicUrl
    }

    if (empresaId) {
      const { error } = await supabase
        .from('empresa')
        .update({ nome, cnpj, endereco, telefone, logo_url: logoUrlFinal })
        .eq('id', empresaId)

      if (error) {
        alert('Erro ao salvar: ' + error.message)
        setSalvando(false)
        return
      }
    } else {
      const { data, error } = await supabase
        .from('empresa')
        .insert([{ nome, cnpj, endereco, telefone, logo_url: logoUrlFinal }])
        .select()

      if (error) {
        alert('Erro ao salvar: ' + error.message)
        setSalvando(false)
        return
      }
      if (data && data.length > 0) setEmpresaId(data[0].id)
    }

    setLogoUrl(logoUrlFinal)
    setLogoFile(null)
    setLogoPreview('')
    setSalvando(false)
    alert('Configurações salvas com sucesso!')
  }

  if (carregando) {
    return <p className="text-gray-500">Carregando...</p>
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Configurações</h2>
      <p className="text-gray-500 mb-6">
        Dados da sua empresa usados nos documentos impressos (pedidos, etc).
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <button
              onClick={buscarDadosCnpj}
              disabled={buscandoCnpj}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm whitespace-nowrap disabled:opacity-50"
            >
              {buscandoCnpj ? 'Buscando...' : 'Buscar dados'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Digite o CNPJ e clique em "Buscar dados" para preencher automaticamente.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome da empresa
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Frigorífico Boa Carne Ltda"
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
          <input
            type="text"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Rua Exemplo, 123 - Centro - Cidade/UF"
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input
            type="text"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo da empresa</label>

          {(logoPreview || logoUrl) && (
            <img
              src={logoPreview || logoUrl}
              alt="Logo da empresa"
              className="h-20 w-auto object-contain border border-gray-200 rounded-lg p-2 mb-3"
            />
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm text-gray-600"
          />
        </div>

        <button
          onClick={salvarConfiguracoes}
          disabled={salvando}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  )
}

export default Configuracoes