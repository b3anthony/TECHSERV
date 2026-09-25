import { useRef, useState } from 'react'
import type { JSX } from 'react'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { DialogoPanel } from './comun.tsx'
import { METODOS_PAGO, soles } from './formato.ts'
import { useAjustes } from './datos.ts'
import type { MetodoPago } from './tiposPanel.ts'

interface DialogoPagoProps {
  ordenId: number
  codigoOrden: string
  total: number
  /** El que eligió el cliente al reservar: sale marcado, y vale aunque el taller haya dejado de aceptarlo. */
  elegidoPorCliente?: MetodoPago | null
  abierto: boolean
  alCerrar: () => void
  alPagoExitoso: () => void
}

export function DialogoPago({
  ordenId,
  codigoOrden,
  total,
  elegidoPorCliente,
  abierto,
  alCerrar,
  alPagoExitoso,
}: DialogoPagoProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const ajustes = useAjustes()
  // Solo los métodos que el taller acepta (Ajustes); mientras cargan, ninguno.
  const aceptados = ajustes.data?.metodosPago ?? []
  const metodos = METODOS_PAGO.filter((m) => aceptados.includes(m.valor) || m.valor === elegidoPorCliente)
  const [elegido, setElegido] = useState<MetodoPago | null>(null)
  const metodo = elegido ?? elegidoPorCliente ?? metodos[0]?.valor ?? null
  const [registrando, setRegistrando] = useState(false)
  const [errorPago, setErrorPago] = useState<string | null>(null)

  function manejarCerrar(): void {
    setErrorPago(null)
    setElegido(null)
    alCerrar()
  }

  async function manejarRegistrarPago(): Promise<void> {
    if (!metodo) return
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
          <Boton type="button" cargando={registrando} disabled={registrando || !metodo} onClick={manejarRegistrarPago}>Registrar {soles(total)}</Boton>
        </>
      }
    >
      {errorPago && <Aviso tipo="error" className="mb-4">{errorPago}</Aviso>}
      {ajustes.error && <Aviso tipo="error" className="mb-4">No pudimos cargar los métodos de pago que aceptas. Cierra y vuelve a intentarlo.</Aviso>}

      <div className="rounded-xl bg-publico-panel px-4 py-5 text-center text-publico-superficie">
        <p className="text-sm text-publico-superficie/70">Monto a cobrar</p>
        <p className="mt-1 text-3xl font-bold text-publico-acento tabular-nums">{soles(total)}</p>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-bold">Método de pago</legend>
        {elegidoPorCliente && (
          <p className="-mt-1 mb-2 text-xs text-publico-tinta-media">Al reservar, el cliente eligió {METODOS_PAGO.find((m) => m.valor === elegidoPorCliente)?.texto.toLowerCase()}. Si te pagó de otra forma, márcala.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {metodos.map((m) => (
            <label key={m.valor} className={`flex min-h-13 cursor-pointer items-center justify-center rounded-xl border-2 px-3 text-sm font-bold has-[:focus]:ring-2 has-[:focus]:ring-publico-acento has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-publico-superficie ${metodo === m.valor ? 'border-publico-tinta bg-publico-panel text-publico-superficie' : 'border-publico-linea hover:border-publico-linea-fuerte'}`}>
              <input type="radio" name={`metodo-pago-${ordenId}`} value={m.valor} checked={metodo === m.valor} onChange={() => setElegido(m.valor)} className="sr-only" />
              {m.texto}
            </label>
          ))}
        </div>
      </fieldset>
    </DialogoPanel>
  )
}
