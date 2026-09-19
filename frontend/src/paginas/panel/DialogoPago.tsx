import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Boton } from '../../componentes/Boton.tsx'
import { Selector } from '../../componentes/Selector.tsx'
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

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return

    if (abierto) {
      if (!el.open) {
        el.showModal()
      }
    } else {
      if (el.open) {
        el.close()
      }
    }
  }, [abierto])

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

  return (
    <dialog
      ref={dialogRef}
      onClose={manejarCerrar}
      className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] rounded-2xl border border-linea bg-superficie p-5 sm:p-6 shadow-xl backdrop:bg-tinta/50 text-tinta flex flex-col my-auto"
    >
      <div className="shrink-0 flex items-start justify-between border-b border-linea pb-4">
        <div>
          <h2 className="text-lg font-bold text-tinta">Registrar pago</h2>
          <p className="mt-1 text-xs text-tinta-suave">
            Orden <span className="font-semibold text-tinta">{codigoOrden}</span> — Registrar cobro del servicio.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          disabled={registrando}
          aria-label="Cerrar ventana de cobro"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg p-2 text-tinta-suave hover:bg-superficie-suave hover:text-tinta focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 space-y-4 py-4">
        {errorPago && (
          <div role="alert" className="rounded-lg border border-peligro bg-superficie p-3 text-xs text-peligro">
            {errorPago}
          </div>
        )}

        <div className="rounded-xl border border-linea bg-superficie-suave p-4 text-center">
          <span className="block text-xs font-medium text-tinta-suave">Monto total a cobrar</span>
          <span className="mt-1 block text-2xl font-bold text-tinta">
            S/ {total.toFixed(2)}
          </span>
        </div>

        <Selector
          etiqueta="Método de pago"
          value={metodo}
          onChange={(e) => setMetodo(e.target.value as MetodoPago)}
        >
          <option value="EFECTIVO">Efectivo</option>
          <option value="YAPE">Yape</option>
          <option value="PLIN">Plin</option>
          <option value="TRANSFERENCIA">Transferencia bancaria</option>
        </Selector>
      </div>

      <div className="shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 border-t border-linea pt-4">
        <Boton
          type="button"
          variante="secundario"
          disabled={registrando}
          onClick={() => dialogRef.current?.close()}
          className="w-full sm:w-auto min-h-[44px]"
        >
          Cancelar
        </Boton>
        <Boton
          type="button"
          variante="principal"
          cargando={registrando}
          disabled={registrando}
          onClick={manejarRegistrarPago}
          className="w-full sm:w-auto min-h-[44px]"
        >
          Registrar cobro
        </Boton>
      </div>
    </dialog>
  )
}
