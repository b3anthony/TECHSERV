import { useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { AvisoError } from '../../componentes/AvisoError.tsx'
import { Cargando } from '../../componentes/Cargando.tsx'
import { Icono } from '../../componentes/Icono.tsx'
import { focoClaro, focoAmarillo } from '../../componentes/marco/foco.ts'
import type { Especialidad } from '../../tipos.ts'
import { DISTRITOS_TRUJILLO } from './distritos.ts'
import { hoyString } from './fechas.ts'
import type { EspecialidadItem, TallerItem } from './tiposPortal.ts'
import { fotosEspecialidad, fotosTaller } from './fotos.ts'

const contenedor = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8'

interface TallerDestacado {
  taller: TallerItem
  especialidades: EspecialidadItem[]
  tarifaEspecialidad: EspecialidadItem
}

interface DatosPortada {
  especialidades: EspecialidadItem[]
  listas: Map<Especialidad, TallerItem[]>
  talleres: TallerDestacado[]
}

async function cargarPortada(): Promise<DatosPortada> {
  const respuesta = await api.get<EspecialidadItem[]>('/catalogo/especialidades')
  const especialidades = respuesta.data
  const consultas = await Promise.all(
    especialidades.map(async (especialidad) => {
      const talleres = await api.get<TallerItem[]>(
        `/catalogo/mypes?especialidad=${encodeURIComponent(especialidad.clave)}`,
      )
      return [especialidad.clave, talleres.data] as const
    }),
  )
  const listas = new Map<Especialidad, TallerItem[]>(consultas)
  const orden = [
    ...especialidades.filter((item) => item.clave === 'SERVICIOS_HOGAR'),
    ...especialidades.filter((item) => item.clave !== 'SERVICIOS_HOGAR'),
  ]
  const unidos = new Map<number, TallerDestacado>()
  for (const especialidad of orden) {
    for (const taller of listas.get(especialidad.clave) ?? []) {
      const anterior = unidos.get(taller.id)
      if (anterior) {
        anterior.especialidades.push(especialidad)
      } else {
        unidos.set(taller.id, {
          taller,
          especialidades: [especialidad],
          tarifaEspecialidad: especialidad,
        })
      }
    }
  }
  return { especialidades, listas, talleres: [...unidos.values()] }
}


function precio(tarifa: number): string {
  return `S/ ${tarifa.toFixed(2)}`
}

export function Portada(): ReactNode {
  const navigate = useNavigate()
  const idServicio = useId()
  const idDistrito = useId()
  const idFecha = useId()
  const idBuscador = useId()
  const [especialidad, setEspecialidad] = useState('')
  const [distrito, setDistrito] = useState('')
  const [fecha, setFecha] = useState('')
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['portada', 'catalogo'],
    queryFn: cargarPortada,
  })
  const especialidadHogar = data?.especialidades.find((item) => item.clave === 'SERVICIOS_HOGAR')
  const ticket = [...(data?.listas.get('SERVICIOS_HOGAR') ?? [])]
    .sort((a, b) => a.tarifaBase - b.tarifaBase)

  function buscar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault()
    const parametros = new URLSearchParams()
    if (especialidad) parametros.set('especialidad', especialidad)
    if (distrito) parametros.set('distrito', distrito)
    if (fecha) parametros.set('fecha', fecha)
    const consulta = parametros.toString()
    navigate(`/reservar${consulta ? `?${consulta}` : ''}`)
  }

  return (
    <>
      <section className="portada-heroe-fondo relative overflow-hidden bg-publico-panel pt-22 pb-22 text-publico-superficie min-[481px]:pb-26 lg:min-h-[46rem] lg:pt-38 lg:pb-44" aria-labelledby="publico-titulo">
        <div className="absolute inset-0 bg-publico-panel/90 lg:bg-publico-panel/85" aria-hidden="true" />
        <div className={`${contenedor} relative z-10 grid gap-6 lg:grid-cols-2 lg:gap-12`}>
          <div className="grid content-center gap-4 lg:gap-5 lg:pr-4">
            <h1 id="publico-titulo" className="max-w-[16ch] text-[clamp(2rem,1.2rem+3.2vw,3.25rem)] leading-[1.08] font-bold tracking-[-0.03em] text-balance lg:text-[clamp(3rem,1rem+3.4vw,4rem)]">
              Sabes la <em className="not-italic shadow-[inset_0_-0.14em_0_var(--color-publico-acento)]">tarifa</em> y la <em className="not-italic shadow-[inset_0_-0.14em_0_var(--color-publico-acento)]">hora</em> antes de agendar.
            </h1>
            <p className="max-w-[34rem] text-lg leading-[1.55] text-pretty text-publico-linea-fuerte">Compara talleres de Trujillo por su tarifa base, elige una franja horaria con cupo y agenda en línea, sin llamar a nadie.</p>
            <ul className="mt-2 flex flex-wrap gap-y-2 text-sm/[1.55] text-publico-acento-tenue">
              {data && <li className="mr-4 flex items-baseline gap-1.5 border-r border-publico-superficie/20 pr-4"><b className="text-2xl leading-none text-publico-superficie">{data.especialidades.length}</b> especialidades</li>}
              <li className="mr-4 flex items-baseline gap-1.5 border-r border-publico-superficie/20 pr-4"><b className="text-2xl leading-none text-publico-superficie">{DISTRITOS_TRUJILLO.length}</b> distritos</li>
              <li>Pago directo al taller</li>
            </ul>
          </div>
        </div>
        <figure className="portada-foto-transicion relative z-10 mx-4 mt-7 sm:mx-6 lg:absolute lg:top-16 lg:right-0 lg:bottom-0 lg:mt-0 lg:mx-0 lg:w-[48%]">
          <img src="/portada/hero.jpg" width="1600" height="900" fetchPriority="high" alt="Técnico de un taller de Trujillo llega con su caja de herramientas a la puerta de una vivienda y saluda a la clienta que le abre." className="aspect-video w-full rounded-2xl bg-publico-acento object-cover lg:h-full lg:rounded-none lg:object-[72%_center]" />
          {ticket.length > 0 && (
            <figcaption aria-label="Tarifas base de los talleres destacados" className="relative z-20 mx-3 -mt-8 rounded-2xl bg-publico-superficie px-3.5 py-3 text-publico-tinta shadow-2xl shadow-publico-tinta/30 min-[481px]:absolute min-[481px]:bottom-[-1.25rem] min-[481px]:left-4 min-[481px]:m-0 min-[481px]:w-[min(19rem,calc(100%-2rem))] min-[481px]:px-4 min-[481px]:pt-4 min-[481px]:pb-3.5 lg:bottom-38 lg:-left-20 lg:w-80">
              <div className="flex items-center justify-between gap-2 text-xs/[1.55] font-bold text-publico-tinta-media"><span>Tarifa base · {especialidadHogar?.titulo}</span><span className="font-medium text-publico-tinta-suave">desde</span></div>
              <ol className="mt-2.5 grid grid-cols-3 gap-2.5 border-t border-dashed border-publico-linea-fuerte pt-2.5 min-[481px]:grid-cols-1 min-[481px]:gap-1.5">
                {ticket.map((taller) => <li key={taller.id} className="grid content-start gap-0.5 text-xs leading-[1.3] min-[481px]:flex min-[481px]:items-baseline min-[481px]:justify-between min-[481px]:gap-4 min-[481px]:text-sm min-[481px]:leading-[1.55]"><span className="text-publico-tinta-media">{taller.razonSocial}</span><b className="text-base whitespace-nowrap tabular-nums min-[481px]:text-sm/[1.55]">{precio(taller.tarifaBase)}</b></li>)}
              </ol>
              <p className="mt-2.5 hidden text-xs/[1.55] text-publico-tinta-suave min-[481px]:block">Antes de agendar, no después de la visita.</p>
            </figcaption>
          )}
        </figure>
      </section>

      <div id="buscar" className="relative z-20 -mt-14 lg:-mt-26">
        <div className={contenedor}>
          <form role="search" aria-labelledby={idBuscador} onSubmit={buscar} className="grid gap-4 rounded-2xl border border-publico-linea bg-publico-superficie p-5 shadow-2xl shadow-publico-tinta/25 lg:px-7 lg:pt-6">
            <h2 id={idBuscador} className="text-lg font-bold tracking-[-0.01em]">¿Qué necesitas reparar?</h2>
            <div className="grid gap-3.5 min-[720px]:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-end">
              <div className="grid gap-1.5">
                <label htmlFor={idServicio} className="text-sm/[1.55] font-bold">¿Qué necesitas?</label>
                <div className="relative">
                  <Icono nombre="herramienta" className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-publico-tinta-suave" />
                  <select id={idServicio} value={especialidad} onChange={(evento) => setEspecialidad(evento.target.value)} className={`min-h-13 w-full appearance-none rounded-lg border border-publico-linea-fuerte bg-publico-superficie pr-10 pl-10 text-publico-tinta hover:border-publico-tinta-suave ${focoClaro}`}>
                    <option value="">Elige un tipo de servicio</option>
                    {data?.especialidades.map((item) => <option key={item.clave} value={item.clave}>{item.titulo}</option>)}
                  </select>
                  <svg className="pointer-events-none absolute top-1/2 right-4 h-1.5 w-2.5 -translate-y-1/2 text-publico-tinta-suave" viewBox="0 0 10 6" aria-hidden="true" focusable="false"><path d="M0 0h10L5 6z" fill="currentColor" /></svg>
                </div>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor={idDistrito} className="text-sm/[1.55] font-bold">¿En qué distrito?</label>
                <div className="relative">
                  <Icono nombre="pin" className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-publico-tinta-suave" />
                  <select id={idDistrito} value={distrito} onChange={(evento) => setDistrito(evento.target.value)} className={`min-h-13 w-full appearance-none rounded-lg border border-publico-linea-fuerte bg-publico-superficie pr-10 pl-10 text-publico-tinta hover:border-publico-tinta-suave ${focoClaro}`}>
                    <option value="">Elige tu distrito</option>
                    {DISTRITOS_TRUJILLO.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <svg className="pointer-events-none absolute top-1/2 right-4 h-1.5 w-2.5 -translate-y-1/2 text-publico-tinta-suave" viewBox="0 0 10 6" aria-hidden="true" focusable="false"><path d="M0 0h10L5 6z" fill="currentColor" /></svg>
                </div>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor={idFecha} className="text-sm/[1.55] font-bold">¿Cuándo?</label>
                <div className="relative">
                  <Icono nombre="calendario" className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-publico-tinta-suave" />
                  <input id={idFecha} type="date" min={hoyString()} value={fecha} onChange={(evento) => setFecha(evento.target.value)} className={`min-h-13 w-full rounded-lg border border-publico-linea-fuerte bg-publico-superficie pr-3 pl-10 text-publico-tinta hover:border-publico-tinta-suave ${focoClaro}`} />
                </div>
              </div>
              <button type="submit" className={`inline-flex min-h-13 items-center justify-center gap-2 rounded-lg bg-publico-acento px-6 font-bold text-publico-tinta hover:bg-publico-acento-hondo ${focoAmarillo}`}><Icono nombre="lupa" className="size-5" />Buscar talleres</button>
            </div>
            <p className="flex items-center gap-2 text-sm/[1.55] text-publico-tinta-media"><Icono nombre="check" className="size-4 shrink-0 text-publico-completada" />Consultar no pide registro ni datos personales.</p>
          </form>
        </div>
      </div>

      {isPending && <div className={contenedor}><Cargando /></div>}
      {isError && <div className={`${contenedor} py-8`}><AvisoError mensaje={mensajeDeError(error)} reintentar={() => { void refetch() }} /></div>}

      <section className="py-16" aria-labelledby="publico-especialidades">
        <div className={contenedor}>
          <div className="mb-6">
            <h2 id="publico-especialidades" className="text-[clamp(1.5rem,1.1rem+1.4vw,2rem)] leading-[1.2] font-bold tracking-[-0.02em]">Empieza por lo que se malogró</h2>
            <p className="mt-2 text-publico-tinta-media">{data ? `${data.especialidades.length === 3 ? 'Tres' : data.especialidades.length} especialidades, cada una con talleres que publican su tarifa base.` : 'Cada especialidad tiene talleres que publican su tarifa base.'}</p>
          </div>
          {data && <div className="grid gap-4 min-[720px]:grid-cols-3">
            {data.especialidades.map((item) => {
              const foto = fotosEspecialidad[item.clave]
              const cantidad = data.listas.get(item.clave)?.length ?? 0
              return <Link key={item.clave} to={`/reservar?especialidad=${encodeURIComponent(item.clave)}`} className={`group grid grid-rows-[auto_1fr] overflow-hidden rounded-2xl border border-publico-linea bg-publico-superficie shadow-sm shadow-publico-tinta/10 motion-safe:transition motion-safe:hover:-translate-y-0.5 hover:border-publico-linea-fuerte hover:shadow-xl hover:shadow-publico-tinta/20 ${focoClaro}`}>
                <div className="relative">
                  <img src={foto.src} width="800" height="600" loading="lazy" alt="" className="aspect-[4/3] w-full object-cover" />
                  <span className="absolute bottom-[-1.375rem] left-4 grid size-11 place-items-center rounded-lg bg-publico-tinta text-publico-acento ring-4 ring-publico-superficie"><Icono nombre={foto.icono} className="size-[22px]" /></span>
                </div>
                <div className="grid content-start gap-1.5 px-5 pt-8 pb-5">
                  <h3 className="text-lg leading-[1.3] font-bold">{item.titulo}</h3>
                  <p className="text-sm/[1.55] text-publico-tinta-media">{item.detalle}</p>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-publico-linea pt-3 text-sm/[1.55]"><span className="text-publico-tinta-media"><b className="text-publico-tinta">{cantidad}</b> talleres</span><span className="inline-flex items-center gap-1 font-bold underline decoration-publico-acento decoration-2 underline-offset-4">Ver talleres <Icono nombre="flecha" className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" /></span></div>
                </div>
              </Link>
            })}
          </div>}
        </div>
      </section>

      <section id="talleres" className="pb-16" aria-labelledby="publico-talleres">
        <div className={contenedor}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div><h2 id="publico-talleres" className="text-[clamp(1.5rem,1.1rem+1.4vw,2rem)] leading-[1.2] font-bold tracking-[-0.02em]">Talleres destacados</h2><p className="mt-2 text-publico-tinta-media">Compara de un vistazo: la tarifa base está a la vista en cada uno.</p></div>
            <a href="#talleres" className={`group inline-flex min-h-11 items-center gap-1.5 rounded-lg font-bold underline decoration-publico-acento decoration-2 underline-offset-4 ${focoClaro}`}>Ver todos los talleres <Icono nombre="flecha" className="size-[18px] motion-safe:transition-transform motion-safe:group-hover:translate-x-1" /></a>
          </div>
          {data && <ul className="grid gap-4">
            {data.talleres.map(({ taller, especialidades, tarifaEspecialidad }) => {
              const foto = fotosTaller[taller.id]
              return <li key={taller.id} className="grid grid-cols-[5.5rem_1fr] gap-4 rounded-2xl border border-publico-linea bg-publico-superficie p-4 shadow-sm shadow-publico-tinta/10 min-[481px]:grid-cols-[7rem_1fr] min-[720px]:grid-cols-[11rem_1fr] lg:grid-cols-[13rem_1fr_13rem] lg:items-center lg:gap-6 lg:p-5">
                <div className="self-start overflow-hidden rounded-lg bg-publico-superficie-suave">
                  {foto ? <img src={foto.src} width="800" height="600" loading="lazy" alt="" className="aspect-[4/3] w-full object-cover" /> : <span aria-hidden="true" className="grid aspect-[4/3] place-items-center text-3xl font-bold text-publico-tinta-media">{taller.razonSocial.charAt(0)}</span>}
                </div>
                <div className="grid min-w-0 content-start gap-1.5">
                  <h3 className="text-lg leading-[1.3] font-bold">{taller.razonSocial}</h3>
                  <p className="text-sm/[1.55] text-publico-tinta-media">{taller.descripcion}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm/[1.55] text-publico-tinta-media">
                    <span className="inline-flex items-center gap-1.5"><Icono nombre="estrella" className="size-4 text-publico-pendiente" /><b className="text-publico-tinta">{taller.promedio.toFixed(1)}</b><span className="sr-only">de calificación</span> · {taller.servicios} servicios</span>
                    <span className="inline-flex items-center gap-1.5"><Icono nombre="pin" className="size-4 shrink-0 text-publico-tinta-suave" />{taller.direccion}, {taller.distrito}</span>
                  </div>
                  <ul aria-label="Especialidades que atiende" className="mt-1 flex flex-wrap gap-1.5">{especialidades.map((item) => <li key={item.clave} className="rounded-lg bg-publico-acento-tenue px-2.5 py-1 text-xs/[1.55] font-medium text-publico-chip-texto">{item.titulo}</li>)}</ul>
                </div>
                <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-publico-linea pt-3.5 lg:col-span-1 lg:h-full lg:flex-col lg:items-end lg:justify-center lg:gap-3.5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 lg:text-right">
                  <div className="grid gap-0.5"><span className="text-xs/[1.55] font-bold text-publico-tinta-media">Tarifa base desde</span><span className="text-2xl leading-[1.15] font-bold tracking-[-0.02em] tabular-nums lg:text-[2rem]">{precio(taller.tarifaBase)}</span><span className="text-xs/[1.55] text-publico-tinta-suave">en {tarifaEspecialidad.titulo}</span></div>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-publico-superficie-suave px-2.5 py-1.5 text-xs/[1.55] font-bold text-publico-tinta-media"><Icono nombre={taller.atiendeHoy ? 'check' : 'pausa'} className="size-3.5" />Atiende hoy: {taller.atiendeHoy ? 'Sí' : 'No'}</span>
                  <Link to={`/reservar?especialidad=${encodeURIComponent(tarifaEspecialidad.clave)}&mype=${taller.id}`} className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-publico-acento px-4 text-sm/[1.55] font-bold text-publico-tinta hover:bg-publico-acento-hondo ${focoAmarillo}`}>Agendar</Link>
                </div>
              </li>
            })}
          </ul>}
          {data && <p className="mt-4 text-sm/[1.55] text-publico-tinta-suave">La tarifa base cambia según la especialidad; aquí se muestra la de {especialidadHogar && data.talleres.every((item) => item.tarifaEspecialidad.clave === 'SERVICIOS_HOGAR') ? especialidadHogar.titulo : 'la especialidad indicada en cada taller'}. El pago se hace directamente al taller.</p>}
        </div>
      </section>

      <section className="bg-publico-superficie-suave py-16" aria-labelledby="publico-como">
        <div className={contenedor}>
          <h2 id="publico-como" className="text-[clamp(1.5rem,1.1rem+1.4vw,2rem)] leading-[1.2] font-bold tracking-[-0.02em]">Cómo funciona</h2>
          <p className="mt-2 text-publico-tinta-media">De la búsqueda a la visita, sin llamadas de por medio.</p>
          <ol className="mt-8 grid gap-6 lg:grid-cols-3 lg:gap-8">
            <li className="portada-paso relative grid grid-cols-[3rem_1fr] content-start gap-4 lg:grid-cols-1 lg:gap-3"><span aria-hidden="true" className="relative z-10 grid size-12 place-items-center rounded-full bg-publico-tinta text-lg font-bold text-publico-acento ring-[6px] ring-publico-superficie-suave">1</span><div><h3 className="pt-2.5 text-lg leading-[1.3] font-bold lg:pt-2">Agendas en línea</h3><p className="mt-1.5 text-publico-tinta-media">Eliges taller, día y franja horaria con cupo garantizado. Sin llamadas ni esperas.</p></div></li>
            <li className="portada-paso relative grid grid-cols-[3rem_1fr] content-start gap-4 lg:grid-cols-1 lg:gap-3"><span aria-hidden="true" className="relative z-10 grid size-12 place-items-center rounded-full bg-publico-tinta text-lg font-bold text-publico-acento ring-[6px] ring-publico-superficie-suave">2</span><div><h3 className="pt-2.5 text-lg leading-[1.3] font-bold lg:pt-2">El taller despacha al técnico</h3><p className="mt-1.5 text-publico-tinta-media">Recibe la orden completa en su correo —dirección, referencia, enlace al mapa y detalle de la avería— y confirma desde ahí.</p><span className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-publico-linea bg-publico-superficie px-2.5 py-1.5 text-xs/[1.55] font-bold"><Icono nombre="check" className="size-3.5 text-publico-completada" />El técnico no instala ninguna aplicación ni tiene contraseña</span></div></li>
            <li className="portada-paso relative grid grid-cols-[3rem_1fr] content-start gap-4 lg:grid-cols-1 lg:gap-3"><span aria-hidden="true" className="relative z-10 grid size-12 place-items-center rounded-full bg-publico-tinta text-lg font-bold text-publico-acento ring-[6px] ring-publico-superficie-suave">3</span><div><h3 className="pt-2.5 text-lg leading-[1.3] font-bold lg:pt-2">Sigues la visita</h3><p className="mt-1.5 text-publico-tinta-media">Ves el avance en una línea de tiempo y calificas al terminar.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="py-10" aria-labelledby="publico-confianza">
        <div className={contenedor}>
          <h2 id="publico-confianza" className="sr-only">Lo que puedes dar por hecho</h2>
          <ul className="grid gap-3 min-[720px]:grid-cols-2 lg:grid-cols-5 lg:gap-5">
            {['Tarifa base visible antes de agendar', 'Calificación calculada sobre servicios reales', 'Cupo por franja horaria, no lista de espera', 'Sin registro forzoso para consultar', 'El pago se hace directamente al taller'].map((texto) => <li key={texto} className="flex items-start gap-2.5 text-sm/[1.55] text-publico-tinta-media"><Icono nombre="check" className="mt-0.5 size-5 shrink-0 text-publico-completada" />{texto}</li>)}
          </ul>
        </div>
      </section>

      <section className="pt-4 pb-16" aria-labelledby="publico-cobertura">
        <div className={`${contenedor} grid gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12`}>
          <div><h2 id="publico-cobertura" className="text-[clamp(1.5rem,1.1rem+1.4vw,2rem)] leading-[1.2] font-bold tracking-[-0.02em]">Cobertura en Trujillo</h2><p className="mt-2 text-publico-tinta-media">Los talleres atienden a domicilio en estos {DISTRITOS_TRUJILLO.length === 9 ? 'nueve' : DISTRITOS_TRUJILLO.length} distritos. El mapa llegará más adelante.</p></div>
          <ul className="grid grid-cols-2 gap-2 min-[720px]:grid-cols-3">{DISTRITOS_TRUJILLO.map((item) => <li key={item} className="flex min-h-12 items-center gap-2 rounded-lg border border-publico-linea bg-publico-superficie px-3.5 py-2 text-sm/[1.55] font-medium"><Icono nombre="pin" className="size-4 shrink-0" />{item}</li>)}</ul>
        </div>
      </section>

      <section className="pb-16" aria-labelledby="publico-cierre">
        <div className={contenedor}>
          <div className="grid items-center gap-6 rounded-2xl bg-publico-panel p-[clamp(1.5rem,4vw,3rem)] text-publico-superficie min-[720px]:grid-cols-[1fr_auto]">
            <div><h2 id="publico-cierre" className="max-w-[22ch] text-[clamp(1.5rem,1.1rem+1.4vw,2rem)] leading-[1.2] font-bold tracking-[-0.02em]">¿Se malogró algo en casa? Mira la tarifa antes de llamar.</h2><p className="mt-2 text-publico-acento-tenue">Consultar no pide registro: compara primero y agenda cuando elijas.</p></div>
            <Link to="/reservar" className={`inline-flex min-h-13 items-center justify-center gap-2 rounded-lg bg-publico-acento px-6 font-bold text-publico-tinta hover:bg-publico-acento-vivo ${focoAmarillo}`}>Buscar un taller <Icono nombre="flecha" className="size-5" /></Link>
          </div>
        </div>
      </section>
    </>
  )
}
