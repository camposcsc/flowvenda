import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function RotaProtegida({ children }) {
  const [carregando, setCarregando] = useState(true)
  const [autenticado, setAutenticado] = useState(false)

  useEffect(() => {
    async function verificarSessao() {
      const { data } = await supabase.auth.getSession()
      setAutenticado(!!data.session)
      setCarregando(false)
    }

    verificarSessao()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutenticado(!!session)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Carregando...
      </div>
    )
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default RotaProtegida