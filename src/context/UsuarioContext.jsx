import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const UsuarioContext = createContext(null)

export function UsuarioProvider({ children }) {
  const [usuario, setUsuario] = useState(null)

  useEffect(() => {
    async function carregarUsuario() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setUsuario(null)
        return
      }

      const nomeUsuario = user.email.split('@')[0]

      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .eq('nome_usuario', nomeUsuario)
        .single()

      if (data) {
        setUsuario(data)
      } else {
        setUsuario({ nome_completo: nomeUsuario, nome_usuario: nomeUsuario })
      }
    }

    carregarUsuario()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      carregarUsuario()
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <UsuarioContext.Provider value={usuario}>
      {children}
    </UsuarioContext.Provider>
  )
}

export function useUsuario() {
  return useContext(UsuarioContext)
}