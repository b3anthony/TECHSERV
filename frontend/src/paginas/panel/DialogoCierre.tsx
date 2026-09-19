import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { AreaTexto } from '../../componentes/AreaTexto.tsx'
import { Boton } from '../../componentes/Boton.tsx'
import { Campo } from '../../componentes/Campo.tsx'
import { Cargando } from '../../componentes/Cargando.tsx'
import type { RepuestoCatalogo } from './tiposPanel.ts'

interface FilaRepuesto {
  idTemp: string
  repuestoId: number | null
  cantidad: number
}

interface DialogoCierreProps {
  ordenId: number
  codigoOrden: string
  abierto: boolean
  alCerrar: () => void
  alCierreExitoso: () => void
}

export function DialogoCierre({
  ordenId,
  codigoOrden,
  abierto,
  alCerrar,
  alCierreExitoso,
}: DialogoCierreProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [diagnostico, setDiagnostico] = useState('')
  const [precioManoObra, setPrecioManoObra] = useState('')
  const [repuestosFilas, setRepuestosFilas] = useState<FilaRepuesto[]>([])
  const [cerrando, setCerrando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})

  const {
    data: catalogoRepuestos = [],
    error: errorRepuestos,
    isLoading: cargandoRepuestos,
  } = useQuery<RepuestoCatalogo[]>({
    queryKey: ['panel', 'repuestos'],
    queryFn: async () => {
      const res = await api.get('/panel/repuestos')
      const lista = (res.data as RepuestoCatalogo[]) || []
      return lista.filter((r) => r.activo)
    },
    enabled: abierto,
  })

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

  function limpiarFormulario(): void {
    setDiagnostico('')
    setPrecioManoObra('')
    setRepuestosFilas([])
    setErrorGeneral(null)
    setErrores({})
  }

  function manejarCierreDialogo(): void {
    limpiarFormulario()
    alCerrar()
  }

  function agregarFila(): void {
    setRepuestosFilas((prev) => [
      ...prev,
      {
        idTemp: Math.random().toString(36).substring(2, 9),
        repuestoId: null,
        cantidad: 1,
      },
    ])
  }

  function eliminarFila(idTemp: string): void {
    setRepuestosFilas((prev) => prev.filter((f) => f.idTemp !== idTemp))
  }

  function actualizarFila(idTemp: string, repuestoId: number | null, cantidad: number): void {
    setRepuestosFilas((prev) =>
      prev.map((f) => (f.idTemp === idTemp ? { ...f, repuestoId, cantidad } : f)),
    )
  }

  const manoObraNum = parseFloat(precioManoObra) || 0
  const subtotalRepuestos = repuestosFilas.reduce((acc, f) => {
    if (!f.repuestoId) return acc
    const rep = catalogoRepuestos.find((r) => r.id === f.repuestoId)
    return acc + (rep ? Number(rep.precio) * f.cantidad : 0)
  }, 0)
  const totalCalculado = (manoObraNum + subtotalRepuestos).toFixed(2)

  const errorMostrar = errorGeneral || (errorRepuestos ? mensajeDeError(errorRepuestos) : null)

  async function manejarCerrar(): Promise<void> {
    const nuevosErrores: Record<string, string> = {}
    if (!diagnostico.trim()) {
      nuevosErrores.diagnostico = 'El diagnóstico es obligatorio'
    }
    if (precioManoObra.trim() === '' || isNaN(manoObraNum) || manoObraNum < 0) {
      nuevosErrores.precioManoObra = 'Ingresa un precio de mano de obra válido (mayor o igual a 0)'
    }

    for (let i = 0; i < repuestosFilas.length; i++) {
      const f = repuestosFilas[i]
      if (f.repuestoId === null) {
        nuevosErrores[`repuesto_${f.idTemp}`] = 'Selecciona un repuesto o elimina la fila'
      } else if (f.cantidad < 1) {
        nuevosErrores[`repuesto_${f.idTemp}`] = 'La cantidad debe ser al menos 1'
      }
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }

    setErrores({})
    setErrorGeneral(null)
    setCerrando(true)

    const payload = {
      diagnostico: diagnostico.trim(),
      precioManoObra: manoObraNum,
      repuestos: repuestosFilas
        .filter((f) => f.repuestoId !== null)
        .map((f) => ({
          repuestoId: f.repuestoId,
          cantidad: f.cantidad,
        })),
    }

    try {
      await api.post(`/panel/ordenes/${ordenId}/cerrar`, payload)
      dialogRef.current?.close()
      limpiarFormulario()
      alCierreExitoso()
    } catch (err) {
      setErrorGeneral(mensajeDeError(err))
    } finally {
      setCerrando(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={manejarCierreDialogo}
      className="m-auto w-[calc(100%-2rem)] max-w-xl max-h-[calc(100dvh-2rem)] rounded-2xl border border-linea bg-superficie p-5 sm:p-6 shadow-xl backdrop:bg-tinta/50 text-tinta flex flex-col my-auto"
    >
      <div className="shrink-0 flex items-start justify-between border-b border-linea pb-4">
        <div>
          <h2 className="text-lg font-bold text-tinta">Cerrar orden</h2>
          <p className="mt-1 text-xs text-tinta-suave">
            Orden <span className="font-semibold text-tinta">{codigoOrden}</span> — Registro de diagnóstico y liquidación de costos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          disabled={cerrando}
          aria-label="Cerrar ventana"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg p-2 text-tinta-suave hover:bg-superficie-suave hover:text-tinta focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 space-y-4 py-4">
        {errorMostrar && (
          <div role="alert" className="rounded-lg border border-peligro bg-superficie p-3 text-xs text-peligro">
            {errorMostrar}
          </div>
        )}

        <AreaTexto
          etiqueta="Diagnóstico técnico"
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
          placeholder="Describe el fallo encontrado, trabajo realizado y pruebas finales..."
          rows={3}
          required
          error={errores.diagnostico}
        />

        <Campo
          etiqueta="Precio de mano de obra (S/)"
          type="number"
          step="0.50"
          min="0"
          value={precioManoObra}
          onChange={(e) => setPrecioManoObra(e.target.value)}
          placeholder="0.00"
          required
          error={errores.precioManoObra}
        />

        {/* Repuestos */}
        <div className="border-t border-linea pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-tinta">Repuestos utilizados</h3>
              <p className="text-xs text-tinta-suave">
                Agrega los repuestos del taller empleados en la reparación.
              </p>
            </div>
            <Boton
              type="button"
              variante="secundario"
              onClick={agregarFila}
              disabled={cerrando || cargandoRepuestos || catalogoRepuestos.length === 0}
              className="text-xs py-2 px-3 min-h-[40px]"
            >
              + Añadir repuesto
            </Boton>
          </div>

          {cargandoRepuestos ? (
            <div className="mt-3">
              <Cargando />
            </div>
          ) : catalogoRepuestos.length === 0 ? (
            <div className="mt-3 rounded-lg border border-linea bg-superficie-suave p-3 text-xs text-tinta-suave">
              El taller no tiene repuestos activos en el catálogo. Puedes cerrar la orden registrando únicamente la mano de obra.
            </div>
          ) : repuestosFilas.length === 0 ? (
            <p className="mt-3 text-xs italic text-tinta-suave">
              No se han agregado repuestos para esta orden.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {repuestosFilas.map((fila, index) => {
                const repSeleccionado = catalogoRepuestos.find((r) => r.id === fila.repuestoId)
                const errorFila = errores[`repuesto_${fila.idTemp}`]
                const subtotalFila = repSeleccionado
                  ? (Number(repSeleccionado.precio) * fila.cantidad).toFixed(2)
                  : '0.00'

                return (
                  <div
                    key={fila.idTemp}
                    className="flex flex-col gap-2 rounded-xl border border-linea bg-superficie-suave p-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`repuesto-select-${fila.idTemp}`}
                          className="block text-xs font-medium text-tinta"
                        >
                          Repuesto {index + 1}
                        </label>
                        <select
                          id={`repuesto-select-${fila.idTemp}`}
                          value={fila.repuestoId ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null
                            actualizarFila(fila.idTemp, val, fila.cantidad)
                          }}
                          className="mt-1 block w-full rounded-lg border border-linea bg-superficie px-2.5 py-2 text-xs text-tinta focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie min-h-[40px]"
                        >
                          <option value="">Selecciona repuesto</option>
                          {catalogoRepuestos.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nombre} (S/ {Number(r.precio).toFixed(2)} · Stock: {r.stock})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end justify-between sm:justify-start gap-2">
                        <div className="w-20">
                          <label
                            htmlFor={`repuesto-cant-${fila.idTemp}`}
                            className="block text-xs font-medium text-tinta"
                          >
                            Cant.
                          </label>
                          <input
                            type="number"
                            id={`repuesto-cant-${fila.idTemp}`}
                            min="1"
                            max={repSeleccionado ? repSeleccionado.stock : 99}
                            value={fila.cantidad}
                            onChange={(e) => {
                              const cant = Math.max(1, parseInt(e.target.value, 10) || 1)
                              actualizarFila(fila.idTemp, fila.repuestoId, cant)
                            }}
                            className="mt-1 block w-full rounded-lg border border-linea bg-superficie px-2.5 py-2 text-xs text-tinta focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie min-h-[40px]"
                          />
                        </div>

                        <div className="flex-1 sm:w-24 text-right pr-1">
                          <span className="block text-micro text-tinta-suave">Subtotal</span>
                          <span className="text-xs font-bold text-tinta">S/ {subtotalFila}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => eliminarFila(fila.idTemp)}
                          aria-label={`Eliminar repuesto ${index + 1}`}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg p-2 text-peligro hover:bg-superficie focus:outline-none focus:ring-2 focus:ring-peligro focus:ring-offset-2 focus:ring-offset-superficie"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {errorFila && (
                      <p role="alert" className="text-micro text-peligro">
                        {errorFila}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Total calculado en vivo */}
        <div className="rounded-xl border border-linea bg-superficie-suave p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-tinta-suave">Total calculado en vivo:</span>
              <p className="text-micro text-tinta-suave">
                El total definitivo lo confirma el servidor al registrar el cierre.
              </p>
            </div>
            <span className="text-xl font-bold text-tinta">
              S/ {totalCalculado}
            </span>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 border-t border-linea pt-4">
        <Boton
          type="button"
          variante="secundario"
          disabled={cerrando}
          onClick={() => dialogRef.current?.close()}
          className="w-full sm:w-auto min-h-[44px]"
        >
          Cancelar
        </Boton>
        <Boton
          type="button"
          variante="principal"
          cargando={cerrando}
          disabled={cerrando}
          onClick={manejarCerrar}
          className="w-full sm:w-auto min-h-[44px]"
        >
          Confirmar cierre de orden
        </Boton>
      </div>
    </dialog>
  )
}
