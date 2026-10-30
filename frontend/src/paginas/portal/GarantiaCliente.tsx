import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { GarantiaOrden } from '../../tipos.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { diasRestantes, fechaGarantia } from '../../componentes/garantia/fechasGarantia.ts'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { DialogoSolicitudGarantia } from './DialogoSolicitudGarantia.tsx'

interface GarantiaClienteProps {
  ordenId: number
  mypeId: number
  codigo: string
  garantia: GarantiaOrden
  mostrarRepuestos?: boolean
}

export function GarantiaCliente({ ordenId, mypeId, codigo, garantia, mostrarRepuestos = false }: GarantiaClienteProps): ReactNode {
  const [solicitando, setSolicitando] = useState(false)
  const [atencionCreada, setAtencionCreada] = useState<{ id: number; codigo: string } | null>(null)
  // Lo creado aquí vale hasta que el servidor vuelva a hablar: si después se
  // canceló o terminó, su `atencionAbierta` ya no la trae y el botón vuelve.
  const [garantiaVista, setGarantiaVista] = useState(garantia)
  if (garantia !== garantiaVista) {
    setGarantiaVista(garantia)
    setAtencionCreada(null)
  }
  const atencion = garantia.atencionAbierta ?? atencionCreada
  const quedan = diasRestantes(garantia.venceEn)
  return (
    <div className={`rounded-xl border px-4 py-3 ${garantia.vigente ? 'border-publico-completada/30 bg-publico-superficie-suave' : 'border-publico-linea bg-publico-lienzo'}`}>
      <p className="flex items-start gap-2 text-sm font-bold">
        <Icono nombre={garantia.vigente ? 'check' : 'reloj'} className="mt-0.5 size-4 shrink-0 text-publico-tinta-media" />
        {garantia.vigente ? `Garantía activa hasta el ${fechaGarantia(garantia.venceEn)} · ${quedan === 0 ? 'vence hoy' : quedan === 1 ? 'queda 1 día' : `quedan ${quedan} días`}` : `Garantía vencida el ${fechaGarantia(garantia.venceEn)}`}
      </p>
      {mostrarRepuestos && (
        <div className="mt-3 border-t border-publico-linea pt-3">
          <h2 className="text-base font-bold">Garantía de tu reparación · {garantia.dias} días</h2>
          <p className="mt-1 text-sm text-publico-tinta-media">Cubre el servicio de esta reparación{garantia.repuestos.length > 0 ? ' y estos repuestos:' : '.'}</p>
          {garantia.repuestos.length > 0 && <ul className="mt-2 grid gap-1.5 text-sm">{garantia.repuestos.map((repuesto, i) => <li key={`${repuesto.nombre}-${i}`} className="flex justify-between gap-3"><span>{repuesto.nombre}</span><b className="shrink-0 tabular-nums">× {repuesto.cantidad}</b></li>)}</ul>}
        </div>
      )}
      {atencion ? (
        <p className="mt-3 text-sm text-publico-tinta-media">Ya pediste atención por garantía:{' '}<Link to={`/mis-ordenes/${atencion.id}`} className={`inline-block rounded font-bold text-publico-tinta underline decoration-publico-acento decoration-2 underline-offset-4 ${focoClaro}`}>{atencion.codigo}</Link></p>
      ) : garantia.vigente && (
        <Boton type="button" variante="secundario" onClick={() => setSolicitando(true)} className="mt-3 w-full sm:w-auto">Solicitar atención por garantía</Boton>
      )}
      {solicitando && <DialogoSolicitudGarantia ordenId={ordenId} mypeId={mypeId} codigo={codigo} alCerrar={() => setSolicitando(false)} alCreada={(orden) => setAtencionCreada({ id: orden.id, codigo: orden.codigo })} />}
    </div>
  )
}
