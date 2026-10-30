import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { formatearMomento } from '../portal/fechas.ts'
import { EsqueletoLista, TarjetaPanel } from './comun.tsx'
import { soles } from './formato.ts'
import type { DiagnosticoIa, FuenteEquipo, ProbabilidadFalla } from './tiposPanel.ts'

const FUENTE: Record<FuenteEquipo, string> = {
  FOTO: 'Leído en la foto',
  DESCRIPCION: 'Según la descripción del cliente',
  NO_IDENTIFICADO: 'No se pudo identificar el modelo',
}

const PROBABILIDAD: Record<ProbabilidadFalla, { texto: string; clase: string }> = {
  ALTA: { texto: 'Probabilidad alta', clase: 'bg-publico-acento text-publico-tinta' },
  MEDIA: { texto: 'Probabilidad media', clase: 'bg-publico-acento-tenue text-publico-chip-texto' },
  BAJA: { texto: 'Probabilidad baja', clase: 'bg-publico-superficie-suave text-publico-tinta-media' },
}

/** Lo que la IA cree que falla, a partir de las fotos y lo que contó el cliente. Solo lo ve el taller. */
export function TarjetaDiagnosticoIa({ ordenId }: { ordenId: number }): ReactNode {
  const queryClient = useQueryClient()
  const clave = ['panel', 'diagnostico-ia', ordenId]
  const [enviando, setEnviando] = useState(false)
  const [errorRehacer, setErrorRehacer] = useState<string | null>(null)

  const { data: diagnostico, isLoading: cargando, error } = useQuery<DiagnosticoIa>({
    queryKey: clave,
    queryFn: async () => {
      const res = await api.get(`/panel/ordenes/${ordenId}/diagnostico-ia`)
      return res.data as DiagnosticoIa
    },
    // Mientras la IA trabaja, se vuelve a preguntar; cuando termina, no.
    refetchInterval: (query) => (query.state.data?.estado === 'PENDIENTE' ? 4_000 : false),
  })

  async function volverAAnalizar(): Promise<void> {
    setEnviando(true)
    setErrorRehacer(null)
    try {
      const res = await api.post(`/panel/ordenes/${ordenId}/diagnostico-ia`)
      queryClient.setQueryData(clave, res.data as DiagnosticoIa)
      await queryClient.invalidateQueries({ queryKey: clave })
    } catch (e) {
      setErrorRehacer(mensajeDeError(e))
    } finally {
      setEnviando(false)
    }
  }

  const pendiente = diagnostico?.estado === 'PENDIENTE'
  const puedeRehacer = diagnostico != null && diagnostico.estado !== 'SIN_CONFIGURAR'
  const accion = puedeRehacer && (
    <button
      type="button"
      onClick={volverAAnalizar}
      disabled={pendiente || enviando}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-publico-linea-fuerte bg-publico-superficie px-3 text-sm font-bold hover:bg-publico-superficie-suave disabled:cursor-not-allowed disabled:opacity-60 ${focoClaro}`}
    >
      <Icono nombre="refrescar" className="size-4" /> {enviando ? 'Enviando…' : 'Volver a analizar'}
    </button>
  )

  return (
    <TarjetaPanel titulo="Diagnóstico de la IA" icono="lupa" accion={accion} aria-busy={pendiente || undefined}>
      {errorRehacer && <Aviso tipo="error" className="mb-4">{errorRehacer}</Aviso>}

      {cargando ? (
        <EsqueletoLista filas={2} etiqueta="Cargando el diagnóstico de la IA…" />
      ) : error ? (
        <Aviso tipo="error">{mensajeDeError(error)}</Aviso>
      ) : !diagnostico ? null : diagnostico.estado === 'PENDIENTE' ? (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-publico-lienzo px-4 py-3 text-sm text-publico-tinta-media">
          <Icono nombre="reloj" className="size-5 shrink-0" /> Analizando las fotos y la descripción…
        </p>
      ) : diagnostico.estado === 'SIN_CONFIGURAR' ? (
        <p className="rounded-xl bg-publico-lienzo px-4 py-3 text-sm text-publico-tinta-media">
          El diagnóstico con IA no está activado en este servidor.
        </p>
      ) : diagnostico.estado === 'ERROR' ? (
        <Aviso tipo="error">{diagnostico.error ?? 'No se pudo completar el diagnóstico.'}</Aviso>
      ) : (
        <ResultadoDiagnostico diagnostico={diagnostico} />
      )}
    </TarjetaPanel>
  )
}

function ResultadoDiagnostico({ diagnostico: d }: { diagnostico: DiagnosticoIa }): ReactNode {
  const equipo = d.equipo
  const nombreEquipo = [equipo?.tipo, equipo?.marca, equipo?.modelo].filter(Boolean).join(' · ')
  const fallas = d.posiblesFallas ?? []
  const repuestos = d.repuestosInventario ?? []
  const otros = d.otrosRepuestos ?? []
  const precauciones = d.precauciones ?? []
  const herramientas = d.herramientas ?? []
  const fotos = d.fotosAnalizadas ?? 0
  const omitidas = d.fotosOmitidas ?? 0
  const base = useId()

  return (
    <div className="grid gap-5">
      <div className="rounded-xl bg-publico-lienzo px-4 py-3">
        <h3 className="text-xs font-bold tracking-[0.08em] text-publico-tinta-suave uppercase">Equipo</h3>
        <p className="mt-1 font-bold">{nombreEquipo || 'Equipo sin identificar'}</p>
        {equipo && <p className="mt-0.5 text-sm text-publico-tinta-media">{FUENTE[equipo.fuente]}</p>}
      </div>

      {d.resumen && <p className="text-base/[1.55]">{d.resumen}</p>}

      {fallas.length > 0 && (
        <section aria-labelledby={`fallas-${base}`}>
          <h3 id={`fallas-${base}`} className="mb-2 text-sm font-bold">Posibles fallas</h3>
          <ol className="grid gap-3">
            {fallas.map((f, i) => (
              <li key={i} className="rounded-xl border border-publico-linea px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-bold">{f.falla}</p>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${PROBABILIDAD[f.probabilidad].clase}`}>{PROBABILIDAD[f.probabilidad].texto}</span>
                </div>
                {f.explicacion && <p className="mt-1.5 text-sm text-publico-tinta-media">{f.explicacion}</p>}
                {f.solucion && <p className="mt-1.5 text-sm"><span className="font-bold">Qué hacer:</span> {f.solucion}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby={`repuestos-${base}`}>
        <h3 id={`repuestos-${base}`} className="mb-2 text-sm font-bold">Repuestos de tu inventario</h3>
        {repuestos.length === 0 ? (
          <p className="text-sm text-publico-tinta-media">Ningún repuesto de tu inventario encaja con estas fallas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Repuestos de tu inventario que sugiere la IA</caption>
              <thead className="text-xs text-publico-tinta-suave">
                <tr className="border-b border-publico-linea">
                  <th scope="col" className="py-2 text-left font-bold">Repuesto</th>
                  <th scope="col" className="w-24 py-2 text-right font-bold">Precio</th>
                  <th scope="col" className="w-20 py-2 text-right font-bold">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-publico-linea">
                {repuestos.map((r) => (
                  <tr key={r.repuestoId}>
                    <td className="py-2.5 pr-3">
                      <span className="font-bold">{r.nombre}</span>
                      {r.motivo && <span className="mt-0.5 block text-publico-tinta-media">{r.motivo}</span>}
                    </td>
                    <td className="py-2.5 text-right align-top tabular-nums">{soles(r.precio)}</td>
                    <td className={`py-2.5 text-right align-top tabular-nums ${r.stock === 0 ? 'font-bold text-publico-peligro' : ''}`}>{r.stock === 0 ? 'Sin stock' : r.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {otros.length > 0 && (
        <section aria-labelledby={`otros-${base}`}>
          <h3 id={`otros-${base}`} className="text-sm font-bold">Otros repuestos que podría necesitar</h3>
          <p className="mb-2 text-xs text-publico-tinta-suave">No están en tu inventario.</p>
          <ul className="grid gap-2">
            {otros.map((o, i) => (
              <li key={i} className="text-sm">
                <span className="font-bold">{o.nombre}</span>
                {o.motivo && <span className="text-publico-tinta-media"> — {o.motivo}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {herramientas.length > 0 && (
        <section aria-labelledby={`herramientas-${base}`}>
          <h3 id={`herramientas-${base}`} className="mb-2 text-sm font-bold">Herramientas que llevar</h3>
          <ul className="flex flex-wrap gap-2">
            {herramientas.map((h) => (
              <li key={h} className="rounded-lg border border-publico-linea bg-publico-lienzo px-2.5 py-1 text-sm">{h}</li>
            ))}
          </ul>
        </section>
      )}

      {precauciones.length > 0 && (
        <section aria-labelledby={`precauciones-${base}`} className="rounded-xl border-l-4 border-publico-pendiente bg-publico-lienzo px-4 py-3">
          <h3 id={`precauciones-${base}`} className="text-sm font-bold">Precauciones</h3>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {precauciones.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </section>
      )}

      <p className="border-t border-publico-linea pt-3 text-xs text-publico-tinta-suave">
        Sugerencia generada por IA{d.modelo && <> ({d.modelo})</>} a partir de {fotos === 1 ? '1 foto' : `${fotos} fotos`} y la descripción del cliente. Confírmala en la visita.
        {omitidas > 0 && <> {omitidas === 1 ? '1 foto no se analizó' : `${omitidas} fotos no se analizaron`} (por tamaño o porque no estaba disponible).</>}
        {d.generadoEn && <> · {formatearMomento(d.generadoEn)}</>}
      </p>
    </div>
  )
}
