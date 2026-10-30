import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icono } from '../../../componentes/Icono.tsx'
import { focoClaro } from '../../../componentes/marco/foco.ts'
import type { TecnicoDisponible } from '../tiposPanel.ts'
import { fechaCorta } from '../datos.ts'
import { CUANDO, hayFiltros } from './filtros.ts'
import type { Cuando, VistaBandeja } from './filtros.ts'

/** Cuánto se espera tras la última tecla antes de buscar. */
const ESPERA_MS = 300

interface BarraFiltrosProps {
  vista: VistaBandeja
  tecnicos: TecnicoDisponible[]
  /** Cambia la vista. `reemplazar`: sin dejar una entrada por tecla en el historial. */
  cambiar: (cambios: Partial<VistaBandeja>, reemplazar?: boolean) => void
}

const campo = `min-h-11 w-full rounded-xl border border-publico-linea-fuerte bg-publico-superficie px-3 text-sm text-publico-tinta hover:border-publico-tinta-suave ${focoClaro}`

export function BarraFiltros({ vista, tecnicos, cambiar }: BarraFiltrosProps): ReactNode {
  const base = useId()
  const [texto, setTexto] = useState(vista.q)
  const buscador = useRef<HTMLInputElement>(null)

  // Si la URL cambia por fuera (atrás, «Limpiar filtros»), el campo la sigue.
  const [qAnterior, setQAnterior] = useState(vista.q)
  // (Si solo difieren en espacios, es lo que se está escribiendo: no se toca.)
  if (vista.q !== qAnterior) {
    setQAnterior(vista.q)
    if (texto.trim() !== vista.q.trim()) setTexto(vista.q)
  }

  useEffect(() => {
    if (texto.trim() === vista.q.trim()) return
    const espera = window.setTimeout(() => cambiar({ q: texto, pagina: 1 }, true), ESPERA_MS)
    return () => window.clearTimeout(espera)
  }, [texto, vista.q, cambiar])

  const tecnicoElegido = tecnicos.find((t) => String(t.id) === vista.tecnico)
  const fichas: { clave: string; texto: string; quitar: () => void }[] = []
  if (vista.q.trim()) fichas.push({ clave: 'q', texto: `«${vista.q.trim()}»`, quitar: () => { setTexto(''); cambiar({ q: '', pagina: 1 }) } })
  if (vista.tecnico) fichas.push({ clave: 'tecnico', texto: vista.tecnico === 'sin' ? 'Sin técnico' : (tecnicoElegido?.nombreCompleto ?? 'Técnico'), quitar: () => cambiar({ tecnico: '', pagina: 1 }) })
  if (vista.cuando) fichas.push({ clave: 'cuando', texto: textoCuando(vista), quitar: () => cambiar({ cuando: '', desde: '', hasta: '', pagina: 1 }) })

  const rangoAlReves = vista.cuando === 'rango' && vista.desde && vista.hasta && vista.desde > vista.hasta

  return (
    <section aria-label="Buscar y filtrar órdenes" className="rounded-2xl border border-publico-linea bg-publico-superficie p-3 shadow-sm shadow-publico-tinta/5 sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        {/* ─── Buscador ─── */}
        <div role="search">
          <label htmlFor={`${base}-q`} className="sr-only">Buscar órdenes</label>
          <div className="relative">
            <Icono nombre="lupa" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-publico-tinta-suave" />
            <input
              ref={buscador}
              id={`${base}-q`}
              type="search"
              value={texto}
              maxLength={80}
              autoComplete="off"
              spellCheck={false}
              placeholder="Busca por código, cliente, distrito o falla"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape' && texto) { e.preventDefault(); setTexto('') } }}
              className={`min-h-12 w-full rounded-xl border-2 border-publico-linea-fuerte bg-publico-lienzo pr-12 pl-12 text-base text-publico-tinta placeholder:text-publico-tinta-suave hover:border-publico-tinta-suave focus:border-publico-tinta focus:bg-publico-superficie [&::-webkit-search-cancel-button]:hidden ${focoClaro}`}
            />
            {texto && (
              <button
                type="button"
                onClick={() => { setTexto(''); cambiar({ q: '', pagina: 1 }); buscador.current?.focus() }}
                className={`absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-publico-tinta-media hover:bg-publico-superficie-suave hover:text-publico-tinta ${focoClaro}`}
              >
                <Icono nombre="cerrar" className="size-4" />
                <span className="sr-only">Borrar la búsqueda</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── Técnico y orden ─── */}
        <div className="grid grid-cols-2 gap-3 lg:w-[26rem]">
          <div>
            <label htmlFor={`${base}-tecnico`} className="mb-1 block text-xs font-bold text-publico-tinta-media">Técnico</label>
            <select id={`${base}-tecnico`} value={vista.tecnico} onChange={(e) => cambiar({ tecnico: e.target.value, pagina: 1 })} className={campo}>
              <option value="">Todos</option>
              <option value="sin">Sin técnico</option>
              {tecnicos.map((t) => <option key={t.id} value={String(t.id)}>{t.nombreCompleto}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${base}-orden`} className="mb-1 block text-xs font-bold text-publico-tinta-media">Ordenar</label>
            <select id={`${base}-orden`} value={vista.proximas ? 'proximas' : ''} onChange={(e) => cambiar({ proximas: e.target.value === 'proximas', pagina: 1 })} className={campo}>
              <option value="">Más recientes</option>
              <option value="proximas">Más próximas</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Fecha de la visita ─── */}
      <fieldset className="mt-3">
        <legend className="mb-1.5 text-xs font-bold text-publico-tinta-media">Fecha de la visita</legend>
        <div className="flex flex-wrap items-center gap-2">
          {CUANDO.map((c) => {
            const activo = vista.cuando === c.valor
            return (
              <label
                key={c.valor || 'todas'}
                className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-sm font-bold has-[:focus]:ring-2 has-[:focus]:ring-publico-acento has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-publico-superficie motion-safe:transition-colors ${
                  activo ? 'border-publico-tinta bg-publico-tinta text-publico-superficie' : 'border-publico-linea-fuerte bg-publico-superficie text-publico-tinta-media hover:border-publico-tinta-suave hover:text-publico-tinta'
                }`}
              >
                <input type="radio" name={`${base}-cuando`} value={c.valor} checked={activo} onChange={() => cambiar({ cuando: c.valor as Cuando, pagina: 1 })} className="sr-only" />
                {c.valor === 'rango' && <Icono nombre="calendario" className="size-4" />}
                {c.texto}
              </label>
            )
          })}
        </div>
        {vista.cuando === 'rango' && (
          <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${base}-desde`} className="mb-1 block text-xs font-bold text-publico-tinta-media">Desde</label>
              <input id={`${base}-desde`} type="date" value={vista.desde} max={vista.hasta || undefined} onChange={(e) => cambiar({ desde: e.target.value, pagina: 1 })} aria-invalid={rangoAlReves || undefined} aria-describedby={rangoAlReves ? `${base}-rango-error` : undefined} className={campo} />
            </div>
            <div>
              <label htmlFor={`${base}-hasta`} className="mb-1 block text-xs font-bold text-publico-tinta-media">Hasta</label>
              <input id={`${base}-hasta`} type="date" value={vista.hasta} min={vista.desde || undefined} onChange={(e) => cambiar({ hasta: e.target.value, pagina: 1 })} aria-invalid={rangoAlReves || undefined} aria-describedby={rangoAlReves ? `${base}-rango-error` : undefined} className={campo} />
            </div>
            <p id={`${base}-rango-error`} role="alert" className="col-span-2 text-sm font-bold text-publico-peligro empty:hidden">
              {rangoAlReves ? '«Desde» tiene que ser antes que «Hasta».' : ''}
            </p>
          </div>
        )}
      </fieldset>

      {/* ─── Filtros activos ─── */}
      {hayFiltros(vista) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-publico-linea pt-3">
          <span className="text-xs font-bold text-publico-tinta-suave">Filtrando por:</span>
          {fichas.map((f) => (
            <button
              key={f.clave}
              type="button"
              onClick={f.quitar}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-publico-acento-tenue py-1 pr-2 pl-3 text-sm font-bold text-publico-chip-texto hover:bg-publico-acento ${focoClaro}`}
            >
              {f.texto}
              <Icono nombre="cerrar" className="size-3.5" />
              <span className="sr-only">: quitar este filtro</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setTexto(''); cambiar({ q: '', tecnico: '', cuando: '', desde: '', hasta: '', pagina: 1 }) }}
            className={`ml-auto inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-bold text-publico-tinta underline decoration-publico-acento decoration-2 underline-offset-4 hover:decoration-publico-acento-hondo ${focoClaro}`}
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </section>
  )
}

function textoCuando(v: VistaBandeja): string {
  if (v.cuando !== 'rango') return CUANDO.find((c) => c.valor === v.cuando)?.texto ?? ''
  if (v.desde && v.hasta) return v.desde === v.hasta ? `El ${fechaCorta(v.desde)}` : `Del ${fechaCorta(v.desde)} al ${fechaCorta(v.hasta)}`
  if (v.desde) return `Desde el ${fechaCorta(v.desde)}`
  if (v.hasta) return `Hasta el ${fechaCorta(v.hasta)}`
  return 'Elegir fechas'
}
