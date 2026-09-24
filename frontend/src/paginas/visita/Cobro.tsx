import { useState } from 'react'
import type { ReactNode } from 'react'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { soles } from '../panel/formato.ts'
import type { MetodoPago } from '../panel/tiposPanel.ts'
import type { VistaVisita } from './tiposVisita.ts'

const METODOS: { valor: MetodoPago; texto: string }[] = [
  { valor: 'EFECTIVO', texto: 'Efectivo' },
  { valor: 'YAPE', texto: 'Yape' },
  { valor: 'PLIN', texto: 'Plin' },
  { valor: 'TRANSFERENCIA', texto: 'Transferencia' },
]

interface CobroProps {
  token: string
  total: number
  alCobrar: (nueva: VistaVisita) => void
}

/** «Cobré»: el monto enorme, cómo pagó el cliente, y un solo botón. */
export function Cobro({ token, total, alCobrar }: CobroProps): ReactNode {
  const [metodo, setMetodo] = useState<MetodoPago | null>(null)
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

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-bold">¿Cómo te pagó?</legend>
        <div className="grid grid-cols-2 gap-2">
          {METODOS.map((m) => (
            <label key={m.valor} className={`flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 text-base font-bold has-[:focus]:ring-2 has-[:focus]:ring-publico-acento has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-publico-superficie ${metodo === m.valor ? 'border-publico-tinta bg-publico-panel text-publico-superficie' : 'border-publico-linea bg-publico-superficie hover:border-publico-linea-fuerte'}`}>
              <input type="radio" name="metodo-cobro" value={m.valor} checked={metodo === m.valor} onChange={() => { setMetodo(m.valor); setError(null) }} className="sr-only" />
              {metodo === m.valor && <Icono nombre="visto" className="size-4 text-publico-acento" />}
              {m.texto}
            </label>
          ))}
        </div>
      </fieldset>

      <div aria-live="polite">{error && <Aviso tipo="error" className="mt-4">{error}</Aviso>}</div>

      <Boton type="button" onClick={() => void cobrar()} cargando={enviando} className="mt-4 min-h-14 w-full text-base">
        <Icono nombre="moneda" className="size-5" /> Cobré {soles(total)}
      </Boton>
    </section>
  )
}
