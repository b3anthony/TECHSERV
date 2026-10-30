import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { CampoTexto } from '../../componentes/publico/CampoTexto.tsx'
import { Resultado } from '../../componentes/publico/Resultado.tsx'
import { useEnvio } from '../../componentes/publico/useEnvio.ts'
import { ErrorCarga, EsqueletoLista, TarjetaPanel } from './comun.tsx'
import { useDatosCobro } from './datos.ts'
import type { DatosCobro, MetodoPago, PeticionDatosCobro } from './tiposPanel.ts'

type MetodoQr = 'YAPE' | 'PLIN'
type AccionQr = 'subir' | 'quitar'

function camposDe(datos: DatosCobro): PeticionDatosCobro {
  return {
    yapeNumero: datos.yapeNumero ?? '',
    plinNumero: datos.plinNumero ?? '',
    banco: datos.banco ?? '',
    titular: datos.titular ?? '',
    numeroCuenta: datos.numeroCuenta ?? '',
    cci: datos.cci ?? '',
  }
}

export function TarjetaDatosCobro({ aceptados }: { aceptados: MetodoPago[] }): ReactNode {
  const consulta = useDatosCobro()

  return (
    <TarjetaPanel titulo="Datos de cobro" icono="moneda">
      <p className="mb-4 text-sm text-publico-tinta-media">El técnico enseña estos datos al cliente cuando toca cobrar. Deja vacío lo que quieras quitar.</p>
      {consulta.isPending ? (
        <EsqueletoLista filas={3} alto="h-32" etiqueta="Cargando tus datos de cobro…" />
      ) : consulta.error ? (
        <ErrorCarga mensaje={mensajeDeError(consulta.error)} reintentar={() => void consulta.refetch()} />
      ) : (
        <FormularioDatosCobro datos={consulta.data} aceptados={aceptados} />
      )}
    </TarjetaPanel>
  )
}

function FormularioDatosCobro({ datos, aceptados }: { datos: DatosCobro; aceptados: MetodoPago[] }): ReactNode {
  const queryClient = useQueryClient()
  const { enviando, mensaje, errores, enviar } = useEnvio()
  // Los cambios de QR actualizan la consulta sin reemplazar lo escrito en el formulario.
  const [campos, setCampos] = useState<PeticionDatosCobro>(() => camposDe(datos))
  const [operacionQr, setOperacionQr] = useState<{ metodo: MetodoQr; accion: AccionQr } | null>(null)
  const [erroresQr, setErroresQr] = useState<Record<MetodoQr, string>>({ YAPE: '', PLIN: '' })

  function editar(campo: keyof PeticionDatosCobro, valor: string): void {
    setCampos((actual) => ({ ...actual, [campo]: valor }))
  }

  async function guardar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    await enviar(async () => {
      const respuesta = await api.put<DatosCobro>('/panel/ajustes/cobro', {
        yapeNumero: campos.yapeNumero.trim(),
        plinNumero: campos.plinNumero.trim(),
        banco: campos.banco.trim(),
        titular: campos.titular.trim(),
        numeroCuenta: campos.numeroCuenta.trim(),
        cci: campos.cci.trim(),
      })
      queryClient.setQueryData(['panel', 'ajustes', 'cobro'], respuesta.data)
      setCampos(camposDe(respuesta.data))
    }, 'Guardamos tus datos de cobro.')
  }

  async function cambiarQr(metodo: MetodoQr, accion: AccionQr, archivo?: File): Promise<void> {
    if (accion === 'subir' && !archivo) return
    setOperacionQr({ metodo, accion })
    setErroresQr((actual) => ({ ...actual, [metodo]: '' }))
    const imagen = new FormData()
    if (archivo) imagen.append('imagen', archivo)
    const nombre = metodo === 'YAPE' ? 'Yape' : 'Plin'

    await enviar(async () => {
      try {
        const ruta = `/panel/ajustes/cobro/qr/${metodo}`
        const respuesta = accion === 'subir'
          ? await api.post<DatosCobro>(ruta, imagen)
          : await api.delete<DatosCobro>(ruta)
        queryClient.setQueryData(['panel', 'ajustes', 'cobro'], respuesta.data)
      } catch (err) {
        setErroresQr((actual) => ({ ...actual, [metodo]: mensajeDeError(err) }))
        throw err
      }
    }, accion === 'subir' ? `Guardamos el QR de ${nombre}.` : `Quitamos el QR de ${nombre}.`)
    setOperacionQr(null)
  }

  return (
    <form noValidate onSubmit={guardar} className="grid gap-4">
      <Resultado mensaje={mensaje} />
      <BloqueBilletera
        metodo="YAPE" aceptado={aceptados.includes('YAPE')} numero={campos.yapeNumero} qr={datos.yapeQr}
        errorNumero={errores.yapeNumero} errorQr={erroresQr.YAPE || errores.yapeQr}
        ocupado={enviando} accion={operacionQr?.metodo === 'YAPE' ? operacionQr.accion : null}
        alEditar={(valor) => editar('yapeNumero', valor)} alSubir={(archivo) => void cambiarQr('YAPE', 'subir', archivo)} alQuitar={() => void cambiarQr('YAPE', 'quitar')}
      />
      <BloqueBilletera
        metodo="PLIN" aceptado={aceptados.includes('PLIN')} numero={campos.plinNumero} qr={datos.plinQr}
        errorNumero={errores.plinNumero} errorQr={erroresQr.PLIN || errores.plinQr}
        ocupado={enviando} accion={operacionQr?.metodo === 'PLIN' ? operacionQr.accion : null}
        alEditar={(valor) => editar('plinNumero', valor)} alSubir={(archivo) => void cambiarQr('PLIN', 'subir', archivo)} alQuitar={() => void cambiarQr('PLIN', 'quitar')}
      />

      <fieldset className={`min-w-0 rounded-xl border border-publico-linea p-3 sm:p-4 ${aceptados.includes('TRANSFERENCIA') ? 'bg-publico-lienzo' : 'bg-publico-superficie-suave'}`}>
        <legend className={`px-1 text-base font-bold ${aceptados.includes('TRANSFERENCIA') ? 'text-publico-tinta' : 'text-publico-tinta-suave'}`}>Transferencia</legend>
        {!aceptados.includes('TRANSFERENCIA') && <p className="mb-3 text-xs text-publico-tinta-media">No aceptas transferencia: actívala arriba para que los clientes la vean.</p>}
        <p className="mb-4 text-xs text-publico-tinta-media">Indica banco, titular y número de cuenta o CCI.</p>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <CampoTexto id="cobro-banco" etiqueta="Banco" value={campos.banco} onChange={(ev) => editar('banco', ev.target.value)} error={errores.banco} maxLength={60} disabled={enviando} />
          <CampoTexto id="cobro-titular" etiqueta="Titular" value={campos.titular} onChange={(ev) => editar('titular', ev.target.value)} error={errores.titular} maxLength={120} disabled={enviando} />
          <CampoTexto id="cobro-numero-cuenta" etiqueta="Número de cuenta" ayuda="Solo dígitos y guiones, hasta 30 caracteres." value={campos.numeroCuenta} onChange={(ev) => editar('numeroCuenta', ev.target.value)} error={errores.numeroCuenta} maxLength={30} disabled={enviando} />
          <CampoTexto id="cobro-cci" etiqueta="CCI" ayuda="Exactamente 20 dígitos." inputMode="numeric" value={campos.cci} onChange={(ev) => editar('cci', ev.target.value)} error={errores.cci} maxLength={20} disabled={enviando} />
        </div>
        {errores.transferencia && <p role="alert" className="text-xs font-bold text-publico-peligro">{errores.transferencia}</p>}
      </fieldset>

      <div>
        <Boton type="submit" cargando={enviando && !operacionQr} disabled={enviando}>Guardar datos de cobro</Boton>
      </div>
    </form>
  )
}

