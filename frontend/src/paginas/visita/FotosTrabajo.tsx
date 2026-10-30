import { useId, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import type { VistaVisita } from './tiposVisita.ts'

interface FotosTrabajoProps {
  token: string
  visita: VistaVisita
  alSubir: (nueva: VistaVisita) => void
}

/**
 * Las fotos del trabajo. En el celular, el botón abre directamente la cámara
 * trasera (capture="environment"); en la computadora, el selector de archivos.
 */
export function FotosTrabajo({ token, visita, alSubir }: FotosTrabajoProps): ReactNode {
  const idEntrada = useId()
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)

  const quedan = visita.maximoFotosTrabajo - visita.fotosTrabajo.length

  async function elegir(ev: ChangeEvent<HTMLInputElement>): Promise<void> {
    const archivos = Array.from(ev.target.files ?? [])
    ev.target.value = ''
    if (archivos.length === 0) return
    setError(null)
    setHecho(null)
    if (archivos.length > quedan) {
      setError(`Solo puedes subir ${quedan} ${quedan === 1 ? 'foto más' : 'fotos más'}.`)
      return
    }
    const datos = new FormData()
    archivos.forEach((a) => datos.append('fotos', a))
    setSubiendo(true)
    try {
      const res = await api.post<VistaVisita>(`/visita/${token}/fotos`, datos)
      alSubir(res.data)
      setHecho(archivos.length === 1 ? 'Foto guardada.' : `${archivos.length} fotos guardadas.`)
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <section aria-labelledby="titulo-fotos" className="rounded-2xl border border-publico-linea bg-publico-superficie p-5 shadow-sm shadow-publico-tinta/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="titulo-fotos" className="flex items-center gap-2 text-lg font-bold"><Icono nombre="camara" className="size-5 text-publico-tinta-media" /> Fotos del trabajo</h2>
          <p className="mt-0.5 text-sm text-publico-tinta-media">El antes y el después. El taller y el cliente las verán.</p>
        </div>
        <span className="shrink-0 rounded-lg bg-publico-lienzo px-2 py-1 text-xs font-bold text-publico-tinta-media tabular-nums">{visita.fotosTrabajo.length} de {visita.maximoFotosTrabajo}</span>
      </div>

      {visita.repuestos.length > 0 && <p className="mt-3 text-sm text-publico-tinta-media">Sube una foto del repuesto instalado: queda guardada en la garantía del cliente.</p>}

      {visita.fotosTrabajo.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {visita.fotosTrabajo.map((foto, i) => (
            <li key={foto} className="motion-safe:animate-[visita-entra_300ms_ease-out]">
              <a href={foto} target="_blank" rel="noopener noreferrer" className={`block aspect-square overflow-hidden rounded-xl border border-publico-linea bg-publico-superficie-suave ${focoClaro}`}>
                <img src={foto} alt={`Foto ${i + 1} del trabajo`} className="size-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {quedan > 0 && (
        <label
          htmlFor={idEntrada}
          className={`mt-4 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-publico-linea-fuerte text-base font-bold hover:border-publico-acento-hondo hover:bg-publico-acento-tenue has-[:focus]:ring-2 has-[:focus]:ring-publico-acento has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-publico-superficie ${subiendo ? 'pointer-events-none opacity-60' : ''}`}
        >
          {subiendo
            ? <span aria-hidden="true" className="size-5 animate-spin rounded-2xl border-2 border-current border-t-transparent motion-reduce:animate-none" />
            : <Icono nombre="camara" className="size-5" />}
          {subiendo ? 'Subiendo…' : visita.fotosTrabajo.length === 0 ? 'Tomar o subir foto' : 'Añadir otra foto'}
          <input id={idEntrada} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple disabled={subiendo} onChange={(e) => void elegir(e)} className="sr-only" />
        </label>
      )}

      <div aria-live="polite">
        {error && <Aviso tipo="error" className="mt-3">{error}</Aviso>}
        {hecho && <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-publico-completada"><Icono nombre="check" className="size-4" /> {hecho}</p>}
      </div>
    </section>
  )
}
