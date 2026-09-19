import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Boton } from '../../componentes/Boton.tsx'
import { Cargando } from '../../componentes/Cargando.tsx'
import type { Especialidad } from '../../tipos.ts'
import type { TecnicoDisponible } from './tiposPanel.ts'

const MAPA_ESPECIALIDADES: Record<Especialidad, string> = {
  SERVICIOS_HOGAR: 'Servicios del Hogar',
  SOPORTE_INFORMATICO: 'Soporte Informático',
  REPARACION_ELECTRODOMESTICOS: 'Reparación de Electrodomésticos',
}

interface DialogoAsignacionProps {
  ordenId: number
  codigoOrden: string
  especialidadOrden: Especialidad
  etiquetaEspecialidad: string
  abierto: boolean
  alCerrar: () => void
  alAsignarExitoso: () => void
}

export function DialogoAsignacion({
  ordenId,
  codigoOrden,
  especialidadOrden,
  etiquetaEspecialidad,
  abierto,
  alCerrar,
  alAsignarExitoso,
}: DialogoAsignacionProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [tecnicoSeleccionadoId, setTecnicoSeleccionadoId] = useState<number | null>(null)
  const [asignando, setAsignando] = useState(false)
  const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null)

  const {
    data: tecnicos = [],
    isLoading: cargandoTecnicos,
    error: errorQuery,
  } = useQuery<TecnicoDisponible[]>({
    queryKey: ['panel', 'tecnicos'],
    queryFn: async () => {
      const res = await api.get('/panel/tecnicos')
      return (res.data as TecnicoDisponible[]) || []
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

  const errorMostrar = errorAsignacion || (errorQuery ? mensajeDeError(errorQuery) : null)

  // Preseleccionar el primer técnico válido si no hay ninguno seleccionado manualmente
  const primerTecnicoValidoId =
    tecnicos.find((t) => t.disponible && t.especialidades.includes(especialidadOrden))?.id ?? null
  const idSeleccionadoFinal = tecnicoSeleccionadoId ?? primerTecnicoValidoId

  async function manejarAsignar(): Promise<void> {
    if (!idSeleccionadoFinal) return
    setErrorAsignacion(null)
    setAsignando(true)

    try {
      await api.post(`/panel/ordenes/${ordenId}/asignar`, {
        tecnicoId: idSeleccionadoFinal,
      })
      dialogRef.current?.close()
      setTecnicoSeleccionadoId(null)
      alAsignarExitoso()
    } catch (err) {
      setErrorAsignacion(mensajeDeError(err))
    } finally {
      setAsignando(false)
    }
  }

  function manejarCerrar(): void {
    setErrorAsignacion(null)
    setTecnicoSeleccionadoId(null)
    alCerrar()
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={manejarCerrar}
      className="m-auto w-full max-w-lg rounded-2xl border border-linea bg-superficie p-6 shadow-xl backdrop:bg-tinta/50 text-tinta"
    >
      <div className="flex items-start justify-between border-b border-linea pb-4">
        <div>
          <h2 className="text-lg font-bold text-tinta">Asignar técnico</h2>
          <p className="mt-1 text-xs text-tinta-suave">
            Orden <span className="font-semibold text-tinta">{codigoOrden}</span> — Requiere:{' '}
            <span className="font-semibold text-tinta">{etiquetaEspecialidad}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          disabled={asignando}
          aria-label="Cerrar ventana de asignación"
          className="rounded-lg p-1.5 text-tinta-suave hover:bg-superficie-suave hover:text-tinta focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="py-4">
        {errorMostrar && (
          <div role="alert" className="mb-4 rounded-lg border border-peligro bg-superficie p-3 text-xs text-peligro">
            {errorMostrar}
          </div>
        )}

        {cargandoTecnicos ? (
          <Cargando />
        ) : (
          <fieldset className="space-y-3">
            <legend className="sr-only">Técnicos del taller</legend>
            {tecnicos.length === 0 ? (
              <p className="text-sm text-tinta-suave">No hay técnicos registrados.</p>
            ) : (
              tecnicos.map((tec) => {
                const atiende = tec.especialidades.includes(especialidadOrden)
                const disponible = tec.disponible
                const seleccionable = atiende && disponible
                const esSeleccionado = idSeleccionadoFinal === tec.id

                return (
                  <label
                    key={tec.id}
                    htmlFor={`tecnico-${tec.id}`}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors motion-reduce:transition-none ${
                      !seleccionable
                        ? 'cursor-not-allowed border-linea bg-superficie-suave opacity-60'
                        : esSeleccionado
                          ? 'border-accion bg-accion-tenue'
                          : 'border-linea bg-superficie hover:border-linea-fuerte'
                    }`}
                  >
                    <input
                      type="radio"
                      id={`tecnico-${tec.id}`}
                      name="tecnico_elegido"
                      value={tec.id}
                      checked={esSeleccionado}
                      disabled={!seleccionable || asignando}
                      onChange={() => setTecnicoSeleccionadoId(tec.id)}
                      className="mt-1 h-4 w-4 text-accion focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
                    />
                    <div className="flex-1 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-semibold text-tinta">{tec.nombreCompleto}</span>
                        {disponible ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-completada">
                            <span className="h-1.5 w-1.5 rounded-full bg-completada" aria-hidden="true" />
                            Disponible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-peligro">
                            <span className="h-1.5 w-1.5 rounded-full bg-peligro" aria-hidden="true" />
                            No disponible
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-xs text-tinta-media">
                        {tec.especialidades.map((esp) => MAPA_ESPECIALIDADES[esp] || esp).join(', ')}
                      </p>

                      <p className="mt-1 text-xs text-tinta-suave">
                        {tec.ordenesHoy} {tec.ordenesHoy === 1 ? 'orden hoy' : 'órdenes hoy'}
                      </p>

                      {!atiende && (
                        <p className="mt-1 text-xs font-semibold text-peligro">
                          No atiende esta especialidad
                        </p>
                      )}
                    </div>
                  </label>
                )
              })
            )}
          </fieldset>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-linea pt-4">
        <Boton
          type="button"
          variante="secundario"
          disabled={asignando}
          onClick={() => dialogRef.current?.close()}
        >
          Cancelar
        </Boton>
        <Boton
          type="button"
          variante="principal"
          cargando={asignando}
          disabled={!idSeleccionadoFinal || asignando || cargandoTecnicos}
          onClick={manejarAsignar}
        >
          Asignar y enviar correo al técnico
        </Boton>
      </div>
    </dialog>
  )
}
