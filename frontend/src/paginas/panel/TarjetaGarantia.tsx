import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { EsqueletoLista, ErrorCarga, TarjetaPanel } from './comun.tsx'

type DiasGarantia = 30 | 60 | 90
interface AjusteGarantia { dias: DiasGarantia }
const CLAVE = ['panel', 'ajustes', 'garantia']
const OPCIONES: DiasGarantia[] = [30, 60, 90]

export function TarjetaGarantia(): ReactNode {
  const consulta = useQuery<AjusteGarantia>({ queryKey: CLAVE, queryFn: async () => (await api.get<AjusteGarantia>('/panel/ajustes/garantia')).data })
  return (
    <TarjetaPanel titulo="Garantía de tus reparaciones" icono="check">
      <p className="mb-4 text-sm/[1.55] text-publico-tinta-media">Se aplica a las visitas que cierres desde ahora. Las garantías ya emitidas no cambian.</p>
      {consulta.isPending ? <EsqueletoLista filas={1} alto="h-16" etiqueta="Cargando los días de garantía…" /> : consulta.error ? <ErrorCarga mensaje={mensajeDeError(consulta.error)} reintentar={() => void consulta.refetch()} /> : <FormularioGarantia diasGuardados={consulta.data.dias} />}
    </TarjetaPanel>
  )
}

function FormularioGarantia({ diasGuardados }: { diasGuardados: DiasGarantia }): ReactNode {
  const queryClient = useQueryClient()
  const [dias, setDias] = useState<DiasGarantia>(diasGuardados)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  async function guardar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    if (guardando) return
    setGuardando(true)
    setError(null)
    setExito(false)
    try {
      const respuesta = await api.put<AjusteGarantia>('/panel/ajustes/garantia', { dias })
      queryClient.setQueryData(CLAVE, respuesta.data)
      setDias(respuesta.data.dias)
      setExito(true)
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={(ev) => void guardar(ev)} className="grid gap-4">
      <fieldset disabled={guardando}>
        <legend className="mb-2 text-sm font-bold">Duración de la garantía</legend>
        <div className="grid grid-cols-3 gap-2">
          {OPCIONES.map((opcion) => (
            <label key={opcion} htmlFor={`garantia-dias-${opcion}`} className={`flex min-h-13 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-2 text-sm font-bold has-[:focus]:ring-2 has-[:focus]:ring-publico-acento has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-publico-superficie ${dias === opcion ? 'border-publico-tinta bg-publico-acento-tenue' : 'border-publico-linea hover:border-publico-linea-fuerte'}`}>
              <input id={`garantia-dias-${opcion}`} type="radio" name="garantia-dias" value={opcion} checked={dias === opcion} onChange={() => { setDias(opcion); setExito(false); setError(null) }} className={`size-4 shrink-0 accent-publico-tinta ${focoClaro}`} />
              {opcion} días
            </label>
          ))}
        </div>
      </fieldset>
      <div aria-live="polite" className="empty:hidden">{error && <Aviso tipo="error">{error}</Aviso>}{exito && <Aviso tipo="exito">Guardamos la garantía de {diasGuardados} días para tus próximas reparaciones.</Aviso>}</div>
      <Boton type="submit" cargando={guardando} disabled={dias === diasGuardados} className="justify-self-start">Guardar garantía</Boton>
    </form>
  )
}
