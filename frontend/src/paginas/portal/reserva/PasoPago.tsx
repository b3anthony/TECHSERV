import type { ReactNode } from 'react'
import { Icono } from '../../../componentes/Icono.tsx'
import { Aviso } from '../../../componentes/publico/Aviso.tsx'
import { PasoNumerado } from '../../../componentes/publico/PasoNumerado.tsx'
import { METODOS_PAGO } from '../../panel/formato.ts'
import type { Reserva } from './useReserva.ts'

/** Paso 5: cómo va a pagar, entre los métodos que acepta el taller elegido. */
export function PasoPago({ reserva }: { reserva: Reserva }): ReactNode {
  const { tallerSeleccionado, metodoPago, setMetodoPago, errores, setErrores, pasosCompletos } = reserva
  const aceptados = METODOS_PAGO.filter((m) => tallerSeleccionado?.metodosPago.includes(m.valor))
  const error = errores.metodoPago

  return (
    <PasoNumerado
      id="paso-pago"
      numero={5}
      titulo="Elige el método de pago"
      bajada="Pagas directamente al taller cuando termine la visita."
      completo={pasosCompletos[4]}
    >
      {!tallerSeleccionado ? (
        <Aviso>Elige primero un taller: cada uno acepta sus propios métodos de pago.</Aviso>
      ) : (
        <fieldset aria-describedby="pago-ayuda pago-error">
          <legend className="sr-only">Método de pago</legend>
          <p id="pago-ayuda" className="mb-3 text-sm text-publico-tinta-media">
            {aceptados.length === 1
              ? <><b className="text-publico-tinta">{tallerSeleccionado.razonSocial}</b> solo acepta {aceptados[0].texto.toLowerCase()}.</>
              : <>Estos son los que acepta <b className="text-publico-tinta">{tallerSeleccionado.razonSocial}</b>.</>}
          </p>
          <div className="grid grid-cols-2 gap-2 min-[680px]:grid-cols-4">
            {aceptados.map((m) => {
              const elegido = metodoPago === m.valor
              return (
                <label key={m.valor} className={`flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 text-sm font-bold has-[:focus]:ring-2 has-[:focus]:ring-publico-acento has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-publico-superficie ${elegido ? 'border-publico-tinta bg-publico-acento-tenue' : 'border-publico-linea bg-publico-superficie hover:border-publico-linea-fuerte'}`}>
                  <input
                    type="radio"
                    name="metodo-pago"
                    value={m.valor}
                    checked={elegido}
                    onChange={() => { setMetodoPago(m.valor); if (error) setErrores((prev) => ({ ...prev, metodoPago: '' })) }}
                    className="sr-only"
                  />
                  {elegido ? <Icono nombre="visto" className="size-4" /> : <Icono nombre="moneda" className="size-4 text-publico-tinta-suave" />}
                  {m.texto}
                </label>
              )
            })}
          </div>
          <p id="pago-error" role={error ? 'alert' : undefined} className="mt-1.5 min-h-5 text-xs font-bold text-publico-peligro">{error}</p>
        </fieldset>
      )}
    </PasoNumerado>
  )
}
