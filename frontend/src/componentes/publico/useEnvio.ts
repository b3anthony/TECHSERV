import { useState } from 'react'
import axios from 'axios'
import { mensajeDeError } from '../../api/cliente.ts'
import type { ErrorApi } from '../../tipos.ts'

export type Mensaje = { tipo: 'exito' | 'error'; texto: string } | null

/**
 * Enviar un formulario de ajustes: marca el envío, recoge los errores por campo
 * que devuelve el servidor y deja un mensaje de éxito o de error.
 */
export function useEnvio() {
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<Mensaje>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})

  async function enviar(accion: () => Promise<void>, exito: string): Promise<boolean> {
    setEnviando(true)
    setMensaje(null)
    setErrores({})
    try {
      await accion()
      setMensaje({ tipo: 'exito', texto: exito })
      return true
    } catch (err) {
      const campos = axios.isAxiosError(err) ? (err.response?.data as ErrorApi | undefined)?.campos : undefined
      if (campos) setErrores(campos)
      setMensaje({ tipo: 'error', texto: mensajeDeError(err) })
      return false
    } finally {
      setEnviando(false)
    }
  }

  return { enviando, mensaje, errores, enviar, setErrores, setMensaje }
}
