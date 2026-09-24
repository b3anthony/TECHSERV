import { useRef, useState } from 'react'
import type { JSX } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { AreaTexto } from '../../componentes/publico/AreaTexto.tsx'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { CampoTexto } from '../../componentes/publico/CampoTexto.tsx'
import { DialogoPanel, EsqueletoLista } from './comun.tsx'
import { botonIcono, soles } from './formato.ts'
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

  const campoFila = `mt-1 block min-h-11 w-full rounded-lg border border-publico-linea-fuerte bg-publico-superficie px-3 text-base text-publico-tinta ${focoClaro}`

  return (
    <DialogoPanel
      ref={dialogRef}
      abierto={abierto}
      alCerrar={manejarCierreDialogo}
      ocupado={cerrando}
      ancho="xl"
      titulo="Cerrar la orden"
      detalle={<><span className="font-bold text-publico-tinta">{codigoOrden}</span> · anota qué se hizo y cuánto se cobra.</>}
      pie={
        <>
          <Boton type="button" variante="secundario" disabled={cerrando} onClick={() => dialogRef.current?.close()}>Cancelar</Boton>
          <Boton type="button" cargando={cerrando} disabled={cerrando} onClick={manejarCerrar}>Cerrar por {soles(Number(totalCalculado))}</Boton>
        </>
      }
    >
      {errorMostrar && <Aviso tipo="error" className="mb-4">{errorMostrar}</Aviso>}

      <AreaTexto
        id={`cierre-diagnostico-${ordenId}`}
        etiqueta="¿Qué encontró y qué hizo el técnico?"
        value={diagnostico}
        onChange={(e) => setDiagnostico(e.target.value)}
        placeholder="Ejemplo: faja de la lavadora gastada; se cambió y se probó el centrifugado."
        rows={3}
        required
        error={errores.diagnostico}
      />

      <CampoTexto
        id={`cierre-mano-obra-${ordenId}`}
        etiqueta="Mano de obra (S/)"
        tipo="number"
        step="0.50"
        min="0"
        inputMode="decimal"
        value={precioManoObra}
        onChange={(e) => setPrecioManoObra(e.target.value)}
        placeholder="0.00"
        required
        error={errores.precioManoObra}
        className="sm:max-w-56"
      />

      <section aria-labelledby={`cierre-repuestos-${ordenId}`} className="border-t border-publico-linea pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id={`cierre-repuestos-${ordenId}`} className="text-sm font-bold">Repuestos usados</h3>
            <p className="text-sm text-publico-tinta-media">Del catálogo de tu taller. Si no usó ninguno, déjalo vacío.</p>
          </div>
          <Boton type="button" variante="secundario" onClick={agregarFila} disabled={cerrando || cargandoRepuestos || catalogoRepuestos.length === 0} className="px-3">
            <Icono nombre="mas" className="size-4" /> Añadir repuesto
          </Boton>
        </div>

        {cargandoRepuestos ? (
          <div className="mt-3"><EsqueletoLista filas={1} alto="h-14" etiqueta="Cargando repuestos…" /></div>
        ) : catalogoRepuestos.length === 0 ? (
          <p className="mt-3 rounded-lg bg-publico-superficie-suave p-3 text-sm text-publico-tinta-media">
            Tu catálogo no tiene repuestos. Puedes cerrar la orden solo con la mano de obra.
          </p>
        ) : repuestosFilas.length > 0 && (
          <ul className="mt-3 grid gap-2">
            {repuestosFilas.map((fila, index) => {
              const repSeleccionado = catalogoRepuestos.find((r) => r.id === fila.repuestoId)
              const errorFila = errores[`repuesto_${fila.idTemp}`]
              const subtotalFila = repSeleccionado ? Number(repSeleccionado.precio) * fila.cantidad : 0

              return (
                <li key={fila.idTemp} className="rounded-xl border border-publico-linea bg-publico-lienzo p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_6rem_auto]">
                    <div className="col-span-3 sm:col-span-1">
                      <label htmlFor={`repuesto-select-${fila.idTemp}`} className="text-xs font-bold">Repuesto {index + 1}</label>
                      <select
                        id={`repuesto-select-${fila.idTemp}`}
                        value={fila.repuestoId ?? ''}
                        aria-invalid={errorFila ? true : undefined}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null
                          actualizarFila(fila.idTemp, val, fila.cantidad)
                        }}
                        className={campoFila}
                      >
                        <option value="">Elige un repuesto</option>
                        {catalogoRepuestos.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nombre} · {soles(r.precio)} · quedan {r.stock}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`repuesto-cant-${fila.idTemp}`} className="text-xs font-bold">Cantidad</label>
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
                        className={campoFila}
                      />
                    </div>
                    <p className="pb-2.5 text-right text-sm font-bold tabular-nums">{soles(subtotalFila)}</p>
                    <button type="button" onClick={() => eliminarFila(fila.idTemp)} aria-label={`Quitar el repuesto ${index + 1}`} className={`${botonIcono} hover:text-publico-peligro`}>
                      <Icono nombre="cerrar" className="size-5" />
                    </button>
                  </div>
                  {errorFila && <p role="alert" className="mt-1.5 text-xs font-bold text-publico-peligro">{errorFila}</p>}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-publico-panel px-4 py-3 text-publico-superficie">
        <div>
          <p className="text-sm font-bold">Total a cobrar</p>
          <p className="text-xs text-publico-superficie/70">El sistema lo vuelve a calcular al guardar.</p>
        </div>
        <p className="text-2xl font-bold text-publico-acento tabular-nums">{soles(Number(totalCalculado))}</p>
      </div>
    </DialogoPanel>
  )
}
