import { useQueries, useQuery } from '@tanstack/react-query'
import { api } from '../../api/cliente.ts'
import type { EstadoOrden, OrdenResumen } from '../../tipos.ts'
import { MESES_ESPANOL } from '../portal/fechas.ts'
import type { AjustesTaller, IndicadoresPanel, ReportePanel, RespuestaPaginada, TarifaResumen, TecnicoDisponible } from './tiposPanel.ts'

/* Cada consulta del panel vive aquí para que la misma clave signifique siempre
   los mismos datos: el diálogo de asignar y la página de equipo comparten la
   lista de técnicos, y al invalidar ['panel'] se refresca todo a la vez. */

/** Cada cuánto se pregunta al servidor si llegaron órdenes nuevas. */
export const INTERVALO_AVISOS_MS = 30_000

export function useIndicadores() {
  return useQuery<IndicadoresPanel>({
    queryKey: ['panel', 'indicadores'],
    queryFn: async () => (await api.get('/panel/indicadores')).data as IndicadoresPanel,
    refetchInterval: INTERVALO_AVISOS_MS,
  })
}

export function useOrdenes(estado: EstadoOrden | '', pagina: number, tamano: number) {
  return useQuery<RespuestaPaginada<OrdenResumen>>({
    queryKey: ['panel', 'ordenes', estado, pagina, tamano],
    queryFn: async () => {
      const params: Record<string, string | number> = { pagina, tamano }
      if (estado) params.estado = estado
      return (await api.get('/panel/ordenes', { params })).data as RespuestaPaginada<OrdenResumen>
    },
    placeholderData: (anterior) => anterior,
  })
}

export function useTecnicos() {
  return useQuery<TecnicoDisponible[]>({
    queryKey: ['panel', 'tecnicos'],
    queryFn: async () => ((await api.get('/panel/tecnicos')).data as TecnicoDisponible[]) ?? [],
  })
}

export function useTarifas() {
  return useQuery<TarifaResumen[]>({
    queryKey: ['panel', 'tarifas'],
    queryFn: async () => ((await api.get('/panel/tarifas')).data as TarifaResumen[]) ?? [],
  })
}

export function useAjustes() {
  return useQuery<AjustesTaller>({
    queryKey: ['panel', 'ajustes'],
    queryFn: async () => (await api.get('/panel/ajustes')).data as AjustesTaller,
  })
}

async function pedirReporte(desde: string, hasta: string): Promise<ReportePanel> {
  return (await api.get('/panel/reportes', { params: { desde, hasta } })).data as ReportePanel
}

export function useReporte(desde: string, hasta: string) {
  return useQuery<ReportePanel>({
    queryKey: ['panel', 'reporte', desde, hasta],
    queryFn: () => pedirReporte(desde, hasta),
    placeholderData: (anterior) => anterior,
  })
}

/* ─── Fechas del panel (siempre en la hora local del taller) ─── */

export function iso(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

export function sumarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha)
  copia.setDate(copia.getDate() + dias)
  return copia
}

export function desdeIso(texto: string): Date {
  const [a, m, d] = texto.split('-').map(Number)
  return new Date(a, m - 1, d)
}

const DIA_MS = 86_400_000

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((desdeIso(hasta).getTime() - desdeIso(desde).getTime()) / DIA_MS) + 1
}

/** "2026-09-24" → "24 set". */
export function fechaCorta(texto: string): string {
  const f = desdeIso(texto)
  return `${f.getDate()} ${MESES_ESPANOL[f.getMonth()].slice(0, 3)}`
}

export interface Tramo {
  desde: string
  hasta: string
  /** Texto bajo la barra: "24 set", "sem. 7 set", "set". */
  etiqueta: string
  /** Texto completo para lectores de pantalla y el título de la barra. */
  nombre: string
  /** El tramo llega hasta hoy y todavía puede crecer. */
  enCurso: boolean
}

/**
 * Parte un periodo en tramos para el gráfico: por día si son dos semanas o
 * menos, por semana hasta tres meses, y por mes a partir de ahí (máximo 12).
 */
export function tramosDe(desde: string, hasta: string): Tramo[] {
  const hoy = iso(new Date())
  const total = diasEntre(desde, hasta)
  const tramos: Tramo[] = []

  if (total <= 14) {
    for (let i = 0; i < total; i++) {
      const d = iso(sumarDias(desdeIso(desde), i))
      tramos.push({ desde: d, hasta: d, etiqueta: fechaCorta(d), nombre: fechaCorta(d), enCurso: d === hoy })
    }
    return tramos
  }

  if (total <= 92) {
    let inicio = desdeIso(desde)
    const fin = desdeIso(hasta)
    while (inicio <= fin) {
      const cierre = sumarDias(inicio, 6) > fin ? fin : sumarDias(inicio, 6)
      const d = iso(inicio)
      const h = iso(cierre)
      tramos.push({ desde: d, hasta: h, etiqueta: fechaCorta(d), nombre: `Del ${fechaCorta(d)} al ${fechaCorta(h)}`, enCurso: h >= hoy })
      inicio = sumarDias(cierre, 1)
    }
    return tramos
  }

  const fin = desdeIso(hasta)
  let cursor = new Date(fin.getFullYear(), fin.getMonth() - 11, 1)
  const primero = desdeIso(desde)
  if (cursor < new Date(primero.getFullYear(), primero.getMonth(), 1)) cursor = new Date(primero.getFullYear(), primero.getMonth(), 1)
  while (cursor <= fin) {
    const inicioMes = cursor < primero ? primero : cursor
    const finMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const cierre = finMes > fin ? fin : finMes
    const mes = MESES_ESPANOL[cursor.getMonth()]
    tramos.push({
      desde: iso(inicioMes),
      hasta: iso(cierre),
      etiqueta: mes.slice(0, 3),
      nombre: `${mes} de ${cursor.getFullYear()}`,
      enCurso: iso(cierre) >= hoy,
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return tramos
}

/** Los últimos `meses` meses naturales, el actual incluido (hasta hoy). */
export function ultimosMeses(meses: number): Tramo[] {
  const hoy = new Date()
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1), 1)
  return tramosDe(iso(desde), iso(hoy))
}

export interface PuntoSerie extends Tramo {
  ingresos: number
  ordenes: number
}

/** Un reporte por tramo; devuelve la serie cuando han llegado todos. */
export function useSerieIngresos(tramos: Tramo[]) {
  return useQueries({
    queries: tramos.map((t) => ({
      queryKey: ['panel', 'reporte', t.desde, t.hasta],
      queryFn: () => pedirReporte(t.desde, t.hasta),
    })),
    combine: (resultados) => ({
      cargando: resultados.some((r) => r.isPending),
      error: resultados.find((r) => r.error)?.error ?? null,
      reintentar: () => resultados.forEach((r) => void r.refetch()),
      serie: resultados.every((r) => r.data)
        ? tramos.map<PuntoSerie>((t, i) => ({ ...t, ingresos: Number(resultados[i].data!.ingresos), ordenes: resultados[i].data!.ordenesCreadas }))
        : null,
    }),
  })
}

/** 3.57 → "3 h 34 min"; menos de una hora, solo minutos. */
export function horas(valor: number): string {
  const total = Math.round(valor * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}
