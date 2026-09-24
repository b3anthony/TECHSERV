import { useRef, useState } from 'react'
import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import type { Especialidad } from '../../tipos.ts'
import { DialogoPanel, EsqueletoLista } from './comun.tsx'
import { ESPECIALIDAD_CORTA, iniciales } from './formato.ts'
import { useTecnicos } from './datos.ts'
import type { TecnicoDisponible } from './tiposPanel.ts'

interface DialogoAsignacionProps {
  ordenId: number
  codigoOrden: string
  especialidadOrden: Especialidad
  etiquetaEspecialidad: string
  /** Lo que se ve del caso en la cabecera, para no asignar a ciegas. */
  resumen?: string
  abierto: boolean
  alCerrar: () => void
  alAsignarExitoso: () => void
}

function cargaTexto(n: number): string {
  if (n === 0) return 'Libre hoy'
  return `${n} ${n === 1 ? 'visita' : 'visitas'} hoy`
}

export function DialogoAsignacion({
  ordenId,
  codigoOrden,
  especialidadOrden,
  etiquetaEspecialidad,
  resumen,
  abierto,
  alCerrar,
  alAsignarExitoso,
}: DialogoAsignacionProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [tecnicoSeleccionadoId, setTecnicoSeleccionadoId] = useState<number | null>(null)
  const [asignando, setAsignando] = useState(false)
  const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null)

  const { data: tecnicos = [], isLoading: cargandoTecnicos, error: errorQuery } = useTecnicos()

  const puede = (t: TecnicoDisponible) => t.disponible && t.especialidades.includes(especialidadOrden)
  // Primero quienes pueden ir, y de ellos el que tiene menos visitas hoy.
  const ordenados = [...tecnicos].sort((a, b) => Number(puede(b)) - Number(puede(a)) || a.ordenesHoy - b.ordenesHoy)
  const recomendadoId = ordenados.find(puede)?.id ?? null
  const idSeleccionadoFinal = tecnicoSeleccionadoId ?? recomendadoId

  const errorMostrar = errorAsignacion || (errorQuery ? mensajeDeError(errorQuery) : null)

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

  const elegido = tecnicos.find((t) => t.id === idSeleccionadoFinal)

  return (
    <DialogoPanel
      ref={dialogRef}
      abierto={abierto}
      alCerrar={manejarCerrar}
      ocupado={asignando}
      titulo="Asignar técnico"
      detalle={
        <>
          <span className="font-bold text-publico-tinta">{codigoOrden}</span> · necesita {etiquetaEspecialidad.toLowerCase()}
          {resumen && <span className="mt-1 block line-clamp-2 first-letter:uppercase">«{resumen}»</span>}
        </>
      }
      pie={
        <>
          <Boton type="button" variante="secundario" disabled={asignando} onClick={() => dialogRef.current?.close()}>
            Cancelar
          </Boton>
          <Boton type="button" cargando={asignando} disabled={!idSeleccionadoFinal || asignando || cargandoTecnicos} onClick={manejarAsignar}>
            {elegido ? `Asignar a ${elegido.nombres || elegido.nombreCompleto.split(' ')[0]}` : 'Asignar'}
          </Boton>
        </>
      }
    >
      {errorMostrar && <Aviso tipo="error" className="mb-4">{errorMostrar}</Aviso>}

      {cargandoTecnicos ? (
        <EsqueletoLista filas={3} alto="h-16" etiqueta="Cargando técnicos…" />
      ) : tecnicos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-publico-linea-fuerte px-4 py-6 text-center text-sm text-publico-tinta-media">
          Todavía no tienes técnicos.{' '}
          <Link to="/panel/equipo" className={`font-bold text-publico-tinta underline decoration-publico-acento decoration-2 underline-offset-4 ${focoClaro}`}>Añade el primero</Link>
        </div>
      ) : (
        <fieldset>
          <legend className="mb-3 text-sm text-publico-tinta-media">Elige quién irá. Te sugerimos al que tiene menos visitas hoy.</legend>
          <div className="grid gap-2">
            {ordenados.map((tec) => {
              const atiende = tec.especialidades.includes(especialidadOrden)
              const seleccionable = puede(tec)
              const esSeleccionado = idSeleccionadoFinal === tec.id
              const motivo = !atiende ? `No atiende ${ESPECIALIDAD_CORTA[especialidadOrden].toLowerCase()}` : !tec.disponible ? 'Marcado como no disponible' : null

              return (
                <label
                  key={tec.id}
                  className={`relative flex items-center gap-3 rounded-xl border-2 p-3 has-[:focus]:ring-2 has-[:focus]:ring-publico-acento has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-publico-superficie motion-safe:transition-colors ${
                    !seleccionable
                      ? 'cursor-not-allowed border-publico-linea bg-publico-superficie-suave text-publico-tinta-suave'
                      : esSeleccionado
                        ? 'cursor-pointer border-publico-acento-hondo bg-publico-acento-tenue'
                        : 'cursor-pointer border-publico-linea bg-publico-superficie hover:border-publico-linea-fuerte'
                  }`}
                >
                  <input
                    type="radio"
                    name="tecnico_elegido"
                    value={tec.id}
                    checked={esSeleccionado}
                    disabled={!seleccionable || asignando}
                    onChange={() => setTecnicoSeleccionadoId(tec.id)}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${seleccionable ? 'bg-publico-panel text-publico-acento' : 'bg-publico-linea text-publico-tinta-suave'}`}>
                    {iniciales(tec.nombreCompleto)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className={`font-bold ${seleccionable ? 'text-publico-tinta' : ''}`}>{tec.nombreCompleto}</span>
                      {tec.id === recomendadoId && (
                        <span className="rounded-md bg-publico-panel px-1.5 py-0.5 text-xs font-bold text-publico-acento">Recomendado</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm">
                      {motivo ? (
                        <span className="font-bold text-publico-peligro">{motivo}</span>
                      ) : (
                        <span className="text-publico-tinta-media">{cargaTexto(tec.ordenesHoy)} · {tec.especialidades.map((e) => ESPECIALIDAD_CORTA[e]).join(', ')}</span>
                      )}
                    </span>
                  </span>
                  <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-2xl border-2 ${esSeleccionado ? 'border-publico-tinta bg-publico-tinta text-publico-acento' : 'border-publico-linea-fuerte bg-publico-superficie'}`}>
                    {esSeleccionado && <Icono nombre="visto" className="size-3.5" />}
                  </span>
                </label>
              )
            })}
          </div>
          <p className="mt-4 flex items-start gap-2 text-sm text-publico-tinta-media">
            <Icono nombre="correo" className="mt-0.5 size-4 shrink-0" />
            Le llegará un correo con la dirección y la falla, y botones para confirmar y avisar cuando salga.
          </p>
        </fieldset>
      )}
    </DialogoPanel>
  )
}
