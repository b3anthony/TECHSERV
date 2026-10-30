import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { api, mensajeDeError } from '../../api/cliente.ts'
import type { ErrorApi, OrdenDetalle } from '../../tipos.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { focoAmarillo, focoClaro } from '../../componentes/marco/foco.ts'
import { AreaTexto } from '../../componentes/publico/AreaTexto.tsx'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { hoyString } from './fechas.ts'
import { datosFotos, prepararFotos } from './fotos.ts'
import type { AgendaDia, FotoCargada } from './tiposPortal.ts'
import { PasoDiaHora } from './reserva/PasoDiaHora.tsx'

interface DialogoSolicitudGarantiaProps {
  ordenId: number
  mypeId: number
  codigo: string
  alCerrar: () => void
  alCreada: (orden: OrdenDetalle) => void
}

export function DialogoSolicitudGarantia({ ordenId, mypeId, codigo, alCerrar, alCreada }: DialogoSolicitudGarantiaProps): ReactNode {
  const dialogo = useRef<HTMLDialogElement>(null)
  const id = useId()
  const navigate = useNavigate()
  const [descripcionFalla, setDescripcionFalla] = useState('')
  const [fecha, setFecha] = useState(hoyString)
  const [inicioTira, setInicioTira] = useState(hoyString)
  const [hora, setHora] = useState('')
  const [fotos, setFotos] = useState<FotoCargada[]>([])
  const fotosActuales = useRef<FotoCargada[]>([])
  const [errorFotos, setErrorFotos] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)
  const [creada, setCreada] = useState<OrdenDetalle | null>(null)

  useEffect(() => {
    const el = dialogo.current
    el?.showModal()
    return () => {
      el?.close()
      fotosActuales.current.forEach((foto) => URL.revokeObjectURL(foto.urlVistaPrevia))
    }
  }, [])

  const agenda = useQuery<AgendaDia>({
    queryKey: ['agenda-garantia', mypeId, fecha],
    queryFn: async () => (await api.get<AgendaDia>(`/catalogo/mypes/${mypeId}/agenda`, { params: { fecha } })).data,
    enabled: Boolean(fecha) && !creada,
  })
  const horaDisponible = Boolean(agenda.data?.fecha === fecha && agenda.data.franjas.some((franja) => franja.disponible && franja.hora.substring(0, 5) === hora))

  function elegirFecha(valor: string): void {
    const finTira = new Date(`${inicioTira}T12:00:00`)
    finTira.setDate(finTira.getDate() + 6)
    if (valor && (valor < inicioTira || new Date(`${valor}T12:00:00`) > finTira)) setInicioTira(valor)
    setFecha(valor)
    setHora('')
    setErrores((actual) => ({ ...actual, fecha: '', hora: '' }))
  }

  function agregarFotos(archivos: FileList): void {
    const { nuevas, error: problema } = prepararFotos(archivos, fotosActuales.current.length)
    setErrorFotos(problema)
    fotosActuales.current = [...fotosActuales.current, ...nuevas]
    setFotos(fotosActuales.current)
  }

  function quitarFoto(foto: FotoCargada): void {
    URL.revokeObjectURL(foto.urlVistaPrevia)
    fotosActuales.current = fotosActuales.current.filter((actual) => actual.id !== foto.id)
    setFotos(fotosActuales.current)
    setErrorFotos(null)
  }

  async function adjuntarYSeguir(orden: OrdenDetalle): Promise<void> {
    if (fotos.length > 0) {
      try {
        await api.post(`/mis-ordenes/${orden.id}/fotos`, datosFotos(fotos))
      } catch (err) {
        setErrorFotos(`La atención ${orden.codigo} ya se registró. No pudimos adjuntar las fotos: ${mensajeDeError(err)}`)
        return
      }
    }
    navigate(`/mis-ordenes/${orden.id}`)
  }

  async function enviar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    if (enCurso.current || creada) return
    const locales: Record<string, string> = {}
    if (descripcionFalla.trim().length < 10 || descripcionFalla.trim().length > 2000) locales.descripcionFalla = 'Describe la falla con entre 10 y 2000 caracteres.'
    if (!fecha || fecha < hoyString()) locales.fecha = 'Elige un día desde hoy.'
    if (!horaDisponible || agenda.isFetching) locales.hora = 'Elige una franja disponible.'
    setErrores(locales)
    setError(null)
    if (Object.keys(locales).length > 0) {
      const control = locales.descripcionFalla ? document.getElementById(`${id}-falla`) : document.getElementById(locales.fecha ? 'dia-primero' : 'grupo-horas')
      control?.focus()
      return
    }
    enCurso.current = true
    setEnviando(true)
    try {
      const respuesta = await api.post<OrdenDetalle>(`/mis-ordenes/${ordenId}/garantia`, { descripcionFalla: descripcionFalla.trim(), fecha, hora })
      setCreada(respuesta.data)
      alCreada(respuesta.data)
      await adjuntarYSeguir(respuesta.data)
    } catch (err) {
      setError(mensajeDeError(err))
      if (axios.isAxiosError<ErrorApi>(err) && err.response?.data.campos) setErrores(err.response.data.campos)
      void agenda.refetch()
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  async function reintentarFotos(): Promise<void> {
    if (!creada || enCurso.current) return
    enCurso.current = true
    setEnviando(true)
    setErrorFotos(null)
    try {
      await adjuntarYSeguir(creada)
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <dialog ref={dialogo} aria-labelledby={`${id}-titulo`} onCancel={(ev) => { ev.preventDefault(); if (!enCurso.current) alCerrar() }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-publico-linea bg-publico-lienzo p-4 font-publico text-publico-tinta shadow-2xl backdrop:bg-publico-panel/60 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><h2 id={`${id}-titulo`} className="text-xl font-bold">{creada ? 'Atención por garantía registrada' : 'Solicitar atención por garantía'}</h2><p className="mt-1 text-sm text-publico-tinta-media">Reparación {codigo} · sin cobro de visita ni mano de obra.</p></div>
        <button type="button" onClick={alCerrar} disabled={enviando} aria-label="Cerrar solicitud de garantía" className={`grid size-11 shrink-0 place-items-center rounded-lg border border-publico-linea-fuerte bg-publico-superficie disabled:opacity-60 ${focoClaro}`}><Icono nombre="cerrar" className="size-5" /></button>
      </div>
      {creada ? (
        <div className="grid gap-4" aria-live="polite">
          <Aviso tipo="exito">Tu atención {creada.codigo} quedó reservada.</Aviso>
          {errorFotos && <Aviso tipo="error">{errorFotos}</Aviso>}
          {enviando ? <p role="status" className="text-sm text-publico-tinta-media">Adjuntando tus fotos…</p> : <><Boton type="button" variante="secundario" onClick={() => void reintentarFotos()}>Reintentar subir las fotos</Boton><Link to={`/mis-ordenes/${creada.id}`} className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-publico-acento bg-publico-acento px-4 text-sm font-bold ${focoAmarillo}`}>Ver seguimiento de {creada.codigo}</Link></>}
        </div>
      ) : (
        <form onSubmit={(ev) => void enviar(ev)} noValidate className="grid gap-5">
          {error && <Aviso tipo="error">{error}</Aviso>}
          <fieldset disabled={enviando} className="grid min-w-0 gap-4">
            <legend className="sr-only">Datos de la atención por garantía</legend>
            <AreaTexto id={`${id}-falla`} etiqueta="¿Qué está fallando?" ayuda="Entre 10 y 2000 caracteres." required max={2000} rows={3} value={descripcionFalla} onChange={(ev) => { setDescripcionFalla(ev.target.value); setErrores((actual) => ({ ...actual, descripcionFalla: '' })) }} error={errores.descripcionFalla} />
            <PasoDiaHora numero={2} reserva={{ fecha, inicioTira, elegirFecha, agenda: agenda.data ?? null, cargandoAgenda: agenda.isFetching, errorAgenda: agenda.error ? mensajeDeError(agenda.error) : null, horaSeleccionada: hora, setHoraSeleccionada: setHora, errores, pasosCompletos: [false, false, horaDisponible] }} />
            <div>
              <label htmlFor={`${id}-fotos`} className="text-sm font-bold">Fotos de la falla (opcional)</label>
              <input id={`${id}-fotos`} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-describedby={`${id}-fotos-ayuda ${id}-fotos-error`} onChange={(ev) => { if (ev.target.files) agregarFotos(ev.target.files); ev.target.value = '' }} className={`mt-2 min-h-12 w-full min-w-0 rounded-lg border border-publico-linea-fuerte bg-publico-superficie px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-publico-superficie-suave file:px-3 file:py-1 file:text-publico-tinta ${focoClaro}`} />
              <p id={`${id}-fotos-ayuda`} className="mt-1 text-xs text-publico-tinta-suave">Hasta 5 fotos JPG, PNG o WEBP. Máximo 5 MB cada una.</p>
              <p id={`${id}-fotos-error`} role="alert" className="mt-1 text-xs font-bold text-publico-peligro">{errorFotos}</p>
              {fotos.length > 0 && <ul className="mt-3 grid grid-cols-3 gap-2">{fotos.map((foto) => <li key={foto.id} className="min-w-0"><img src={foto.urlVistaPrevia} alt={`Vista previa de ${foto.nombre}`} className="aspect-square w-full rounded-lg object-cover" /><p className="mt-1 truncate text-xs text-publico-tinta-media" title={foto.nombre}>{foto.nombre}</p><button type="button" onClick={() => quitarFoto(foto)} aria-label={`Quitar foto ${foto.nombre}`} className={`mt-1 min-h-11 w-full rounded-lg border border-publico-linea-fuerte text-xs font-bold ${focoClaro}`}>Quitar</button></li>)}</ul>}
            </div>
          </fieldset>
          <div className="grid gap-2 sm:flex sm:justify-end">
            <Boton type="button" variante="secundario" disabled={enviando} onClick={alCerrar}>Cancelar</Boton>
            <Boton type="submit" cargando={enviando}>Solicitar atención por garantía</Boton>
          </div>
        </form>
      )}
    </dialog>
  )
}
