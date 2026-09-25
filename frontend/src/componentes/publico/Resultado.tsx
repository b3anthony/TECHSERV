import type { ReactNode } from 'react'
import { Aviso } from './Aviso.tsx'
import type { Mensaje } from './useEnvio.ts'

/** El resultado de enviar un formulario de ajustes, anunciado al lector de pantalla. */
export function Resultado({ mensaje }: { mensaje: Mensaje }): ReactNode {
  return <div aria-live="polite">{mensaje && <Aviso tipo={mensaje.tipo} className="mb-4">{mensaje.texto}</Aviso>}</div>
}
