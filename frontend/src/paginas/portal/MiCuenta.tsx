import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import type { IconoNombre } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { CampoTexto } from '../../componentes/publico/CampoTexto.tsx'
import { Resultado } from '../../componentes/publico/Resultado.tsx'
import { Selector } from '../../componentes/publico/Selector.tsx'
import { Tarjeta } from '../../componentes/publico/Tarjeta.tsx'
import { useEnvio } from '../../componentes/publico/useEnvio.ts'
import { useSesion } from '../../sesion/SesionProvider.tsx'
import { DISTRITOS_TRUJILLO } from './distritos.ts'

/** Coincide con CuentaCliente.java. Los campos vacíos no llegan. */
interface CuentaCliente {
  nombres: string
  apellidos: string
  email: string
  telefono?: string | null
  direccion?: string | null
  referencia?: string | null
  distrito?: string | null
}

/** Los días que tiene para volver a entrar y recuperarla. Igual que en el servidor. */
const DIAS_PARA_REACTIVAR = 30

const CLAVE_CONSULTA = ['mi-cuenta']

/** Los ajustes del cliente: sus datos, su contraseña y desactivar la cuenta. */
export function MiCuenta(): ReactNode {
  const cuenta = useQuery<CuentaCliente>({
    queryKey: CLAVE_CONSULTA,
    queryFn: async () => (await api.get<CuentaCliente>('/mi-cuenta')).data,
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <header className="py-6 lg:pt-10 lg:pb-8">
        <p className="text-sm text-publico-tinta-suave"><Link to="/" className={`underline decoration-publico-acento underline-offset-4 ${focoClaro}`}>Inicio</Link> / Mi cuenta</p>
        <h1 className="mt-2 text-[clamp(2rem,1.3rem+2.5vw,3rem)] leading-[1.12] font-bold tracking-[-0.035em]">Mi cuenta</h1>
        <p className="mt-2.5 max-w-2xl text-[1.0625rem] leading-[1.55] text-publico-tinta-media">Tus datos, tu contraseña y, si lo necesitas, desactivar tu cuenta.</p>
      </header>

      {cuenta.isPending ? (
        <div className="grid gap-6 lg:grid-cols-2" aria-hidden="true">
          <div className="h-96 rounded-2xl bg-publico-superficie-suave motion-safe:animate-pulse" />
          <div className="h-72 rounded-2xl bg-publico-superficie-suave motion-safe:animate-pulse" />
          <p className="sr-only" role="status">Cargando tu cuenta…</p>
        </div>
      ) : cuenta.error ? (
        <Aviso tipo="error">
          {mensajeDeError(cuenta.error)}{' '}
          <button type="button" onClick={() => void cuenta.refetch()} className={`font-bold underline decoration-publico-acento underline-offset-4 ${focoClaro}`}>Reintentar</button>
        </Aviso>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <SeccionDatos datos={cuenta.data} />
          <SeccionClave />
          <SeccionDesactivar />
        </div>
      )}
    </div>
  )
}

function TituloSeccion({ id, icono, children }: { id: string; icono: IconoNombre; children: ReactNode }): ReactNode {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-2.5 text-xl font-bold">
      <span aria-hidden="true" className="grid size-9 place-items-center rounded-lg bg-publico-acento-tenue"><Icono nombre={icono} className="size-4" /></span>
      {children}
    </h2>
  )
}

/* ─── Tus datos ─── */