interface BloqueBilleteraProps {
  metodo: MetodoQr
  aceptado: boolean
  numero: string
  qr: string | null
  errorNumero?: string
  errorQr?: string
  ocupado: boolean
  accion: AccionQr | null
  alEditar: (valor: string) => void
  alSubir: (archivo: File) => void
  alQuitar: () => void
}

function BloqueBilletera({ metodo, aceptado, numero, qr, errorNumero, errorQr, ocupado, accion, alEditar, alSubir, alQuitar }: BloqueBilleteraProps): ReactNode {
  const nombre = metodo === 'YAPE' ? 'Yape' : 'Plin'
  const id = `cobro-${metodo.toLowerCase()}`

  function elegir(ev: ChangeEvent<HTMLInputElement>): void {
    const archivo = ev.target.files?.[0]
    ev.target.value = ''
    if (archivo) alSubir(archivo)
  }

  return (
    <fieldset className={`min-w-0 rounded-xl border border-publico-linea p-3 sm:p-4 ${aceptado ? 'bg-publico-lienzo' : 'bg-publico-superficie-suave'}`}>
      <legend className={`px-1 text-base font-bold ${aceptado ? 'text-publico-tinta' : 'text-publico-tinta-suave'}`}>{nombre}</legend>
      {!aceptado && <p className="mb-3 text-xs text-publico-tinta-media">No aceptas {nombre}: actívalo arriba para que los clientes lo vean.</p>}
      <CampoTexto id={`${id}-numero`} etiqueta={`Número de ${nombre}`} tipo="tel" inputMode="numeric" ayuda="9 dígitos, empezando por 9." value={numero} onChange={(ev) => alEditar(ev.target.value)} error={errorNumero} maxLength={9} disabled={ocupado} />

      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
        {qr && <img src={qr} alt={`Código QR de ${nombre} del taller`} width={144} height={144} className="size-36 rounded-lg border border-publico-linea bg-publico-superficie object-contain" />}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`${id}-qr`} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-publico-linea-fuerte bg-publico-superficie px-4 py-2.5 text-sm font-bold hover:bg-publico-acento-tenue has-[:focus]:ring-2 has-[:focus]:ring-publico-acento has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-publico-superficie ${ocupado ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
              <Icono nombre="camara" className="size-4" />
              {accion === 'subir' ? 'Subiendo…' : qr ? 'Cambiar QR' : 'Subir QR'}
              <input id={`${id}-qr`} type="file" accept="image/jpeg,image/png,image/webp" disabled={ocupado} onChange={elegir} aria-invalid={errorQr ? true : undefined} aria-describedby={`${id}-qr-ayuda ${id}-qr-error`} className={`sr-only ${focoClaro}`} />
            </label>
            {qr && <Boton type="button" variante="peligro" onClick={alQuitar} disabled={ocupado} cargando={accion === 'quitar'}>Quitar<span className="sr-only"> QR de {nombre}</span></Boton>}
          </div>
          <p id={`${id}-qr-ayuda`} className="mt-2 text-xs text-publico-tinta-suave">JPG, PNG o WebP. Máximo 5 MB.</p>
          <p id={`${id}-qr-error`} role="alert" className="mt-1 min-h-5 text-xs font-bold text-publico-peligro">{errorQr ?? ''}</p>
        </div>
      </div>
    </fieldset>
  )
}
