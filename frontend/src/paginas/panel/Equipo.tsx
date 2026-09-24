import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { CabeceraPagina, EsqueletoLista, ErrorCarga, Interruptor } from './comun.tsx'
import { ESPECIALIDAD_CORTA, ICONO_ESPECIALIDAD, contenedorPanel, iniciales } from './formato.ts'
import { useTecnicos } from './datos.ts'
import { DialogoTecnico } from './DialogoTecnico.tsx'
import type { TecnicoDisponible } from './tiposPanel.ts'

interface EstadoDialogo {
  abierto: boolean
  tecnico: TecnicoDisponible | null
  /** Cambia en cada apertura para que el formulario arranque limpio. */
  vez: number
}

export function Equipo(): ReactNode {
  const queryClient = useQueryClient()
  const tecnicos = useTecnicos()
  const [dialogo, setDialogo] = useState<EstadoDialogo>({ abierto: false, tecnico: null, vez: 0 })
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const [cambiando, setCambiando] = useState<number | null>(null)
  const [confirmarBaja, setConfirmarBaja] = useState<number | null>(null)

  function abrir(tecnico: TecnicoDisponible | null): void {
    setDialogo((d) => ({ abierto: true, tecnico, vez: d.vez + 1 }))
  }

  async function alternarDisponible(t: TecnicoDisponible): Promise<void> {
    setCambiando(t.id)
    setAviso(null)
    try {
      await api.patch(`/panel/tecnicos/${t.id}`, {
        nombres: t.nombres,
        apellidos: t.apellidos,
        telefono: t.telefono ?? '',
        disponible: !t.disponible,
        especialidades: t.especialidades,
      })
      await queryClient.invalidateQueries({ queryKey: ['panel', 'tecnicos'] })
      setAviso({ tipo: 'exito', texto: `${t.nombreCompleto} ahora está ${t.disponible ? 'no disponible: no aparecerá al asignar' : 'disponible para nuevas visitas'}.` })
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err) })
    } finally {
      setCambiando(null)
    }
  }

  async function darDeBaja(t: TecnicoDisponible): Promise<void> {
    setCambiando(t.id)
    setAviso(null)
    try {
      await api.delete(`/panel/tecnicos/${t.id}`)
      setConfirmarBaja(null)
      await queryClient.invalidateQueries({ queryKey: ['panel', 'tecnicos'] })
      setAviso({ tipo: 'exito', texto: `${t.nombreCompleto} ya no forma parte del equipo.` })
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err) })
    } finally {
      setCambiando(null)
    }
  }

  const lista = tecnicos.data ?? []
  const disponibles = lista.filter((t) => t.disponible).length

  return (
    <div className={contenedorPanel}>
      <CabeceraPagina
        titulo="Equipo"
        detalle={tecnicos.data ? `${lista.length} ${lista.length === 1 ? 'técnico' : 'técnicos'} · ${disponibles} ${disponibles === 1 ? 'disponible' : 'disponibles'} para nuevas visitas` : 'Tus técnicos y los servicios que atiende cada uno.'}
        acciones={<Boton type="button" onClick={() => abrir(null)}><Icono nombre="mas" className="size-4" /> Añadir técnico</Boton>}
      />

      <div aria-live="polite">
        {aviso && <Aviso tipo={aviso.tipo} className="mb-4">{aviso.texto}</Aviso>}
      </div>

      {tecnicos.isPending ? (
        <EsqueletoLista filas={3} alto="h-48" etiqueta="Cargando tu equipo…" />
      ) : tecnicos.error ? (
        <ErrorCarga mensaje={mensajeDeError(tecnicos.error)} reintentar={() => void tecnicos.refetch()} />
      ) : lista.length === 0 ? (
        <div className="grid justify-items-center rounded-2xl border border-dashed border-publico-linea-fuerte bg-publico-superficie px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-publico-acento-tenue text-publico-chip-texto"><Icono nombre="equipo" className="size-7" /></span>
          <h2 className="mt-4 text-xl font-bold">Añade a tu primer técnico</h2>
          <p className="mt-1.5 max-w-sm text-sm text-publico-tinta-media">Solo necesitas su nombre, su correo y los servicios que atiende. Las visitas le llegarán por correo.</p>
          <Boton type="button" className="mt-5" onClick={() => abrir(null)}><Icono nombre="mas" className="size-4" /> Añadir técnico</Boton>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((t) => (
            <li key={t.id} className={`flex flex-col rounded-2xl border bg-publico-superficie p-5 shadow-sm shadow-publico-tinta/5 ${t.disponible ? 'border-publico-linea' : 'border-dashed border-publico-linea-fuerte'}`}>
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className={`grid size-13 shrink-0 place-items-center rounded-2xl text-lg font-bold ${t.disponible ? 'bg-publico-panel text-publico-acento' : 'bg-publico-superficie-suave text-publico-tinta-suave'}`}>
                  {iniciales(t.nombreCompleto)}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg leading-tight font-bold">{t.nombreCompleto}</h2>
                  <p className="mt-1 text-sm text-publico-tinta-media">
                    {t.ordenesHoy === 0 ? 'Sin visitas hoy' : `${t.ordenesHoy} ${t.ordenesHoy === 1 ? 'visita' : 'visitas'} hoy`}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-publico-lienzo px-3 py-2">
                <span id={`disp-${t.id}`} className={`text-sm font-bold ${t.disponible ? 'text-publico-completada' : 'text-publico-tinta-suave'}`}>
                  {t.disponible ? 'Disponible' : 'No disponible'}
                </span>
                <Interruptor activo={t.disponible} etiqueta={`${t.nombreCompleto} disponible para nuevas visitas`} deshabilitado={cambiando === t.id} alCambiar={() => void alternarDisponible(t)} />
              </div>

              <ul aria-label="Servicios que atiende" className="mt-4 flex flex-wrap gap-1.5">
                {t.especialidades.map((e) => (
                  <li key={e} className="inline-flex items-center gap-1.5 rounded-lg bg-publico-acento-tenue px-2 py-1 text-xs font-bold text-publico-chip-texto">
                    <Icono nombre={ICONO_ESPECIALIDAD[e]} className="size-3.5" />{ESPECIALIDAD_CORTA[e]}
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid gap-1 border-t border-publico-linea pt-3 text-sm">
                <a href={`mailto:${t.email}`} className={`-mx-1 flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-1 text-publico-tinta-media hover:text-publico-tinta ${focoClaro}`}>
                  <Icono nombre="correo" className="size-4 shrink-0" /><span className="truncate">{t.email}</span>
                </a>
                {t.telefono ? (
                  <a href={`tel:${t.telefono}`} className={`-mx-1 flex min-h-11 items-center gap-2 rounded-lg px-1 text-publico-tinta-media hover:text-publico-tinta ${focoClaro}`}>
                    <Icono nombre="telefono" className="size-4 shrink-0" />{t.telefono}
                  </a>
                ) : (
                  <p className="flex min-h-11 items-center gap-2 text-publico-tinta-suave"><Icono nombre="telefono" className="size-4 shrink-0" />Sin teléfono</p>
                )}
              </div>

              <div className="mt-auto pt-3">
                {confirmarBaja === t.id ? (
                  <div role="group" aria-labelledby={`baja-${t.id}`} className="rounded-xl border border-publico-peligro/40 p-3">
                    <p id={`baja-${t.id}`} className="text-sm">
                      ¿Quitar a <b>{t.nombreCompleto}</b> del equipo? Ya no podrás asignarle visitas. Su historial se conserva.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Boton type="button" variante="secundario" onClick={() => setConfirmarBaja(null)} disabled={cambiando === t.id} className="flex-1">No, mantener</Boton>
                      <Boton type="button" variante="peligro" onClick={() => void darDeBaja(t)} cargando={cambiando === t.id} className="flex-1">Sí, quitar</Boton>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Boton type="button" variante="secundario" className="flex-1" onClick={() => abrir(t)}>
                      <Icono nombre="lapiz" className="size-4" /> Editar<span className="sr-only"> a {t.nombreCompleto}</span>
                    </Boton>
                    <button type="button" onClick={() => { setAviso(null); setConfirmarBaja(t.id) }} className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-publico-tinta-suave hover:bg-publico-superficie-suave hover:text-publico-peligro ${focoClaro}`}>
                      Quitar<span className="sr-only"> a {t.nombreCompleto} del equipo</span>
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}

          <li>
            <button
              type="button"
              onClick={() => abrir(null)}
              className={`grid size-full min-h-48 place-items-center content-center gap-2 rounded-2xl border-2 border-dashed border-publico-linea-fuerte p-5 text-publico-tinta-media hover:border-publico-acento-hondo hover:bg-publico-acento-tenue hover:text-publico-tinta ${focoClaro}`}
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-publico-superficie text-publico-tinta shadow-sm shadow-publico-tinta/10"><Icono nombre="mas" className="size-5" /></span>
              <span className="font-bold">Añadir técnico</span>
            </button>
          </li>
        </ul>
      )}

      <p className="mt-6 flex items-start gap-2 text-sm text-publico-tinta-media">
        <Icono nombre="correo" className="mt-0.5 size-4 shrink-0" />
        Tus técnicos no necesitan cuenta ni contraseña: cada visita les llega al correo con botones para confirmar y avisar cuando salen.
      </p>

      <DialogoTecnico
        key={dialogo.vez}
        abierto={dialogo.abierto}
        tecnico={dialogo.tecnico}
        alCerrar={() => setDialogo((d) => ({ ...d, abierto: false }))}
        alGuardar={(nombre) => setAviso({ tipo: 'exito', texto: dialogo.tecnico ? `Guardamos los cambios de ${nombre}.` : `${nombre} ya es parte de tu equipo.` })}
      />
    </div>
  )
}
