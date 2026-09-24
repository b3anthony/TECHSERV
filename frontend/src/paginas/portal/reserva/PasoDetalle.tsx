import type { ReactNode } from 'react'
import { AreaTexto } from '../../../componentes/publico/AreaTexto.tsx'
import { CampoTexto } from '../../../componentes/publico/CampoTexto.tsx'
import { Selector } from '../../../componentes/publico/Selector.tsx'
import { PasoNumerado } from '../../../componentes/publico/PasoNumerado.tsx'
import { focoClaro } from '../../../componentes/marco/foco.ts'
import { DISTRITOS_TRUJILLO } from '../distritos.ts'
import type { Reserva } from './useReserva.ts'

export function PasoDetalle({ reserva }: { reserva: Reserva }): ReactNode {
  const { descripcionFalla, setDescripcionFalla, direccion, setDireccion, referencia, setReferencia, distrito, setDistrito, fotos, errorFotos, agregarArchivos, quitarFoto, errores, setErrores, inputArchivosRef, idInputArchivos, pasosCompletos, usuario } = reserva
  return <PasoNumerado id="paso-detalle" numero={4} titulo="Dirección y detalle de la avería" bajada="Cuéntale al taller qué sucede y dónde debe ir." completo={pasosCompletos[3]}>
    <div className="grid gap-x-4 gap-y-1.5 min-[680px]:grid-cols-2">
      <div className="min-[680px]:col-span-2"><AreaTexto id="falla" etiqueta="Descripción de la falla" ayuda="Mínimo 10 caracteres" max={2000} error={errores.descripcionFalla} rows={4} value={descripcionFalla} placeholder="Cuéntanos qué equipo o instalación falla y qué ocurre" onChange={(evento) => { setDescripcionFalla(evento.target.value); if (errores.descripcionFalla) setErrores((prev) => ({ ...prev, descripcionFalla: '' })) }} /></div>
      <div className="min-[680px]:col-span-2">
        <label htmlFor={idInputArchivos} className="block text-sm font-bold">Fotos de la avería <span className="font-normal text-publico-tinta-suave">(opcional)</span></label>
        <div className="mt-1 rounded-lg border border-dashed border-publico-linea-fuerte bg-publico-lienzo p-4 text-center" onDragOver={(evento) => evento.preventDefault()} onDrop={(evento) => { evento.preventDefault(); if (evento.dataTransfer.files) agregarArchivos(evento.dataTransfer.files) }}>
          <p className="text-sm text-publico-tinta-media">Arrastra tus fotos aquí o elígelas desde tu dispositivo.</p>
          <input ref={inputArchivosRef} id={idInputArchivos} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-describedby="fotos-ayuda fotos-error" className="peer sr-only" onChange={(evento) => { if (evento.target.files) agregarArchivos(evento.target.files) }} />
          <label htmlFor={idInputArchivos} className="mt-2 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-publico-linea-fuerte bg-publico-superficie px-3 text-sm font-bold hover:bg-publico-superficie-suave peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-publico-acento peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-publico-superficie">Elegir fotos</label>
        </div>
        <p id="fotos-ayuda" className="mt-1 text-xs text-publico-tinta-suave">Hasta 5 fotos JPG, PNG o WEBP. Máximo 5 MB cada una.</p><p id="fotos-error" role={errorFotos ? 'alert' : undefined} className="min-h-5 text-xs text-publico-peligro">{errorFotos}</p>
        {fotos.length > 0 && <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">{fotos.map((foto) => <div key={foto.id} className="w-20"><img src={foto.urlVistaPrevia} alt="" width="80" height="80" className="size-20 rounded-lg object-cover" /><span title={foto.nombre} className="mt-1 block truncate text-xs text-publico-tinta-media">{foto.nombre}</span><button type="button" onClick={() => quitarFoto(foto.id)} aria-label={`Quitar foto ${foto.nombre}`} className={`mt-1 min-h-11 w-full rounded-lg border border-publico-linea-fuerte text-xs font-bold ${focoClaro}`}>Quitar</button></div>)}</div>}
      </div>
      <div className="min-[680px]:col-span-2"><CampoTexto id="direccion" etiqueta="Dirección" type="text" autoComplete="street-address" value={direccion} placeholder="Calle, número y urbanización" error={errores.direccion} onChange={(evento) => { setDireccion(evento.target.value); if (errores.direccion) setErrores((prev) => ({ ...prev, direccion: '' })) }} /></div>
      <CampoTexto id="referencia" etiqueta="Referencia (opcional)" type="text" value={referencia} placeholder="Ej. frente al parque" onChange={(evento) => setReferencia(evento.target.value)} />
      <Selector id="distrito" etiqueta="Distrito" value={distrito} error={errores.distrito} onChange={(evento) => { setDistrito(evento.target.value); if (errores.distrito) setErrores((prev) => ({ ...prev, distrito: '' })) }}><option value="">Elige tu distrito</option>{DISTRITOS_TRUJILLO.map((item) => <option key={item} value={item}>{item}</option>)}</Selector>
    </div>
    {!usuario && <p className="mt-4 text-sm text-publico-tinta-media">Te pediremos iniciar sesión al confirmar. Lo que llevas elegido se guarda.</p>}
  </PasoNumerado>
}
