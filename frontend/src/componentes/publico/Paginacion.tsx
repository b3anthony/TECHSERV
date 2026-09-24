import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { focoClaro } from '../marco/foco.ts'

interface PaginacionProps {
  pagina: number
  totalPaginas: number
  /** Enlace a la página n (1-based), para que atrás/adelante del navegador funcionen. */
  enlace: (n: number) => string
  etiqueta?: string
}

/** Páginas visibles: la primera, la última y las vecinas de la actual; el resto, «…». */
function paginasVisibles(pagina: number, total: number): (number | '…')[] {
  const lista: (number | '…')[] = []
  for (let n = 1; n <= total; n++) {
    if (n === 1 || n === total || Math.abs(n - pagina) <= 1) lista.push(n)
    else if (lista[lista.length - 1] !== '…') lista.push('…')
  }
  return lista
}

const base = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-bold ${focoClaro}`

export function Paginacion({ pagina, totalPaginas, enlace, etiqueta = 'Paginación' }: PaginacionProps): ReactNode {
  if (totalPaginas <= 1) return null
  const flecha = (n: number, texto: string, simbolo: string, antes: boolean) =>
    n < 1 || n > totalPaginas ? (
      <span aria-hidden="true" className={`${base} gap-1.5 text-publico-tinta-suave/60`}>{antes && simbolo}{texto}{!antes && simbolo}</span>
    ) : (
      <Link to={enlace(n)} className={`${base} gap-1.5 border border-publico-linea-fuerte bg-publico-superficie text-publico-tinta hover:bg-publico-superficie-suave`}>
        {antes && <span aria-hidden="true">{simbolo}</span>}{texto}{!antes && <span aria-hidden="true">{simbolo}</span>}
      </Link>
    )

  return (
    <nav aria-label={etiqueta} className="flex items-center justify-between gap-2 sm:justify-center">
      {flecha(pagina - 1, 'Anterior', '←', true)}
      <p className="text-sm text-publico-tinta-media sm:hidden">
        Página <b className="text-publico-tinta">{pagina}</b> de {totalPaginas}
      </p>
      <ul className="hidden items-center gap-1 sm:flex">
        {paginasVisibles(pagina, totalPaginas).map((n, i) =>
          n === '…' ? (
            <li key={`salto-${i}`} aria-hidden="true" className="px-1 text-publico-tinta-suave">…</li>
          ) : (
            <li key={n}>
              <Link
                to={enlace(n)}
                aria-label={`Página ${n}`}
                aria-current={n === pagina ? 'page' : undefined}
                className={`${base} ${n === pagina ? 'bg-publico-panel text-publico-superficie' : 'text-publico-tinta-media hover:bg-publico-superficie hover:text-publico-tinta'}`}
              >
                {n}
              </Link>
            </li>
          ),
        )}
      </ul>
      {flecha(pagina + 1, 'Siguiente', '→', false)}
    </nav>
  )
}
