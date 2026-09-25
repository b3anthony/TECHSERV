import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { RespuestaSesion, UsuarioActual } from '../tipos.ts'
import { api, borrarSesion, guardarSesion, leerToken } from '../api/cliente.ts'

interface ContextoSesion {
  usuario: UsuarioActual | null
  entrar: (email: string, clave: string) => Promise<RespuestaSesion>
  salir: () => void
  /** Borra la sesión sin salir de la página: para cuando el servidor ya la cerró y quien llama decide adónde ir. */
  olvidarSesion: () => void
  /** Vuelve a pedir el usuario al servidor, p. ej. tras cambiar el nombre en Ajustes. */
  refrescar: () => Promise<void>
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

  const entrar = useCallback(async (email: string, clave: string): Promise<RespuestaSesion> => {
    const r = await api.post('/auth/login', { email, clave })
    const sesion = r.data as RespuestaSesion
    guardarSesion(sesion)
    setUsuario(sesion.usuario)
    return sesion
  }, [])

  const refrescar = useCallback(async (): Promise<void> => {
    const r = await api.get('/auth/yo')
    const u = r.data as UsuarioActual
    setUsuario(u)
    const raw = localStorage.getItem('techserv.sesion')
    if (raw) {
      try {
        const sesion: RespuestaSesion = JSON.parse(raw)
        guardarSesion({ ...sesion, usuario: u })
      } catch {
        // Sesión guardada ilegible: se queda como está y la próxima carga la resuelve.
      }
    }
  }, [])

  const olvidarSesion = useCallback(() => {
    borrarSesion()
    setUsuario(null)
  }, [])

  const salir = useCallback(() => {
    borrarSesion()
    setUsuario(null)
    window.location.assign('/')
  }, [])

  return (
    <Ctx value={{ usuario, entrar, salir, olvidarSesion, refrescar, cargando }}>
      {props.children}
    </Ctx>
  )
}

export function useSesion(): ContextoSesion {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSesion debe usarse dentro de SesionProvider')
  return ctx
}
