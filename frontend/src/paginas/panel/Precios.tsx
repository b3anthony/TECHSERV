import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import type { Especialidad } from '../../tipos.ts'
import { CabeceraPagina, EsqueletoLista, ErrorCarga, TarjetaPanel } from './comun.tsx'
import { ICONO_ESPECIALIDAD, botonIcono, contenedorPanel, soles } from './formato.ts'
import { useTarifas } from './datos.ts'
import { DialogoRepuesto } from './DialogoRepuesto.tsx'
import type { RepuestoCatalogo } from './tiposPanel.ts'

/** Con estas unidades o menos, el repuesto se marca como «quedan pocos». */
const POCO_STOCK = 5

type Mensaje = { tipo: 'exito' | 'error'; texto: string } | null

export function Precios(): ReactNode {
  const [mensaje, setMensaje] = useState<Mensaje>(null)
  return (
    <div className={contenedorPanel}>
      <CabeceraPagina titulo="Precios" detalle="Lo que cobras por cada visita y los repuestos que vendes. Los clientes ven la tarifa base al reservar." />
      <div aria-live="polite">{mensaje && <Aviso tipo={mensaje.tipo} className="mb-4">{mensaje.texto}</Aviso>}</div>
      <div className="grid gap-6">
        <Tarifas avisar={setMensaje} />
        <Repuestos avisar={setMensaje} />
      </div>
    </div>
  )
}

/* ─── Tarifas por servicio ─── */

