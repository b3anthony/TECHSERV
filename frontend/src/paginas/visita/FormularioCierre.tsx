import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { AreaTexto } from '../../componentes/publico/AreaTexto.tsx'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { CampoTexto } from '../../componentes/publico/CampoTexto.tsx'
import { soles } from '../panel/formato.ts'
import type { RepuestoDisponible, VistaVisita } from './tiposVisita.ts'

interface FormularioCierreProps {
  token: string
  visita: VistaVisita
  alTerminar: (nueva: VistaVisita) => void
}

/**
 * «Terminé el trabajo»: qué se hizo, cuánto es la mano de obra y qué repuestos
 * se usaron. El total se ve en vivo, grande, porque es lo que va a cobrar.
 */
export function FormularioCierre({ token, visita, alTerminar }: FormularioCierreProps): ReactNode {
  const garantia = visita.garantia != null
  const [diagnostico, setDiagnostico] = useState('')
  const [manoObra, setManoObra] = useState(garantia ? '0' : visita.tarifaSugerida != null ? String(visita.tarifaSugerida) : '')
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [buscar, setBuscar] = useState('')
  const [errores, setErrores] = useState<{ diagnostico?: string; manoObra?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const manoObraNum = garantia ? 0 : Number(manoObra)
  const usados = visita.catalogo.filter((r) => (cantidades[r.id] ?? 0) > 0)
  const subtotalRepuesto = (r: RepuestoDisponible) => r.precio * Math.max(0, (cantidades[r.id] ?? 0) - (garantia ? r.cantidadCubierta : 0))
  const totalRepuestos = usados.reduce((s, r) => s + subtotalRepuesto(r), 0)
  const total = (Number.isFinite(manoObraNum) && manoObra.trim() !== '' ? manoObraNum : 0) + totalRepuestos
  const filtro = buscar.trim().toLowerCase()
  const visibles = visita.catalogo.filter((r) => r.nombre.toLowerCase().includes(filtro))

  function cambiar(id: number, delta: number, stock: number): void {
    setCantidades((c) => {
      const nueva = Math.min(stock, Math.max(0, (c[id] ?? 0) + delta))
      return { ...c, [id]: nueva }
    })
  }

  async function enviar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    const e: typeof errores = {}
    if (!diagnostico.trim()) e.diagnostico = 'Cuenta en una frase qué hiciste'
    if (!garantia && (manoObra.trim() === '' || !Number.isFinite(manoObraNum) || manoObraNum < 0)) e.manoObra = 'Escribe cuánto es la mano de obra'
    setErrores(e)
    setError(null)
    if (Object.keys(e).length > 0) return

    setEnviando(true)
    try {
      const res = await api.post<VistaVisita>(`/visita/${token}/terminar`, {
        diagnostico: diagnostico.trim(),
        precioManoObra: Math.round(manoObraNum * 100) / 100,
        repuestos: usados.map((r) => ({ repuestoId: r.id, cantidad: cantidades[r.id] })),
      })
      alTerminar(res.data)
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form noValidate onSubmit={enviar} aria-labelledby="titulo-cierre" className="grid">
      <h2 id="titulo-cierre" className="text-xl font-bold">¿Terminaste? Cierra el trabajo</h2>
      <p className="mt-1 mb-5 text-sm text-publico-tinta-media">{garantia ? 'Atención por garantía: sin cobro de visita ni mano de obra' : 'Con esto se calcula lo que le cobras al cliente.'}</p>

      {error && <Aviso tipo="error" className="mb-4">{error}</Aviso>}

      <AreaTexto
        id="cierre-diagnostico"
        etiqueta="¿Qué encontraste y qué hiciste?"
        value={diagnostico}
        onChange={(e) => setDiagnostico(e.target.value)}
        error={errores.diagnostico}
        max={2000}
        rows={3}
        placeholder="Ejemplo: la faja estaba rota; la cambié y probé el centrifugado."
      />

      <CampoTexto
        id="cierre-mano-obra"
        etiqueta="Mano de obra (S/)"
        tipo="number"
        inputMode="decimal"
        min="0"
        step="0.50"
        value={garantia ? '0' : manoObra}
        readOnly={garantia}
        onChange={(e) => setManoObra(e.target.value)}
        error={errores.manoObra}
        ayuda={garantia ? 'La mano de obra está cubierta por la garantía de la reparación original.' : visita.tarifaSugerida != null ? `La tarifa del taller para este servicio es ${soles(visita.tarifaSugerida)}.` : undefined}
      />

      <fieldset className="mb-5">
        <legend className="mb-1 text-sm font-bold">¿Usaste repuestos?</legend>
        <p className="mb-3 text-sm text-publico-tinta-media">Toca + en cada uno que pusiste. Si no usaste ninguno, déjalo así.</p>
        {usados.length > 0 && <p className="mb-3 text-sm text-publico-tinta-media">Sube una foto del repuesto instalado: queda guardada en la garantía del cliente.</p>}
        {visita.catalogo.length === 0 ? (
          <p className="rounded-xl bg-publico-lienzo px-4 py-3 text-sm text-publico-tinta-media">El taller no tiene repuestos en su catálogo.</p>
        ) : (
          <>
            {visita.catalogo.length > 6 && (
              <div className="relative mb-3">
                <label htmlFor="cierre-buscar" className="sr-only">Buscar repuesto</label>
                <Icono nombre="lupa" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-publico-tinta-suave" />
                <input id="cierre-buscar" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar repuesto" className={`min-h-12 w-full rounded-xl border border-publico-linea-fuerte bg-publico-superficie pr-3 pl-10 text-base ${focoClaro}`} />
              </div>
            )}
            <ul className="grid gap-2">
              {visibles.map((r) => {
                const n = cantidades[r.id] ?? 0
                const agotado = r.stock === 0
                return (
                  <li key={r.id} className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${n > 0 ? 'border-publico-acento-hondo bg-publico-acento-tenue' : 'border-publico-linea bg-publico-superficie'}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{r.nombre}</p>
                      <p className="text-xs text-publico-tinta-media">{soles(r.precio)} · {agotado ? 'sin stock' : `quedan ${r.stock}`}</p>
                      {garantia && r.cantidadCubierta > 0 && <p className="mt-1 text-xs font-bold text-publico-chip-texto">Hasta {r.cantidadCubierta} {r.cantidadCubierta === 1 ? 'unidad cubierta' : 'unidades cubiertas'}; el exceso se cobra.</p>}
                    </div>
                    <div role="group" aria-label={`Cantidad de ${r.nombre}`} className="flex items-center gap-1">
                      <button type="button" onClick={() => cambiar(r.id, -1, r.stock)} disabled={n === 0} className={`grid size-11 place-items-center rounded-lg border border-publico-linea-fuerte bg-publico-superficie disabled:opacity-40 ${focoClaro}`}>
                        <Icono nombre="menos" className="size-4" /><span className="sr-only">Quitar uno de {r.nombre}</span>
                      </button>
                      <output aria-live="polite" className="w-8 text-center text-base font-bold tabular-nums">{n}</output>
                      <button type="button" onClick={() => cambiar(r.id, 1, r.stock)} disabled={n >= r.stock} className={`grid size-11 place-items-center rounded-lg border border-publico-tinta bg-publico-tinta text-publico-acento disabled:opacity-40 ${focoClaro}`}>
                        <Icono nombre="mas" className="size-4" /><span className="sr-only">Añadir uno de {r.nombre}</span>
                      </button>
                    </div>
                  </li>
                )
              })}
              {visibles.length === 0 && <li className="px-1 text-sm text-publico-tinta-media">Ningún repuesto se llama así.</li>}
            </ul>
          </>
        )}
      </fieldset>

      <div className="rounded-2xl bg-publico-panel p-5 text-publico-superficie">
        <dl className="grid gap-1.5 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-publico-superficie/70">Mano de obra</dt><dd className="tabular-nums">{soles(Number.isFinite(manoObraNum) ? manoObraNum : 0)}</dd></div>
          {usados.map((r) => (
            <div key={r.id} className="flex justify-between gap-3"><dt className="min-w-0 text-publico-superficie/70">{cantidades[r.id]} × {r.nombre}{garantia && r.cantidadCubierta > 0 && <span className="block text-xs">{Math.min(cantidades[r.id] ?? 0, r.cantidadCubierta)} sin cobro por garantía</span>}</dt><dd className="shrink-0 tabular-nums">{soles(subtotalRepuesto(r))}</dd></div>
          ))}
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-publico-superficie/15 pt-3">
            <dt className="font-bold">Total a cobrar</dt>
            <dd aria-live="polite" className="text-3xl font-bold text-publico-acento tabular-nums">{soles(total)}</dd>
          </div>
        </dl>
      </div>

      <Boton type="submit" cargando={enviando} className="mt-4 min-h-14 w-full text-base">
        <Icono nombre="check" className="size-5" /> {garantia && total === 0 ? 'Terminar trabajo sin cobro' : `Terminar trabajo por ${soles(total)}`}
      </Boton>
    </form>
  )
}
