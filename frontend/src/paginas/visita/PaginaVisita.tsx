import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono, SpriteIconos } from '../../componentes/Icono.tsx'
import type { IconoNombre } from '../../componentes/Icono.tsx'
import { focoClaro, focoOscuro } from '../../componentes/marco/foco.ts'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { fechaAmigable, formatearFecha, formatearMomento, horaCorta } from '../portal/fechas.ts'
import { ICONO_ESPECIALIDAD, coordenadas, mapaEmbebido, soles } from '../panel/formato.ts'
import type { MetodoPago } from '../panel/tiposPanel.ts'
import { Cobro } from './Cobro.tsx'
import { FormularioCierre } from './FormularioCierre.tsx'
import { FotosTrabajo } from './FotosTrabajo.tsx'
import type { VistaVisita } from './tiposVisita.ts'

/** Los cinco hitos del técnico. El índice es el que toca ahora; 5 = todo hecho. */
const HITOS: { titulo: string; icono: IconoNombre }[] = [
  { titulo: 'Confirmar', icono: 'check' },
  { titulo: 'En camino', icono: 'auto' },
  { titulo: 'Trabajando', icono: 'herramienta' },
  { titulo: 'Terminado', icono: 'documento' },
  { titulo: 'Cobrado', icono: 'moneda' },
]

function hitoActual(v: VistaVisita): number {
  switch (v.estado) {
    case 'ASIGNADA': return 0
    case 'CONFIRMADA': return 1
    case 'EN_CAMINO': return 2
    case 'EN_PROCESO': return 3
    case 'COMPLETADA':
    case 'CALIFICADA': return v.total == null ? 3 : v.pago ? 5 : 4
    default: return -1
  }
}

const METODO: Record<MetodoPago, string> = { EFECTIVO: 'en efectivo', YAPE: 'con Yape', PLIN: 'con Plin', TRANSFERENCIA: 'por transferencia' }

/** Lo que se le dice al técnico justo después de cada paso. */
const LOGRO: Record<string, string> = {
  confirmar: '¡Confirmado! El taller ya sabe que irás.',
  'en-camino': 'Buen viaje. El cliente ya sabe que vas en camino.',
  llegue: 'Anotado: ya estás trabajando. Cuando termines, cierra el trabajo aquí abajo.',
  terminar: 'Trabajo cerrado. Ahora cobra al cliente.',
  cobro: '¡Listo! Cobro registrado. Buen trabajo.',
}

/**
 * La página del técnico, a la que llega desde el botón «Abrir mi orden» del
 * correo. Sin cuenta ni contraseña: la llave es el token de la URL.
 *
 * Pensada para el celular y para usarla con una mano: arriba, en qué va la
 * visita; justo debajo, un solo botón grande con lo siguiente que toca.
 */