function Tarifas({ avisar }: { avisar: (m: Mensaje) => void }): ReactNode {
  const tarifas = useTarifas()
  const [editando, setEditando] = useState<Especialidad | null>(null)

  return (
    <TarjetaPanel titulo="Tarifa base por visita" icono="etiqueta">
      <p className="-mt-2 mb-4 text-sm text-publico-tinta-media">Es lo mínimo que cobras por ir al domicilio. Los repuestos y la mano de obra extra se suman al cerrar cada orden. Cada taller atiende una sola especialidad.</p>
      {tarifas.isPending ? (
        <EsqueletoLista filas={1} alto="h-24" etiqueta="Cargando tarifa…" />
      ) : tarifas.error ? (
        <ErrorCarga mensaje={mensajeDeError(tarifas.error)} reintentar={() => void tarifas.refetch()} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tarifas.data.map((t) => (
            <li key={t.especialidad} className="rounded-xl border border-publico-linea bg-publico-lienzo p-4">
              <p className="flex items-center gap-2 text-sm font-bold">
                <span className="grid size-8 place-items-center rounded-lg bg-publico-panel text-publico-acento"><Icono nombre={ICONO_ESPECIALIDAD[t.especialidad]} className="size-4" /></span>
                {t.titulo}
              </p>
              {editando === t.especialidad ? (
                <EditorTarifa
                  especialidad={t.especialidad}
                  titulo={t.titulo}
                  inicial={t.tarifaBase}
                  alTerminar={(m) => { setEditando(null); if (m) avisar(m) }}
                />
              ) : (
                <div className="mt-3 flex items-end justify-between gap-2">
                  <p><span className="text-3xl font-bold tabular-nums">{soles(t.tarifaBase)}</span><span className="block text-xs text-publico-tinta-suave">por visita</span></p>
                  <button type="button" onClick={() => { avisar(null); setEditando(t.especialidad) }} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-publico-linea-fuerte bg-publico-superficie px-3 text-sm font-bold hover:bg-publico-superficie-suave ${focoClaro}`}>
                    <Icono nombre="lapiz" className="size-4" /> Cambiar<span className="sr-only"> la tarifa de {t.titulo}</span>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </TarjetaPanel>
  )
}

function EditorTarifa({ especialidad, titulo, inicial, alTerminar }: {
  especialidad: Especialidad
  titulo: string
  inicial: number | null
  alTerminar: (m: Mensaje) => void
}): ReactNode {
  const queryClient = useQueryClient()
  const [valor, setValor] = useState(inicial != null ? String(inicial) : '')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const id = `tarifa-${especialidad}`

  async function guardar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    const n = Number(valor)
    if (valor.trim() === '' || !Number.isFinite(n) || n <= 0 || n > 9999.99) {
      setError('Escribe un monto entre S/ 0.01 y S/ 9,999.99')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await api.put(`/panel/tarifas/${especialidad}`, { tarifaBase: Math.round(n * 100) / 100 })
      await queryClient.invalidateQueries({ queryKey: ['panel', 'tarifas'] })
      alTerminar({ tipo: 'exito', texto: `${titulo}: la visita ahora cuesta ${soles(n)}.` })
    } catch (err) {
      setError(mensajeDeError(err))
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="mt-3 grid gap-2">
      <label htmlFor={id} className="text-sm font-bold">Tarifa por visita (S/)</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0.01"
        max="9999.99"
        step="0.50"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-error`}
        autoFocus
        className={`min-h-12 w-full rounded-lg border bg-publico-superficie px-3 text-lg font-bold tabular-nums ${error ? 'border-publico-peligro' : 'border-publico-linea-fuerte'} ${focoClaro}`}
      />
      <p id={`${id}-error`} role="alert" className="min-h-5 text-xs font-bold text-publico-peligro">{error ?? ''}</p>
      <div className="flex gap-2">
        <Boton type="button" variante="secundario" className="flex-1 px-2" onClick={() => alTerminar(null)} disabled={guardando}>Cancelar</Boton>
        <Boton type="submit" className="flex-1 px-2" cargando={guardando}>Guardar</Boton>
      </div>
    </form>
  )
}

/* ─── Repuestos ─── */

function Repuestos({ avisar }: { avisar: (m: Mensaje) => void }): ReactNode {
  const queryClient = useQueryClient()
  const repuestos = useQuery<RepuestoCatalogo[]>({
    queryKey: ['panel', 'repuestos'],
    queryFn: async () => (((await api.get('/panel/repuestos')).data as RepuestoCatalogo[]) ?? []).filter((r) => r.activo),
  })
  const [busqueda, setBusqueda] = useState('')
  const [dialogo, setDialogo] = useState<{ abierto: boolean; repuesto: RepuestoCatalogo | null; vez: number }>({ abierto: false, repuesto: null, vez: 0 })
  const [confirmar, setConfirmar] = useState<number | null>(null)
  const [quitando, setQuitando] = useState(false)

  const abrir = (repuesto: RepuestoCatalogo | null) => {
    avisar(null)
    setDialogo((d) => ({ abierto: true, repuesto, vez: d.vez + 1 }))
  }

  async function quitar(r: RepuestoCatalogo): Promise<void> {
    setQuitando(true)
    try {
      await api.delete(`/panel/repuestos/${r.id}`)
      await queryClient.invalidateQueries({ queryKey: ['panel', 'repuestos'] })
      setConfirmar(null)
      avisar({ tipo: 'exito', texto: `Quitaste «${r.nombre}» del catálogo.` })
    } catch (err) {
      avisar({ tipo: 'error', texto: mensajeDeError(err) })
    } finally {
      setQuitando(false)
    }
  }

  const texto = busqueda.trim().toLowerCase()
  const lista = (repuestos.data ?? []).filter((r) => !texto || `${r.nombre} ${r.descripcion ?? ''}`.toLowerCase().includes(texto))
  const pocos = (repuestos.data ?? []).filter((r) => r.stock <= POCO_STOCK).length

  return (
    <TarjetaPanel
      titulo="Repuestos"
      icono="herramienta"
      accion={<Boton type="button" onClick={() => abrir(null)} className="px-3 sm:px-5"><Icono nombre="mas" className="size-4" /> <span className="max-sm:sr-only">Añadir</span> repuesto</Boton>}
    >
      {repuestos.isPending ? (
        <EsqueletoLista filas={4} alto="h-14" etiqueta="Cargando repuestos…" />
      ) : repuestos.error ? (
        <ErrorCarga mensaje={mensajeDeError(repuestos.error)} reintentar={() => void repuestos.refetch()} />
      ) : repuestos.data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-publico-linea-fuerte px-4 py-8 text-center text-sm text-publico-tinta-media">
          Tu catálogo está vacío. Añade los repuestos que sueles usar para cobrarlos al cerrar una orden.
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-80">
              <label htmlFor="buscar-repuesto" className="sr-only">Buscar repuesto</label>
              <Icono nombre="lupa" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-publico-tinta-suave" />
              <input id="buscar-repuesto" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar repuesto" className={`min-h-11 w-full rounded-lg border border-publico-linea-fuerte bg-publico-superficie pr-3 pl-9 text-base placeholder:text-publico-tinta-suave ${focoClaro}`} />
            </div>
            <p className="text-sm text-publico-tinta-media">
              {repuestos.data.length} en el catálogo
              {pocos > 0 && <> · <b className="text-publico-pendiente">{pocos} con poco stock</b></>}
            </p>
          </div>

          {lista.length === 0 ? (
            <p className="py-6 text-center text-sm text-publico-tinta-media">Ningún repuesto coincide con «{busqueda}».</p>
          ) : (
            <ul className="divide-y divide-publico-linea border-y border-publico-linea">
              {lista.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_7rem_8rem_auto]">
                    <div className="min-w-0">
                      <p className="font-bold">{r.nombre}</p>
                      {r.descripcion && <p className="truncate text-sm text-publico-tinta-suave">{r.descripcion}</p>}
                    </div>
                    <p className="text-right font-bold tabular-nums sm:text-left">{soles(r.precio)}</p>
                    <p className="text-sm">
                      {r.stock <= POCO_STOCK ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-publico-acento-tenue px-2 py-0.5 font-bold text-publico-chip-texto">
                          <span aria-hidden="true" className="size-1.5 rounded-2xl bg-publico-pendiente" />
                          {r.stock === 0 ? 'Agotado' : `Quedan ${r.stock}`}
                        </span>
                      ) : (
                        <span className="text-publico-tinta-media tabular-nums">{r.stock} en stock</span>
                      )}
                    </p>
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => abrir(r)} aria-label={`Editar ${r.nombre}`} className={botonIcono}><Icono nombre="lapiz" className="size-4" /></button>
                      <button type="button" onClick={() => setConfirmar(r.id)} aria-label={`Quitar ${r.nombre} del catálogo`} className={`${botonIcono} hover:text-publico-peligro`}><Icono nombre="cerrar" className="size-4" /></button>
                    </div>
                  </div>
                  {confirmar === r.id && (
                    <div role="group" aria-label={`Confirmar quitar ${r.nombre}`} className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-publico-peligro/40 p-3 text-sm">
                      <p>¿Quitar «{r.nombre}»? Ya no se podrá elegir al cerrar órdenes.</p>
                      <div className="flex gap-2">
                        <Boton type="button" variante="secundario" onClick={() => setConfirmar(null)} disabled={quitando}>No</Boton>
                        <Boton type="button" variante="peligro" onClick={() => void quitar(r)} cargando={quitando}>Sí, quitar</Boton>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <DialogoRepuesto
        key={dialogo.vez}
        abierto={dialogo.abierto}
        repuesto={dialogo.repuesto}
        alCerrar={() => setDialogo((d) => ({ ...d, abierto: false }))}
        alGuardar={(n) => avisar({ tipo: 'exito', texto: dialogo.repuesto ? `Guardamos los cambios de «${n}».` : `«${n}» ya está en tu catálogo.` })}
      />
    </TarjetaPanel>
  )
}