function SeccionDatos({ datos }: { datos: CuentaCliente }): ReactNode {
  const queryClient = useQueryClient()
  const { refrescar } = useSesion()
  const { enviando, mensaje, errores, enviar, setErrores } = useEnvio()
  const [nombres, setNombres] = useState(datos.nombres)
  const [apellidos, setApellidos] = useState(datos.apellidos)
  const [telefono, setTelefono] = useState(datos.telefono ?? '')
  const [direccion, setDireccion] = useState(datos.direccion ?? '')
  const [referencia, setReferencia] = useState(datos.referencia ?? '')
  const [distrito, setDistrito] = useState(datos.distrito ?? '')
  // Un distrito guardado antes que ya no esté en la lista se sigue pudiendo ver y conservar.
  const distritos = datos.distrito && !DISTRITOS_TRUJILLO.includes(datos.distrito) ? [datos.distrito, ...DISTRITOS_TRUJILLO] : DISTRITOS_TRUJILLO

  async function guardar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    const locales: Record<string, string> = {}
    if (!nombres.trim()) locales.nombres = 'Escribe tus nombres'
    if (!apellidos.trim()) locales.apellidos = 'Escribe tus apellidos'
    if (telefono.trim() && !/^9\d{8}$/.test(telefono.trim())) locales.telefono = 'El celular tiene 9 dígitos y empieza por 9'
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }
    await enviar(async () => {
      const r = await api.put<CuentaCliente>('/mi-cuenta', {
        nombres: nombres.trim(), apellidos: apellidos.trim(), telefono: telefono.trim(),
        direccion: direccion.trim(), referencia: referencia.trim(), distrito,
      })
      queryClient.setQueryData(CLAVE_CONSULTA, r.data)
      await refrescar()
    }, 'Guardamos tus datos.')
  }

  return (
    <Tarjeta aria-labelledby="titulo-datos" className="lg:row-span-2">
      <TituloSeccion id="titulo-datos" icono="equipo">Tus datos</TituloSeccion>
      <Resultado mensaje={mensaje} />
      <form noValidate onSubmit={guardar} className="grid items-start gap-x-4 sm:grid-cols-2">
        <CampoTexto id="cuenta-nombres" etiqueta="Nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} error={errores.nombres} autoComplete="given-name" maxLength={80} />
        <CampoTexto id="cuenta-apellidos" etiqueta="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} error={errores.apellidos} autoComplete="family-name" maxLength={80} />
        <div className="grid gap-1.5 pb-5">
          <p className="text-sm font-bold">Correo</p>
          <p className="flex min-h-13 min-w-0 items-center gap-2 rounded-lg bg-publico-superficie-suave px-3.5 text-publico-tinta-media">
            <Icono nombre="correo" className="size-4 shrink-0" /><span className="truncate" title={datos.email}>{datos.email}</span>
          </p>
          <p className="text-xs text-publico-tinta-suave">Es con el que entras: no se puede cambiar.</p>
        </div>
        <CampoTexto id="cuenta-telefono" etiqueta="Celular (opcional)" tipo="tel" inputMode="numeric" placeholder="9 dígitos" ayuda="El técnico te llama a este número." value={telefono} onChange={(e) => setTelefono(e.target.value)} error={errores.telefono} autoComplete="tel-national" maxLength={9} />
        <CampoTexto id="cuenta-direccion" etiqueta="Dirección (opcional)" placeholder="Calle, número y urbanización" value={direccion} onChange={(e) => setDireccion(e.target.value)} error={errores.direccion} autoComplete="street-address" maxLength={200} className="sm:col-span-2" />
        <CampoTexto id="cuenta-referencia" etiqueta="Referencia (opcional)" placeholder="Ej. frente al parque" value={referencia} onChange={(e) => setReferencia(e.target.value)} error={errores.referencia} maxLength={200} />
        <Selector id="cuenta-distrito" etiqueta="Distrito (opcional)" value={distrito} onChange={(e) => setDistrito(e.target.value)} error={errores.distrito}>
          <option value="">Sin distrito</option>
          {distritos.map((d) => <option key={d} value={d}>{d}</option>)}
        </Selector>
        <div className="sm:col-span-2">
          <Boton type="submit" cargando={enviando}>Guardar cambios</Boton>
        </div>
      </form>
    </Tarjeta>
  )
}

/* ─── Contraseña ─── */

