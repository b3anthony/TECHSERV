import type { ReactNode } from 'react'

type PropsTarjetaAcceso = {
  tituloId: string
  children: ReactNode
  fraseFoto?: string
}

/** Contenedor de las pantallas de acceso bajo el MarcoPublico. */
export function TarjetaAcceso({ tituloId, children, fraseFoto = 'Tu visita, a la hora que elegiste.' }: PropsTarjetaAcceso): ReactNode {
  return (
    <div className="mx-auto my-6 grid w-[calc(100%-2rem)] max-w-[62rem] overflow-clip rounded-2xl border border-publico-linea bg-publico-superficie shadow-xl shadow-publico-tinta/15 min-[800px]:my-12 min-[800px]:grid-cols-[58%_42%]">
      <section aria-labelledby={tituloId} className="min-w-0 p-6 min-[800px]:p-14">
        {children}
      </section>
      {/* La foto tiene alto propio y se queda a la vista: con un formulario largo
          (registro de negocio) no se estira, y lo que sobra es el mismo panel oscuro. */}
      <div className="hidden min-h-[34rem] bg-publico-panel min-[800px]:block" aria-hidden="true">
        <div className="sticky top-0 h-full max-h-[min(100svh,44rem)]">
          <img src="/portada/taller-delgado.jpg" width="800" height="600" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-publico-panel via-publico-panel/40 to-transparent" />
          <p className="absolute right-8 bottom-8 left-8 text-2xl leading-tight font-bold text-publico-superficie">{fraseFoto}</p>
        </div>
      </div>
    </div>
  )
}
