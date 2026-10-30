import { useState } from 'react'
import type { ReactNode } from 'react'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { METODOS_PAGO, soles } from '../panel/formato.ts'
import type { MetodoPago } from '../panel/tiposPanel.ts'
import type { DatosCobroVisita, VistaVisita } from './tiposVisita.ts'

interface CobroProps {
  token: string
  total: number
  /** Los métodos que acepta el taller: solo esos se ofrecen si el cliente no eligió. */
  aceptados: MetodoPago[]
  /** El que eligió el cliente al reservar. Si lo hay, es el único que se muestra. */
  elegidoPorCliente?: MetodoPago | null
  tallerNombre: string
  datosCobro: DatosCobroVisita | null
  alCobrar: (nueva: VistaVisita) => void
}

/** «Cobré»: el monto enorme, cómo pagó el cliente, y un solo botón. */
export function Cobro({ token, total, aceptados, elegidoPorCliente, tallerNombre, datosCobro, alCobrar }: CobroProps): ReactNode {
  const metodos = METODOS_PAGO.filter((m) => (elegidoPorCliente ? m.valor === elegidoPorCliente : aceptados.includes(m.valor)))
  const [metodo, setMetodo] = useState<MetodoPago | null>(elegidoPorCliente ?? null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function cobrar(): Promise<void> {
    if (!metodo) {
      setError('Elige cómo te pagó el cliente')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      const res = await api.post<VistaVisita>(`/visita/${token}/cobro`, { metodo })
      alCobrar(res.data)
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section aria-labelledby="titulo-cobro" className="grid">
      <h2 id="titulo-cobro" className="text-xl font-bold">Cobra al cliente</h2>
      <p className="mt-1 text-sm text-publico-tinta-media">Cuando recibas el dinero, márcalo aquí. El taller lo verá al momento.</p>

      <div className="mt-5 rounded-2xl bg-publico-panel px-5 py-6 text-center text-publico-superficie">
        <p className="text-sm text-publico-superficie/70">Total a cobrar</p>
        <p className="mt-1 text-5xl font-bold tracking-[-0.03em] text-publico-acento tabular-nums">{soles(total)}</p>
      </div>

      <fieldset className="mt-5" aria-describedby={elegidoPorCliente ? 'cobro-otra-forma' : undefined}>
        <legend className="mb-2 text-sm font-bold">{elegidoPorCliente ? 'El cliente eligió pagar con' : '¿Cómo te pagó?'}</legend>
        <div className={`grid gap-2 ${elegidoPorCliente ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {metodos.map((m) => (
            <label key={m.valor} className={`flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 text-base font-bold has-[:focus]:ring-2 has-[:focus]:ring-publico-acento has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-publico-superficie ${metodo === m.valor ? 'border-publico-tinta bg-publico-panel text-publico-superficie' : 'border-publico-linea bg-publico-superficie hover:border-publico-linea-fuerte'}`}>
              <input type="radio" name="metodo-cobro" value={m.valor} checked={metodo === m.valor} onChange={() => { setMetodo(m.valor); setError(null) }} className="sr-only" />
              {metodo === m.valor && <Icono nombre="visto" className="size-4 text-publico-acento" />}
              {m.texto}
            </label>
          ))}
        </div>
        {elegidoPorCliente && (
          <p id="cobro-otra-forma" className="mt-2 text-xs text-publico-tinta-media">¿Te pagó de otra forma? Avisa al taller para que lo registre él.</p>
        )}
      </fieldset>

      {metodo && metodo !== 'EFECTIVO' && <DatosParaCobrar key={metodo} metodo={metodo} datos={datosCobro} tallerNombre={tallerNombre} />}

      <div aria-live="polite">{error && <Aviso tipo="error" className="mt-4">{error}</Aviso>}</div>

      <Boton type="button" onClick={() => void cobrar()} cargando={enviando} className="mt-4 min-h-14 w-full text-base">
        <Icono nombre="moneda" className="size-5" /> Cobré {soles(total)}
      </Boton>
    </section>
  )
}

function DatosParaCobrar({ metodo, datos, tallerNombre }: { metodo: Exclude<MetodoPago, 'EFECTIVO'>; datos: DatosCobroVisita | null; tallerNombre: string }): ReactNode {
  const nombre = metodo === 'YAPE' ? 'Yape' : metodo === 'PLIN' ? 'Plin' : 'Transferencia'
  const billetera = metodo === 'YAPE' ? datos?.yape : metodo === 'PLIN' ? datos?.plin : undefined
  const transferencia = metodo === 'TRANSFERENCIA' ? datos?.transferencia : undefined
  const configurado = billetera?.qr || billetera?.numero || transferencia

  return (
    <section aria-labelledby="titulo-datos-cobro" className="mt-5 min-w-0 rounded-xl border border-publico-linea bg-publico-lienzo p-4">
      <h3 id="titulo-datos-cobro" className="text-base font-bold">{nombre}</h3>
      {!configurado ? (
        <p className="mt-2 text-sm text-publico-tinta-media">El taller no configuró su {metodo === 'TRANSFERENCIA' ? 'transferencia' : nombre}. Pídele los datos al taller.</p>
      ) : (
        <>
          {billetera?.qr && <img src={billetera.qr} alt={`Código QR de ${nombre} de ${tallerNombre}`} width={240} height={240} className="mx-auto mt-4 size-60 min-h-60 min-w-60 rounded-xl border border-publico-linea bg-publico-superficie object-contain sm:size-72" />}
          {(billetera?.numero || transferencia) && (
            <dl className="mt-4 grid gap-3">
              {billetera?.numero && <DatoCopiable etiqueta={`Número de ${nombre}`} valor={billetera.numero} grande />}
              {transferencia && <>
                <DatoCopiable etiqueta="Banco" valor={transferencia.banco} />
                <DatoCopiable etiqueta="Titular" valor={transferencia.titular} />
                {transferencia.numeroCuenta && <DatoCopiable etiqueta="Número de cuenta" valor={transferencia.numeroCuenta} />}
                {transferencia.cci && <DatoCopiable etiqueta="CCI" valor={transferencia.cci} />}
              </>}
            </dl>
          )}
        </>
      )}
    </section>
  )
}

function DatoCopiable({ etiqueta, valor, grande = false }: { etiqueta: string; valor: string; grande?: boolean }): ReactNode {
  const [resultado, setResultado] = useState<{ valor: string; error: boolean } | null>(null)
  const actual = resultado?.valor === valor ? resultado : null

  async function copiar(): Promise<void> {
    setResultado(null)
    try {
      await navigator.clipboard.writeText(valor)
      setResultado({ valor, error: false })
    } catch {
      setResultado({ valor, error: true })
    }
  }

  return (
    <div className="min-w-0">
      <dt className="text-xs text-publico-tinta-media">{etiqueta}</dt>
      <dd className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className={`min-w-0 font-bold break-all ${grande ? 'text-2xl tabular-nums' : 'text-base'}`}>{valor}</span>
        <Boton type="button" variante="secundario" onClick={() => void copiar()} aria-label={`Copiar ${etiqueta.toLocaleLowerCase('es')}`} className="shrink-0 px-3">Copiar</Boton>
      </dd>
      <p role="status" aria-live="polite" className={`mt-1 min-h-5 text-xs font-bold ${actual?.error ? 'text-publico-peligro' : 'text-publico-completada'}`}>{actual ? actual.error ? 'No se pudo copiar. Copia el dato manualmente.' : 'Copiado' : ''}</p>
    </div>
  )
}