export function PaginaVisita(): ReactNode {
  const { token = '' } = useParams<{ token: string }>()
  const queryClient = useQueryClient()
  const clave = ['visita', token]
  const [logro, setLogro] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [avanzando, setAvanzando] = useState<string | null>(null)

  const consulta = useQuery<VistaVisita>({
    queryKey: clave,
    queryFn: async () => (await api.get<VistaVisita>(`/visita/${token}`)).data,
    // El taller puede cancelar o cerrar desde el panel: la página se entera sola.
    refetchInterval: 30_000,
    retry: (intentos, err) => !(axios.isAxiosError(err) && err.response?.status === 404) && intentos < 2,
  })

  useEffect(() => {
    document.title = consulta.data ? `${consulta.data.codigo} · Tu visita · TechServ` : 'Tu visita · TechServ'
  }, [consulta.data])

  function actualizar(nueva: VistaVisita, paso: string): void {
    queryClient.setQueryData(clave, nueva)
    setError(null)
    setLogro(LOGRO[paso] ?? null)
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  async function avanzar(paso: 'confirmar' | 'en-camino' | 'llegue'): Promise<void> {
    setAvanzando(paso)
    setError(null)
    setLogro(null)
    try {
      const res = await api.post<VistaVisita>(`/visita/${token}/${paso}`)
      actualizar(res.data, paso)
    } catch (err) {
      setError(mensajeDeError(err))
      void consulta.refetch()
    } finally {
      setAvanzando(null)
    }
  }

  if (consulta.isPending) {
    return (
      <Marco>
        <div aria-hidden="true" className="h-72 bg-publico-panel motion-safe:animate-pulse" />
        <p className="sr-only" role="status">Cargando tu visita…</p>
        <div className="mx-auto grid max-w-xl gap-4 px-4 py-6">
          <div className="h-40 rounded-2xl bg-publico-superficie-suave motion-safe:animate-pulse" />
          <div className="h-56 rounded-2xl bg-publico-superficie-suave motion-safe:animate-pulse" />
        </div>
      </Marco>
    )
  }

  if (consulta.isError) {
    const noValido = axios.isAxiosError(consulta.error) && consulta.error.response?.status === 404
    return (
      <Marco>
        <main id="contenido" className="mx-auto grid min-h-dvh max-w-md content-center justify-items-center px-6 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-publico-panel text-publico-acento"><Icono nombre={noValido ? 'pausa' : 'refrescar'} className="size-8" /></span>
          <h1 className="mt-5 text-2xl font-bold">{noValido ? 'Este enlace ya no sirve' : 'No pudimos abrir tu visita'}</h1>
          <p className="mt-2 text-publico-tinta-media">{noValido ? 'Puede que haya caducado o que la visita ya no esté a tu nombre. Pide al taller que te lo envíe de nuevo.' : mensajeDeError(consulta.error)}</p>
          {!noValido && <Boton type="button" className="mt-6" onClick={() => void consulta.refetch()}><Icono nombre="refrescar" className="size-4" /> Intentar otra vez</Boton>}
        </main>
      </Marco>
    )
  }

  const v = consulta.data
  const hito = hitoActual(v)
  const cancelada = v.estado === 'CANCELADA'
  const dia = fechaAmigable(v.fechaProgramada)
  const esDiaRelativo = ['hoy', 'mañana', 'ayer'].includes(dia)
  const punto = coordenadas(v.urlMapa)
  const trabajando = v.estado === 'EN_PROCESO' || v.estado === 'COMPLETADA' || v.estado === 'CALIFICADA'

  const botonPaso = (texto: string, icono: IconoNombre, paso: 'confirmar' | 'en-camino' | 'llegue') => (
    <Boton type="button" onClick={() => void avanzar(paso)} cargando={avanzando === paso} className="min-h-14 w-full text-base">
      {avanzando !== paso && <Icono nombre={icono} className="size-5" />} {texto}
    </Boton>
  )

  return (
    <Marco>
      {/* ─── Cabecera: de qué taller viene ─── */}
      <header className="bg-publico-panel text-publico-superficie">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 pt-5">
          <p className="flex min-w-0 items-center gap-2 text-sm font-bold">
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-publico-acento text-publico-tinta"><Icono nombre="herramienta" className="size-4" /></span>
            <span className="truncate">{v.tallerNombre}</span>
          </p>
          {v.tallerTelefono && (
            <a href={`tel:${v.tallerTelefono}`} className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-publico-superficie/80 hover:text-publico-superficie ${focoOscuro}`}>
              <Icono nombre="telefono" className="size-4" /> Taller
              <span className="sr-only">: llamar al {v.tallerTelefono}</span>
            </a>
          )}
        </div>
      </header>

      <main id="contenido">
      {/* ─── Qué visita es y en qué va ─── */}
      <section aria-labelledby="titulo-visita" className="bg-publico-panel text-publico-superficie">
        <div className="mx-auto max-w-xl px-4 pt-6 pb-7">
          <p className="text-sm font-bold text-publico-acento">Hola, {v.tecnicoNombres}</p>
          <h1 id="titulo-visita" className="mt-1 text-[clamp(1.625rem,1.3rem+1.6vw,2.25rem)] leading-[1.15] font-bold tracking-[-0.025em]">
            {cancelada ? 'Esta visita se canceló' : hito === 5 ? '¡Visita terminada!' : <>{esDiaRelativo ? <span className="inline-block first-letter:uppercase">{dia}</span> : `El ${dia}`}{v.horaProgramada && <> a las {horaCorta(v.horaProgramada)}</>}</>}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-publico-superficie/70">
            <Icono nombre={ICONO_ESPECIALIDAD[v.especialidad]} className="size-4 text-publico-acento" />
            {v.etiquetaEspecialidad}
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{v.codigo}</span>
            <span aria-hidden="true">·</span>
            {v.distrito}
          </p>

          {!cancelada && (
            <ol aria-label={hito === 5 ? 'Todos los pasos hechos' : `Paso ${hito + 1} de ${HITOS.length}: ${HITOS[hito].titulo}`} className="mt-7 grid grid-cols-5">
              {HITOS.map((h, i) => {
                const hecho = i < hito
                const ahora = i === hito
                return (
                  <li key={h.titulo} aria-current={ahora ? 'step' : undefined} className="relative flex flex-col items-center text-center">
                    {i > 0 && (
                      <span aria-hidden="true" className="absolute top-5 right-1/2 left-[-50%] h-0.5 overflow-hidden bg-publico-superficie/20">
                        <span className={`block h-full origin-left bg-publico-acento motion-safe:transition-transform motion-safe:duration-700 ${i <= hito ? 'scale-x-100' : 'scale-x-0'}`} />
                      </span>
                    )}
                    <span aria-hidden="true" className={`relative z-10 grid size-10 place-items-center rounded-xl motion-safe:transition-colors motion-safe:duration-500 ${hecho ? 'bg-publico-acento text-publico-tinta' : ahora ? 'bg-publico-panel text-publico-acento ring-2 ring-publico-acento ring-offset-4 ring-offset-publico-panel' : 'border border-publico-superficie/25 bg-publico-panel text-publico-superficie/40'}`}>
                      {ahora && <span className="absolute inset-0 rounded-xl bg-publico-acento/25 motion-safe:animate-ping" />}
                      {hecho
                        ? <span key="hecho" className="motion-safe:animate-[visita-sello_450ms_ease-out]"><Icono nombre="visto" className="relative size-5" /></span>
                        : <Icono nombre={h.icono} className="relative size-5" />}
                    </span>
                    <span className={`mt-2 text-xs leading-tight ${ahora ? 'font-bold text-publico-superficie' : hecho ? 'text-publico-acento-tenue' : 'text-publico-superficie/55'}`}>{h.titulo}</span>
                    <span className="sr-only">{hecho ? ', hecho' : ahora ? ', ahora' : ', pendiente'}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-xl gap-5 px-4 pt-5 pb-12">
        <div aria-live="polite" className="empty:hidden">
          {logro && (
            <p key={logro} className="flex items-start gap-3 rounded-2xl border border-publico-completada/30 bg-publico-superficie p-4 font-bold text-publico-completada shadow-sm shadow-publico-tinta/5 motion-safe:animate-[visita-entra_350ms_ease-out]">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-publico-completada text-publico-superficie motion-safe:animate-[visita-sello_450ms_ease-out]"><Icono nombre="visto" className="size-4" /></span>
              <span className="pt-1">{logro}</span>
            </p>
          )}
        </div>
        {error && <Aviso tipo="error">{error}</Aviso>}

        {/* ─── Lo que toca ahora ─── */}
        <section aria-label="Lo que toca ahora" key={`${v.estado}-${v.total ?? ''}-${v.pago ? 1 : 0}`} className="rounded-2xl border border-publico-linea bg-publico-superficie p-5 shadow-lg shadow-publico-tinta/10 motion-safe:animate-[visita-entra_350ms_ease-out]">
          {cancelada ? (
            <p className="text-publico-tinta-media">El taller canceló esta visita. No tienes que ir. Si tienes dudas, llama al taller.</p>
          ) : v.estado === 'ASIGNADA' ? (
            <>
              <h2 className="text-xl font-bold">¿Puedes ir?</h2>
              <p className="mt-1 mb-4 text-sm text-publico-tinta-media">Revisa abajo la dirección y lo que contó el cliente, y confirma la visita.</p>
              {botonPaso('Confirmar visita', 'check', 'confirmar')}
            </>
          ) : v.estado === 'CONFIRMADA' ? (
            <>
              <h2 className="text-xl font-bold">Cuando salgas, avísale</h2>
              <p className="mt-1 mb-4 text-sm text-publico-tinta-media">El cliente verá que vas en camino.</p>
              {botonPaso('Voy en camino', 'auto', 'en-camino')}
            </>
          ) : v.estado === 'EN_CAMINO' ? (
            <>
              <h2 className="text-xl font-bold">¿Ya llegaste?</h2>
              <p className="mt-1 mb-4 text-sm text-publico-tinta-media">Márcalo al entrar al domicilio y empieza el trabajo.</p>
              {botonPaso('Ya llegué, empiezo', 'casa', 'llegue')}
              {v.urlMapa && (
                <a href={v.urlMapa} target="_blank" rel="noopener noreferrer" className={`mt-2 flex min-h-12 items-center justify-center gap-2 rounded-lg border border-publico-linea-fuerte bg-publico-superficie text-sm font-bold hover:bg-publico-superficie-suave ${focoClaro}`}>
                  <Icono nombre="mapa" className="size-4" /> Cómo llegar<span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
              )}
            </>
          ) : hito === 3 ? (
            <FormularioCierre token={token} visita={v} alTerminar={(n) => actualizar(n, 'terminar')} />
          ) : hito === 4 && v.total != null ? (
            <Cobro token={token} total={v.total} alCobrar={(n) => actualizar(n, 'cobro')} />
          ) : (
            <div className="grid justify-items-center py-2 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-publico-completada text-publico-superficie motion-safe:animate-[visita-sello_500ms_ease-out]"><Icono nombre="visto" className="size-8" /></span>
              <h2 className="mt-4 text-xl font-bold">{v.pago?.cobradoPor ? `Cobraste ${soles(v.pago.monto)}` : `El taller registró el cobro de ${soles(v.pago?.monto ?? v.total)}`}</h2>
              {v.pago && <p className="mt-1 text-sm text-publico-tinta-media">{METODO[v.pago.metodo][0].toUpperCase() + METODO[v.pago.metodo].slice(1)}, el {formatearMomento(v.pago.pagadoEn)}.</p>}
              <p className="mt-3 max-w-xs text-sm text-publico-tinta-media">No queda nada pendiente. Si puedes, sube fotos del trabajo terminado.</p>
            </div>
          )}
        </section>

        {trabajando && !cancelada && <FotosTrabajo token={token} visita={v} alSubir={(n) => queryClient.setQueryData(clave, n)} />}

        {/* ─── Lo cobrado, cuando ya está cerrado ─── */}
        {v.total != null && (
          <Tarjeta titulo="Lo que se cobró" icono="moneda">
            {v.diagnostico && <p className="mb-3 text-sm text-publico-tinta-media first-letter:uppercase">{v.diagnostico}</p>}
            <dl className="grid gap-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt>Mano de obra</dt><dd className="tabular-nums">{soles(v.precioManoObra)}</dd></div>
              {v.repuestos.map((r, i) => (
                <div key={i} className="flex justify-between gap-3"><dt className="min-w-0">{r.cantidad} × {r.nombre}</dt><dd className="tabular-nums">{soles(r.subtotal)}</dd></div>
              ))}
              <div className="mt-1 flex justify-between gap-3 border-t-2 border-publico-tinta pt-2 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{soles(v.total)}</dd></div>
            </dl>
          </Tarjeta>
        )}

        {/* ─── Dónde ─── */}
        <Tarjeta titulo="Dónde es" icono="pin">
          <p className="text-lg font-bold">{v.direccion}</p>
          <p className="mt-0.5 text-sm text-publico-tinta-media">{v.distrito}{v.referencia && <> · {v.referencia}</>}</p>
          {punto && (
            <div className="mt-4 overflow-hidden rounded-xl border border-publico-linea bg-publico-superficie-suave focus-within:ring-2 focus-within:ring-publico-acento focus-within:ring-offset-2 focus-within:ring-offset-publico-superficie">
              <iframe title={`Mapa de ${v.direccion}`} src={mapaEmbebido(punto)} loading="lazy" referrerPolicy="no-referrer" className="block h-52 w-full" />
            </div>
          )}
          {v.urlMapa && (
            <a href={v.urlMapa} target="_blank" rel="noopener noreferrer" className={`mt-3 flex min-h-12 items-center justify-center gap-2 rounded-lg border border-publico-linea-fuerte bg-publico-superficie text-sm font-bold hover:bg-publico-superficie-suave ${focoClaro}`}>
              <Icono nombre="mapa" className="size-4" /> Abrir en Google Maps<span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          )}
          <p className="mt-4 flex items-center gap-2 border-t border-publico-linea pt-4 text-sm">
            <Icono nombre="calendario" className="size-4 shrink-0 text-publico-tinta-media" />
            <span><b className="inline-block first-letter:uppercase">{dia}</b>{esDiaRelativo && v.fechaProgramada && <span className="text-publico-tinta-media"> ({formatearFecha(v.fechaProgramada)})</span>}{v.horaProgramada && <> a las <b>{horaCorta(v.horaProgramada)}</b></>}</span>
          </p>
        </Tarjeta>

        {/* ─── Cliente ─── */}
        <Tarjeta titulo="Cliente" icono="equipo">
          <p className="text-lg font-bold">{v.clienteNombre}</p>
          {v.clienteTelefono && (
            <a href={`tel:${v.clienteTelefono}`} className={`mt-3 flex min-h-12 items-center justify-center gap-2 rounded-lg border border-publico-tinta bg-publico-tinta text-sm font-bold text-publico-superficie hover:bg-publico-panel ${focoClaro}`}>
              <Icono nombre="telefono" className="size-4" /> Llamar al {v.clienteTelefono}
            </a>
          )}
        </Tarjeta>

        {/* ─── La falla ─── */}
        <Tarjeta titulo="Lo que contó el cliente" icono="documento">
          <blockquote className="rounded-xl border-l-4 border-publico-acento bg-publico-lienzo px-4 py-3 text-base/[1.55] first-letter:uppercase">{v.descripcionFalla}</blockquote>
          {v.fotosCliente.length > 0 && (
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {v.fotosCliente.map((foto, i) => (
                <li key={foto}>
                  <a href={foto} target="_blank" rel="noopener noreferrer" className={`block aspect-square overflow-hidden rounded-xl border border-publico-linea bg-publico-superficie-suave ${focoClaro}`}>
                    <img src={foto} alt={`Foto ${i + 1} que envió el cliente`} className="size-full object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <p className="flex items-start gap-2 px-1 text-xs text-publico-tinta-suave">
          <Icono nombre="correo" className="mt-px size-4 shrink-0" />
          Este enlace es solo para ti: no lo reenvíes. Guárdalo; puedes volver a abrirlo desde el correo.
        </p>
      </div>
      </main>
    </Marco>
  )
}

function Marco({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="min-h-dvh bg-publico-lienzo font-publico text-publico-tinta">
      <SpriteIconos />
      {children}
    </div>
  )
}

function Tarjeta({ titulo, icono, children }: { titulo: string; icono: IconoNombre; children: ReactNode }): ReactNode {
  return (
    <section className="rounded-2xl border border-publico-linea bg-publico-superficie p-5 shadow-sm shadow-publico-tinta/5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-publico-tinta-media"><Icono nombre={icono} className="size-4" /> {titulo}</h2>
      {children}
    </section>
  )
}
