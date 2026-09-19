import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { RespuestaSesion, UsuarioActual } from '../tipos.ts'
import { api, borrarSesion, guardarSesion, leerToken } from '../api/cliente.ts'

interface ContextoSesion {
  usuario: UsuarioActual | null
  entrar: (email: string, clave: string) => Promise<UsuarioActual>
  salir: () => void
  cargando: boolean
}

const Ctx = createContext<ContextoSesion | null>(null)

function leerUsuarioGuardado(): UsuarioActual | null {
  const token = leerToken()
  if (!token) return null
  const raw = localStorage.getItem('techserv.sesion')
  if (!raw) return null
  try {
    const sesion: RespuestaSesion = JSON.parse(raw)
    return sesion.usuario
  } catch {
    return null
  }
}

export function SesionProvider(props: { children: ReactNode }): ReactNode {
  const [usuario, setUsuario] = useState<UsuarioActual | null>(leerUsuarioGuardado)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const token = leerToken()
    if (!token) {
      setCargando(false)
      return
    }
    api
      .get('/auth/yo')
      .then((r) => {
        const u = r.data as UsuarioActual
        setUsuario(u)
      })
      .catch(() => {
        borrarSesion()
        setUsuario(null)
      })
      .finally(() => setCargando(false))
  }, [])

  const entrar = useCallback(async (email: string, clave: string): Promise<UsuarioActual> => {
    const r = await api.post('/auth/login', { email, clave })
    const sesion = r.data as RespuestaSesion
    guardarSesion(sesion)
    setUsuario(sesion.usuario)
    return sesion.usuario
  }, [])

  const salir = useCallback(() => {
    borrarSesion()
    setUsuario(null)
    window.location.assign('/')
  }, [])

  return (
    <Ctx value={{ usuario, entrar, salir, cargando }}>
      {props.children}
    </Ctx>
  )
}

export function useSesion(): ContextoSesion {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSesion debe usarse dentro de SesionProvider')
  return ctx
}
