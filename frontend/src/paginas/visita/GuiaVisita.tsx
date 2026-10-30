import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Icono } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import type { FuenteEquipo, ProbabilidadFalla } from '../panel/tiposPanel.ts'
import type { GuiaTecnico } from './tiposVisita.ts'

const FUENTE: Record<FuenteEquipo, string> = {
  FOTO: 'leído en la foto',
  DESCRIPCION: 'según el cliente',
  NO_IDENTIFICADO: 'modelo sin identificar',
}

const PROBABILIDAD: Record<ProbabilidadFalla, { texto: string; clase: string }> = {
  ALTA: { texto: 'Más probable', clase: 'bg-publico-acento text-publico-tinta' },
  MEDIA: { texto: 'Posible', clase: 'bg-publico-acento-tenue text-publico-chip-texto' },
  BAJA: { texto: 'Menos probable', clase: 'bg-publico-superficie-suave text-publico-tinta-media' },
}

/** Lo marcado se recuerda en este teléfono: si recarga la página, no lo pierde. */
function leerMarcados(clave: string): string[] {
  try {
    const crudo = localStorage.getItem(clave)
    const valor: unknown = crudo ? JSON.parse(crudo) : []
    return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === 'string') : []
  } catch {
    // Sin almacenamiento (modo privado): la lista funciona igual, solo no se recuerda.
    return []
  }
}

/**
 * El diagnóstico de la IA, resumido para el técnico, en el orden en que lo
 * necesita: qué llevar, qué cuidar y qué revisar primero.
 */
export function GuiaVisita({ guia, codigo }: { guia: GuiaTecnico; codigo: string }): ReactNode {
  const base = useId()
  const clave = `techserv.guia.${codigo}`
  const [marcados, setMarcados] = useState<string[]>(() => leerMarcados(clave))

  function alternar(item: string): void {
    setMarcados((previos) => {
      const siguientes = previos.includes(item) ? previos.filter((x) => x !== item) : [...previos, item]
      try {
        localStorage.setItem(clave, JSON.stringify(siguientes))
      } catch {
        // Sin almacenamiento: se marca igual, solo no sobrevive a una recarga.
      }
      return siguientes
    })
  }

  const llevar = [
    ...guia.repuestos.map((r) => `repuesto:${r.nombre}`),
    ...guia.herramientas.map((h) => `herramienta:${h}`),
  ]
  const listos = llevar.filter((item) => marcados.includes(item)).length
  const equipo = guia.equipo
  const nombreEquipo = [equipo?.tipo, equipo?.marca, equipo?.modelo].filter(Boolean).join(' · ')
  let paso = 0

  return (
    <section aria-labelledby={`${base}-titulo`} className="rounded-2xl border border-publico-linea bg-publico-superficie shadow-sm shadow-publico-tinta/5">
      <div className="border-b border-publico-linea p-5">
        <h2 id={`${base}-titulo`} className="flex items-center gap-2 text-sm font-bold text-publico-tinta-media">
          <Icono nombre="lista" className="size-4" /> Guía para la visita
        </h2>
        {nombreEquipo && (
          <p className="mt-2 text-lg font-bold">
            {nombreEquipo}
            {equipo && <>{' '}<span className="ml-1 text-sm font-normal text-publico-tinta-media">({FUENTE[equipo.fuente]})</span></>}
          </p>
        )}
      </div>

      {/* ─── 1. Qué llevar ─── */}
      {(llevar.length > 0 || guia.quizaFalten.length > 0) && (
        <div className="border-b border-publico-linea p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-bold">{++paso}. Qué llevar</h3>
            {llevar.length > 0 && <p aria-live="polite" className="text-sm text-publico-tinta-media tabular-nums">{listos} de {llevar.length} listos</p>}
          </div>

          {guia.repuestos.length > 0 && (
            <ListaMarcable titulo="Repuestos del taller" items={guia.repuestos.map((r) => ({
              clave: `repuesto:${r.nombre}`,
              texto: r.nombre,
              aviso: r.sinStock ? 'Sin stock en el taller' : undefined,
            }))} marcados={marcados} alternar={alternar} />
          )}
          {guia.herramientas.length > 0 && (
            <ListaMarcable titulo="Herramientas" items={guia.herramientas.map((h) => ({ clave: `herramienta:${h}`, texto: h }))} marcados={marcados} alternar={alternar} />
          )}
          {guia.quizaFalten.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-bold">Podría hacer falta</h4>
              <p className="text-xs text-publico-tinta-suave">El taller no lo tiene. Consúltalo antes de salir.</p>
              <ul className="mt-1.5 grid gap-1 text-sm">
                {guia.quizaFalten.map((nombre) => (
                  <li key={nombre} className="flex gap-2"><span aria-hidden="true" className="text-publico-tinta-suave">•</span>{nombre}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ─── 2. Antes de empezar ─── */}
      {guia.precauciones.length > 0 && (
        <div className="border-b border-publico-linea p-5">
          <h3 className="text-base font-bold">{++paso}. Antes de empezar</h3>
          <ul className="mt-2 grid gap-2 rounded-xl border-l-4 border-publico-pendiente bg-publico-lienzo px-4 py-3 text-sm">
            {guia.precauciones.map((p) => (
              <li key={p} className="flex gap-2">
                <Icono nombre="pausa" className="mt-0.5 size-4 shrink-0 text-publico-pendiente" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── 3. Qué revisar primero ─── */}
      {guia.revisar.length > 0 && (
        <div className="border-b border-publico-linea p-5">
          <h3 className="text-base font-bold">{++paso}. Qué revisar primero</h3>
          <ol className="mt-3 grid gap-3">
            {guia.revisar.map((r, i) => (
              <li key={r.falla} className="flex gap-3">
                <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-publico-tinta text-sm font-bold text-publico-superficie tabular-nums">{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-bold">
                    {r.falla}
                    <span className={`ml-2 inline-block rounded-md px-1.5 py-0.5 align-middle text-xs font-bold ${PROBABILIDAD[r.probabilidad].clase}`}>{PROBABILIDAD[r.probabilidad].texto}</span>
                  </p>
                  {r.queHacer && <p className="mt-1 text-sm text-publico-tinta-media">{r.queHacer}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="px-5 py-3 text-xs text-publico-tinta-suave">
        Sugerencia de la IA a partir de las fotos y lo que contó el cliente. Confírmala al revisar el equipo.
      </p>
    </section>
  )
}

function ListaMarcable({ titulo, items, marcados, alternar }: {
  titulo: string
  items: { clave: string; texto: string; aviso?: string }[]
  marcados: string[]
  alternar: (clave: string) => void
}): ReactNode {
  const base = useId()
  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-bold">{titulo}</legend>
      <ul className="mt-1 grid gap-1">
        {items.map((item, i) => {
          const id = `${base}-${i}`
          const hecho = marcados.includes(item.clave)
          return (
            <li key={item.clave}>
              <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-sm hover:bg-publico-superficie-suave">
                <input id={id} type="checkbox" checked={hecho} onChange={() => alternar(item.clave)} className={`size-5 shrink-0 rounded accent-publico-tinta ${focoClaro}`} />
                <span className={hecho ? 'text-publico-tinta-suave line-through' : ''}>
                  {item.texto}
                  {item.aviso && <span className="ml-2 text-xs font-bold text-publico-peligro">{item.aviso}</span>}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
