import { useId } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ReparacionGarantia } from '../../tipos.ts'
import { Icono } from '../Icono.tsx'
import { focoClaro } from '../marco/foco.ts'
import { fechaGarantia } from './fechasGarantia.ts'

interface TarjetaAntecedenteProps {
  garantia: ReparacionGarantia
  titulo?: string
  enlaceOriginal?: string
}

/** Los datos y las fotos proceden exclusivamente de la reparación enlazada. */
export function TarjetaAntecedente({ garantia, titulo, enlaceOriginal }: TarjetaAntecedenteProps): ReactNode {
  const idTitulo = useId()
  return (
    <section aria-labelledby={idTitulo} className="rounded-2xl border border-publico-acento-hondo bg-publico-superficie p-5 shadow-sm shadow-publico-tinta/5">
      <h2 id={idTitulo} className="flex items-start gap-2 text-base font-bold">
        <Icono nombre="check" className="mt-0.5 size-5 shrink-0 text-publico-chip-texto" />
        {titulo ?? `Atención por garantía de ${garantia.codigoOriginal}`}
      </h2>
      {titulo && <p className="mt-2 text-sm text-publico-tinta-media">Reparación original: <b>{garantia.codigoOriginal}</b></p>}
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-publico-tinta-suave">Reparación anterior</dt><dd className="mt-0.5 font-bold">{fechaGarantia(garantia.fechaReparacion)}</dd></div>
        <div><dt className="text-xs text-publico-tinta-suave">La cobertura vence el</dt><dd className="mt-0.5 font-bold">{fechaGarantia(garantia.venceEn)}</dd></div>
      </dl>
      <div className="mt-4 border-t border-publico-linea pt-4">
        <h3 className="text-sm font-bold">Diagnóstico anterior</h3>
        <p className="mt-1 text-sm/[1.55] text-publico-tinta-media first-letter:uppercase">{garantia.diagnosticoAnterior || 'No se registró un diagnóstico.'}</p>
        <h3 className="mt-4 text-sm font-bold">Repuestos instalados y cubiertos</h3>
        {garantia.repuestosInstalados.length > 0 ? (
          <ul className="mt-2 grid gap-1.5 text-sm text-publico-tinta-media">
            {garantia.repuestosInstalados.map((repuesto, i) => <li key={`${repuesto.nombre}-${i}`} className="flex justify-between gap-3"><span>{repuesto.nombre}</span><b className="shrink-0 tabular-nums">× {repuesto.cantidad}</b></li>)}
          </ul>
        ) : <p className="mt-1 text-sm text-publico-tinta-media">Esta reparación no registró repuestos.</p>}
        <p className="mt-2 text-xs text-publico-tinta-suave">La atención mantiene el vencimiento de la reparación original.</p>
      </div>
      {garantia.fotosAnteriores.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold">Fotos del trabajo anterior</h3>
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {garantia.fotosAnteriores.map((foto, i) => (
              <li key={foto}><a href={foto} target="_blank" rel="noopener noreferrer" className={`block aspect-square overflow-hidden rounded-xl border border-publico-linea bg-publico-superficie-suave ${focoClaro}`}><img src={foto} alt={`Foto ${i + 1} del trabajo en ${garantia.codigoOriginal}`} className="size-full object-cover" loading="lazy" /><span className="sr-only">Abrir foto en otra pestaña</span></a></li>
            ))}
          </ul>
        </div>
      )}
      {enlaceOriginal && <Link to={enlaceOriginal} className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold underline decoration-publico-acento decoration-2 underline-offset-4 ${focoClaro}`}>Ver orden original {garantia.codigoOriginal}<Icono nombre="flecha" className="size-4" /></Link>}
    </section>
  )
}
