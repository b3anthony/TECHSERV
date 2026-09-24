import { useRef, useState } from 'react'
import type { JSX } from 'react'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { DialogoPanel } from './comun.tsx'
import { soles } from './formato.ts'
import type { MetodoPago } from './tiposPanel.ts'

interface DialogoPagoProps {
  ordenId: number
  codigoOrden: string
  total: number
  abierto: boolean
  alCerrar: () => void
  alPagoExitoso: () => void
}

export function DialogoPago({
  ordenId,
  codigoOrden,
  total,
  abierto,
  alCerrar,
  alPagoExitoso,
}: DialogoPagoProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO')
  const [registrando, setRegistrando] = useState(false)
  const [errorPago, setErrorPago] = useState<string | null>(null)

  function manejarCerrar(): void {
    setErrorPago(null)
    setMetodo('EFECTIVO')
    alCerrar()
  }

  async function manejarRegistrarPago(): Promise<void> {
    setErrorPago(null)
    setRegistrando(true)

    try {
      await api.post(`/panel/ordenes/${ordenId}/pago`, { metodo })
      dialogRef.current?.close()
      alPagoExitoso()
    } catch (err) {
      setErrorPago(mensajeDeError(err))
    } finally {
      setRegistrando(false)
    }
  }

  const metodos: { valor: MetodoPago; texto: string }[] = [
    { valor: 'EFECTIVO', texto: 'Efectivo' },
    { valor: 'YAPE', texto: 'Yape' },
    { valor: 'PLIN', texto: 'Plin' },
    { valor: 'TRANSFERENCIA', texto: 'Transferencia' },
  ]

  return (
    <DialogoPanel
      ref={dialogRef}
      abierto={abierto}
      alCerrar={manejarCerrar}
      ocupado={registrando}
      ancho="md"
      titulo="Registrar pago"
      detalle={<><span className="font-bold text-publico-tinta">{codigoOrden}</span> · ¿cómo te pagó el cliente?</>}
      pie={
        <>
          <Boton type="button" variante="secundario" disabled={registrando} onClick={() => dialogRef.current?.close()}>Cancelar</Boton>
          <Boton type="button" cargando={registrando} disabled={registrando} onClick={manejarRegistrarPago}>Registrar {soles(total)}</Boton>
        </>
      }
    >
      {errorPago && <Aviso tipo="error" className="mb-4">{errorPago}</Aviso>}

      <div className="rounded-xl bg-publico-panel px-4 py-5 text-center text-publico-superficie">
        <p className="text-sm text-publico-superficie/70">Monto a cobrar</p>
        <p className="mt-1 text-3xl font-bold text-publico-acento tabular-nums">{soles(total)}</p>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-bold">Método de pago</legend>
        <div className="grid grid-cols-2 gap-2">
          {metodos.map((m) => (
            <label key={m.valor} className={`flex min-h-13 cursor-pointer items-center justify-center rounded-xl border-2 px-3 text-sm font-bold has-[:focus]:ring-2 has-[:focus]:ring-publico-acento has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-publico-superficie ${metodo === m.valor ? 'border-publico-tinta bg-publico-panel text-publico-superficie' : 'border-publico-linea hover:border-publico-linea-fuerte'}`}>
              <input type="radio" name={`metodo-pago-${ordenId}`} value={m.valor} checked={metodo === m.valor} onChange={() => setMetodo(m.valor)} className="sr-only" />
              {m.texto}
            </label>
          ))}
        </div>
      </fieldset>
    </DialogoPanel>
  )
}
