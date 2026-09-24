import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { AreaTexto } from '../../componentes/publico/AreaTexto.tsx'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { CampoTexto } from '../../componentes/publico/CampoTexto.tsx'
import type { ErrorApi } from '../../tipos.ts'
import { DialogoPanel } from './comun.tsx'
import type { RepuestoCatalogo } from './tiposPanel.ts'

interface DialogoRepuestoProps {
  abierto: boolean
  repuesto: RepuestoCatalogo | null
  alCerrar: () => void
  alGuardar: (nombre: string) => void
}

type Errores = Partial<Record<'nombre' | 'descripcion' | 'precio' | 'stock', string>>

export function DialogoRepuesto({ abierto, repuesto, alCerrar, alGuardar }: DialogoRepuestoProps): ReactNode {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState(repuesto?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(repuesto?.descripcion ?? '')
  const [precio, setPrecio] = useState(repuesto ? String(repuesto.precio) : '')
  const [stock, setStock] = useState(repuesto ? String(repuesto.stock) : '')
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    const e: Errores = {}
    const precioNum = Number(precio)
    const stockNum = Number(stock)
    if (!nombre.trim()) e.nombre = 'Escribe el nombre del repuesto'
    if (precio.trim() === '' || !Number.isFinite(precioNum) || precioNum < 0) e.precio = 'Escribe un precio válido'
    if (stock.trim() === '' || !Number.isInteger(stockNum) || stockNum < 0) e.stock = 'Escribe cuántas unidades tienes (0 o más)'
    setErrores(e)
    setErrorGeneral(null)
    if (Object.keys(e).length > 0) return

    const cuerpo = { nombre: nombre.trim(), descripcion: descripcion.trim(), precio: Math.round(precioNum * 100) / 100, stock: stockNum }
    setGuardando(true)
    try {
      if (repuesto) await api.put(`/panel/repuestos/${repuesto.id}`, cuerpo)
      else await api.post('/panel/repuestos', cuerpo)
      await queryClient.invalidateQueries({ queryKey: ['panel', 'repuestos'] })
      alGuardar(cuerpo.nombre)
      alCerrar()
    } catch (err) {
      const campos = axios.isAxiosError(err) ? (err.response?.data as ErrorApi | undefined)?.campos : undefined
      if (campos) setErrores(campos as Errores)
      setErrorGeneral(mensajeDeError(err))
    } finally {
      setGuardando(false)
    }
  }

  const idForm = repuesto ? `form-repuesto-${repuesto.id}` : 'form-repuesto-nuevo'

  return (
    <DialogoPanel
      abierto={abierto}
      alCerrar={alCerrar}
      ocupado={guardando}
      titulo={repuesto ? 'Editar repuesto' : 'Añadir repuesto'}
      detalle="Tus técnicos lo elegirán al cerrar una orden y se sumará al cobro."
      pie={
        <>
          <Boton type="button" variante="secundario" disabled={guardando} onClick={alCerrar}>Cancelar</Boton>
          <Boton type="submit" form={idForm} cargando={guardando}>{repuesto ? 'Guardar cambios' : 'Añadir al catálogo'}</Boton>
        </>
      }
    >
      <form id={idForm} noValidate onSubmit={guardar} className="grid gap-x-4 sm:grid-cols-2">
        {errorGeneral && <Aviso tipo="error" className="mb-4 sm:col-span-2">{errorGeneral}</Aviso>}
        <CampoTexto id={`${idForm}-nombre`} etiqueta="Nombre" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} maxLength={120} className="sm:col-span-2" placeholder="Ejemplo: Faja de lavadora" />
        <AreaTexto id={`${idForm}-descripcion`} etiqueta="Descripción (opcional)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} error={errores.descripcion} max={250} rows={2} className="sm:col-span-2" />
        <CampoTexto id={`${idForm}-precio`} etiqueta="Precio de venta (S/)" tipo="number" inputMode="decimal" min="0" step="0.50" value={precio} onChange={(e) => setPrecio(e.target.value)} error={errores.precio} />
        <CampoTexto id={`${idForm}-stock`} etiqueta="Unidades en stock" tipo="number" inputMode="numeric" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} error={errores.stock} />
      </form>
    </DialogoPanel>
  )
}