function SeccionClave(): ReactNode {
  const { enviando, mensaje, errores, enviar, setErrores } = useEnvio()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')

  async function guardar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    const locales: Record<string, string> = {}
    if (!actual) locales.claveActual = 'Escribe tu contraseña actual'
    if (nueva.length < 8) locales.claveNueva = 'La contraseña debe tener al menos 8 caracteres'
    else if (nueva !== repetida) locales.repetida = 'Las dos contraseñas no coinciden'
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }
    const ok = await enviar(async () => {
      await api.put('/mi-cuenta/clave', { claveActual: actual, claveNueva: nueva })
    }, 'Cambiamos tu contraseña. Úsala la próxima vez que entres.')
    if (ok) {
      setActual('')
      setNueva('')
      setRepetida('')
    }
  }

  return (
    <Tarjeta aria-labelledby="titulo-clave">
      <TituloSeccion id="titulo-clave" icono="documento">Contraseña</TituloSeccion>
      <Resultado mensaje={mensaje} />
      <form noValidate onSubmit={guardar} className="grid">
        <CampoTexto id="clave-actual" etiqueta="Contraseña actual" tipo="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} error={errores.claveActual} />
        <div className="grid items-start gap-x-4 sm:grid-cols-2">
          <CampoTexto id="clave-nueva" etiqueta="Contraseña nueva" tipo="password" autoComplete="new-password" ayuda="Al menos 8 caracteres." value={nueva} onChange={(e) => setNueva(e.target.value)} error={errores.claveNueva} />
          <CampoTexto id="clave-repetida" etiqueta="Repite la nueva" tipo="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} error={errores.repetida} />
        </div>
        <div>
          <Boton type="submit" cargando={enviando}>Cambiar contraseña</Boton>
        </div>
      </form>
    </Tarjeta>
  )
}

/* ─── Desactivar cuenta ─── */

const FECHA_LARGA = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })

function SeccionDesactivar(): ReactNode {
  const navigate = useNavigate()
  const { olvidarSesion } = useSesion()
  const { enviando, mensaje, errores, enviar } = useEnvio()
  const [abierto, setAbierto] = useState(false)
  const [clave, setClave] = useState('')

  async function desactivar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    if (!clave) return
    let hasta = ''
    const ok = await enviar(async () => {
      const r = await api.post<{ reactivableHasta: string }>('/mi-cuenta/desactivar', { clave })
      hasta = FECHA_LARGA.format(new Date(r.data.reactivableHasta))
    }, 'Tu cuenta quedó desactivada.')
    if (!ok) return
    // El servidor ya cerró la sesión: se borra aquí y se lleva a «Iniciar sesión»,
    // que es justo por donde se recupera.
    navigate('/entrar', {
      replace: true,
      state: { aviso: `Tu cuenta quedó desactivada. Si cambias de idea, inicia sesión antes del ${hasta} y la recuperas.` },
    })
    olvidarSesion()
  }

  function cancelar(): void {
    setAbierto(false)
    setClave('')
  }

  return (
    <section aria-labelledby="titulo-desactivar" className="rounded-2xl border border-publico-peligro/40 bg-publico-superficie p-4 shadow-lg shadow-publico-tinta/10 sm:p-6">
      <h2 id="titulo-desactivar" className="flex items-center gap-2.5 text-xl font-bold text-publico-peligro">
        <span aria-hidden="true" className="grid size-9 place-items-center rounded-lg bg-publico-superficie-suave"><Icono nombre="pausa" className="size-4" /></span>
        Desactivar cuenta
      </h2>
      <div className="mt-3 text-sm text-publico-tinta-media">
        <p>Si desactivas tu cuenta:</p>
        <ul className="mt-2 grid list-disc gap-1 pl-5">
          <li>No podrás reservar ni ver tus órdenes mientras esté desactivada.</li>
          <li>Las visitas que aún no empezaron se cancelan. Si hay una en camino o en proceso, tiene que terminar antes.</li>
          <li>Tienes {DIAS_PARA_REACTIVAR} días para recuperarla: basta con iniciar sesión con tu correo y tu contraseña.</li>
          <li>Pasados esos {DIAS_PARA_REACTIVAR} días se elimina: borramos tus datos personales y tu correo queda libre. Los talleres conservan las visitas que te hicieron, sin tu nombre.</li>
        </ul>
      </div>

      <div className="mt-4"><Resultado mensaje={mensaje} /></div>

      {abierto ? (
        <form noValidate onSubmit={desactivar} className="grid max-w-md">
          <CampoTexto id="desactivar-clave" etiqueta="Tu contraseña" tipo="password" autoComplete="current-password" autoFocus value={clave} onChange={(e) => setClave(e.target.value)} error={errores.clave} />
          <div className="flex flex-wrap gap-2">
            <Boton type="button" variante="secundario" onClick={cancelar} disabled={enviando}>No, mantener mi cuenta</Boton>
            <Boton type="submit" variante="peligro" cargando={enviando} disabled={!clave}>Desactivar mi cuenta</Boton>
          </div>
        </form>
      ) : (
        <Boton type="button" variante="peligro" onClick={() => setAbierto(true)}>Desactivar cuenta…</Boton>
      )}
    </section>
  )
}
