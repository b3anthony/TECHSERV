import { startTransition, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { AreaTexto } from '../../componentes/publico/AreaTexto.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { CampoTexto } from '../../componentes/publico/CampoTexto.tsx'
import { EditorHorario } from '../../componentes/publico/EditorHorario.tsx'
import { Resultado } from '../../componentes/publico/Resultado.tsx'
import { useEnvio } from '../../componentes/publico/useEnvio.ts'
import { aHorarios, diasEditables, problemaHorario } from '../../componentes/publico/horario.ts'
import type { DiaEditable } from '../../componentes/publico/horario.ts'
import { useSesion } from '../../sesion/SesionProvider.tsx'
import { CabeceraPagina, EsqueletoLista, ErrorCarga, TarjetaPanel } from './comun.tsx'
import { ICONO_ESPECIALIDAD, METODOS_PAGO, contenedorPanel, enlaceSuave, soles } from './formato.ts'
import { useAjustes } from './datos.ts'
import { TarjetaDatosCobro } from './TarjetaDatosCobro.tsx'
import type { AjustesTaller, MetodoPago } from './tiposPanel.ts'
import { TarjetaGarantia } from './TarjetaGarantia.tsx'
import type { ConfirmacionCuentaEliminada } from '../CuentaEliminada.tsx'

/** Lo que hay que escribir para cerrar la cuenta. Igual que en el servidor. */
const PALABRA_CONFIRMACION = 'ELIMINAR'

export function Ajustes(): ReactNode {
  const ajustes = useAjustes()

  return (
    <div className={contenedorPanel}>
      <CabeceraPagina titulo="Ajustes" detalle="Tu cuenta, los datos de tu taller, cuándo atiendes y cómo te pueden pagar." />

      {ajustes.isPending ? (
        <EsqueletoLista filas={4} alto="h-40" etiqueta="Cargando tus ajustes…" />
      ) : ajustes.error ? (
        <ErrorCarga mensaje={mensajeDeError(ajustes.error)} reintentar={() => void ajustes.refetch()} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <SeccionCuenta datos={ajustes.data} />
          <SeccionNegocio datos={ajustes.data} />
          <TarjetaGarantia />
          <SeccionHorario datos={ajustes.data} />
          <div className="grid gap-6">
            <SeccionMetodosPago datos={ajustes.data} />
            <TarjetaDatosCobro aceptados={ajustes.data.metodosPago} />
            <SeccionClave />
          </div>
          <SeccionEliminar razonSocial={ajustes.data.negocio.razonSocial} email={ajustes.data.cuenta.email} />
        </div>
      )}
    </div>
  )
}

/* ─── Tu cuenta ─── */

function SeccionCuenta({ datos }: { datos: AjustesTaller }): ReactNode {
  const queryClient = useQueryClient()
  const { refrescar } = useSesion()
  const { enviando, mensaje, errores, enviar, setErrores } = useEnvio()
  const [nombres, setNombres] = useState(datos.cuenta.nombres)
  const [apellidos, setApellidos] = useState(datos.cuenta.apellidos)
  const [telefono, setTelefono] = useState(datos.cuenta.telefono ?? '')

  async function guardar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    const locales: Record<string, string> = {}
    if (!nombres.trim()) locales.nombres = 'Escribe tus nombres'
    if (!apellidos.trim()) locales.apellidos = 'Escribe tus apellidos'
    if (!/^9\d{8}$/.test(telefono.trim())) locales.telefono = 'El celular tiene 9 dígitos y empieza por 9'
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }
    await enviar(async () => {
      const r = await api.put<AjustesTaller>('/panel/ajustes/cuenta', { nombres: nombres.trim(), apellidos: apellidos.trim(), telefono: telefono.trim() })
      queryClient.setQueryData(['panel', 'ajustes'], r.data)
      await refrescar()
    }, 'Guardamos tus datos.')
  }

  return (
    <TarjetaPanel titulo="Tu cuenta" icono="equipo">
      <Resultado mensaje={mensaje} />
      <form noValidate onSubmit={guardar} className="grid gap-x-4 sm:grid-cols-2">
        <CampoTexto id="cuenta-nombres" etiqueta="Nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} error={errores.nombres} autoComplete="given-name" maxLength={80} />
        <CampoTexto id="cuenta-apellidos" etiqueta="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} error={errores.apellidos} autoComplete="family-name" maxLength={80} />
        <div className="grid gap-1.5 pb-5">
          <p className="text-sm font-bold">Correo</p>
          <p className="flex min-h-13 min-w-0 items-center gap-2 rounded-lg bg-publico-superficie-suave px-3.5 text-publico-tinta-media">
            <Icono nombre="correo" className="size-4 shrink-0" /><span className="truncate" title={datos.cuenta.email}>{datos.cuenta.email}</span>
          </p>
        </div>
        <CampoTexto id="cuenta-telefono" etiqueta="Número de celular" tipo="tel" inputMode="numeric" placeholder="9 dígitos" value={telefono} onChange={(e) => setTelefono(e.target.value)} error={errores.telefono} autoComplete="tel-national" maxLength={9} />
        <div className="sm:col-span-2">
          <Boton type="submit" cargando={enviando}>Guardar cambios</Boton>
        </div>
      </form>
    </TarjetaPanel>
  )
}

/* ─── Tu negocio ─── */

function SeccionNegocio({ datos }: { datos: AjustesTaller }): ReactNode {
  const queryClient = useQueryClient()
  const { enviando, mensaje, errores, enviar, setErrores } = useEnvio()
  const n = datos.negocio
  const [descripcion, setDescripcion] = useState(n.descripcion ?? '')
  const [telefono, setTelefono] = useState(n.telefono ?? '')
  const [direccion, setDireccion] = useState(n.direccion)
  const [distrito, setDistrito] = useState(n.distrito)

  async function guardar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    const locales: Record<string, string> = {}
    if (telefono.trim() && !/^\d{9}$/.test(telefono.trim())) locales.telefono = 'El teléfono debe tener 9 dígitos'
    if (!direccion.trim()) locales.direccion = 'Escribe la dirección del negocio'
    if (!distrito.trim()) locales.distrito = 'Escribe el distrito'
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }
    await enviar(async () => {
      const r = await api.put<AjustesTaller>('/panel/ajustes/negocio', {
        descripcion: descripcion.trim(), telefono: telefono.trim(), direccion: direccion.trim(), distrito: distrito.trim(),
      })
      queryClient.setQueryData(['panel', 'ajustes'], r.data)
    }, 'Guardamos los datos de tu negocio.')
  }

  const esp = datos.especialidad

  return (
    <TarjetaPanel titulo="Tu negocio" icono="casa">
      <Resultado mensaje={mensaje} />
      <dl className="mb-5 grid gap-3 rounded-xl bg-publico-lienzo p-4 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs text-publico-tinta-suave">Razón social</dt>
          <dd className="mt-0.5 font-bold break-words">{n.razonSocial}</dd>
        </div>
        <div>
          <dt className="text-xs text-publico-tinta-suave">RUC</dt>
          <dd className="mt-0.5 font-bold tabular-nums">{n.ruc}</dd>
        </div>
        {esp && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-publico-tinta-suave">Especialidad</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-2 font-bold">
                <Icono nombre={ICONO_ESPECIALIDAD[esp.especialidad]} className="size-4" />{esp.titulo}
              </span>
              <span className="text-publico-tinta-media tabular-nums">{soles(esp.tarifaBase)} por visita</span>
              <Link to="/panel/precios" className={`${enlaceSuave} -my-2 ml-auto`}>Cambiar la tarifa</Link>
            </dd>
          </div>
        )}
      </dl>

      <form noValidate onSubmit={guardar} className="grid gap-x-4 sm:grid-cols-2">
        <AreaTexto id="negocio-descripcion" etiqueta="Descripción (opcional)" ayuda="Aparece en el catálogo, junto a tu tarifa." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} error={errores.descripcion} max={1000} rows={3} className="sm:col-span-2" />
        <CampoTexto id="negocio-telefono" etiqueta="Teléfono del negocio (opcional)" tipo="tel" inputMode="numeric" placeholder="9 dígitos" value={telefono} onChange={(e) => setTelefono(e.target.value)} error={errores.telefono} maxLength={9} />
        <CampoTexto id="negocio-distrito" etiqueta="Distrito" value={distrito} onChange={(e) => setDistrito(e.target.value)} error={errores.distrito} maxLength={60} />
        <CampoTexto id="negocio-direccion" etiqueta="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} error={errores.direccion} maxLength={200} className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <Boton type="submit" cargando={enviando}>Guardar cambios</Boton>
        </div>
      </form>
    </TarjetaPanel>
  )
}

/* ─── Horario de atención ─── */

function SeccionHorario({ datos }: { datos: AjustesTaller }): ReactNode {
  const queryClient = useQueryClient()
  const { enviando, mensaje, enviar, setMensaje } = useEnvio()
  const [dias, setDias] = useState<DiaEditable[]>(() => diasEditables(datos.horarios))
  const [error, setError] = useState<string | null>(null)

  async function guardar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    const problema = problemaHorario(dias)
    setError(problema)
    if (problema) {
      setMensaje(null)
      return
    }
    await enviar(async () => {
      const r = await api.put<AjustesTaller>('/panel/ajustes/horario', { horarios: aHorarios(dias) })
      queryClient.setQueryData(['panel', 'ajustes'], r.data)
    }, 'Guardamos tu horario. Las visitas que ya estaban reservadas no cambian.')
  }

  return (
    <TarjetaPanel titulo="Horario de atención" icono="reloj">
      <Resultado mensaje={mensaje} />
      <form noValidate onSubmit={guardar} className="grid gap-2">
        <EditorHorario id="ajustes-horario" dias={dias} alCambiar={setDias} error={error} deshabilitado={enviando} leyendaOculta />
        <div>
          <Boton type="submit" cargando={enviando}>Guardar horario</Boton>
        </div>
      </form>
    </TarjetaPanel>
  )
}

/* ─── Métodos de pago ─── */

function SeccionMetodosPago({ datos }: { datos: AjustesTaller }): ReactNode {
  const queryClient = useQueryClient()
  const { enviando, mensaje, enviar, setMensaje } = useEnvio()
  const [elegidos, setElegidos] = useState<MetodoPago[]>(datos.metodosPago)
  const [error, setError] = useState<string | null>(null)

  function alternar(m: MetodoPago): void {
    setElegidos((actual) => (actual.includes(m) ? actual.filter((x) => x !== m) : [...actual, m]))
  }

  async function guardar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    if (elegidos.length === 0) {
      setError('Acepta al menos un método de pago')
      setMensaje(null)
      return
    }
    setError(null)
    await enviar(async () => {
      const r = await api.put<AjustesTaller>('/panel/ajustes/metodos-pago', { metodos: elegidos })
      queryClient.setQueryData(['panel', 'ajustes'], r.data)
    }, 'Guardamos los métodos de pago que aceptas.')
  }

  return (
    <TarjetaPanel titulo="Métodos de pago" icono="moneda">
      <Resultado mensaje={mensaje} />
      <form noValidate onSubmit={guardar}>
        <fieldset aria-describedby="metodos-ayuda metodos-error">
          <legend className="text-sm font-bold">¿Cómo te pueden pagar?</legend>
          <p id="metodos-ayuda" className="mt-1 mb-3 text-xs text-publico-tinta-suave">Solo estos aparecerán al registrar un cobro, en el panel y en la página del técnico.</p>
          <div className="grid grid-cols-2 gap-2">
            {METODOS_PAGO.map((m) => {
              const marcado = elegidos.includes(m.valor)
              return (
                <label key={m.valor} className={`flex min-h-13 cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 text-sm font-bold has-[:focus]:ring-2 has-[:focus]:ring-publico-acento has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-publico-superficie ${marcado ? 'border-publico-tinta bg-publico-acento-tenue' : 'border-publico-linea hover:border-publico-linea-fuerte'}`}>
                  <input type="checkbox" checked={marcado} onChange={() => alternar(m.valor)} disabled={enviando} className="sr-only" />
                  <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${marcado ? 'border-publico-tinta bg-publico-tinta text-publico-acento' : 'border-publico-linea-fuerte bg-publico-superficie'}`}>
                    {marcado && <Icono nombre="visto" className="size-3.5" />}
                  </span>
                  {m.texto}
                </label>
              )
            })}
          </div>
          <p id="metodos-error" role="alert" className="mt-1.5 min-h-5 text-xs font-bold text-publico-peligro">{error ?? ''}</p>
        </fieldset>
        <Boton type="submit" cargando={enviando}>Guardar métodos</Boton>
      </form>
    </TarjetaPanel>
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
      await api.put('/panel/ajustes/clave', { claveActual: actual, claveNueva: nueva })
    }, 'Cambiamos tu contraseña. Úsala la próxima vez que entres.')
    if (ok) {
      setActual('')
      setNueva('')
      setRepetida('')
    }
  }

  return (
    <TarjetaPanel titulo="Contraseña" icono="documento">
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
    </TarjetaPanel>
  )
}

/* ─── Eliminar cuenta ─── */

function SeccionEliminar({ razonSocial, email }: { razonSocial: string; email: string }): ReactNode {
  const navigate = useNavigate()
  const { olvidarSesion } = useSesion()
  const { enviando, mensaje, errores, enviar } = useEnvio()
  const [abierto, setAbierto] = useState(false)
  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')

  const listo = clave.length > 0 && confirmacion.trim().toUpperCase() === PALABRA_CONFIRMACION

  async function eliminar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    if (!listo) return
    const ok = await enviar(async () => {
      await api.post('/panel/ajustes/eliminar-cuenta', { clave, confirmacion: confirmacion.trim() })
    }, 'Tu cuenta quedó cerrada.')
    if (!ok) return
    // La ruta y la sesión cambian juntas para que RutaProtegida no redirija a /entrar.
    startTransition(() => {
      navigate('/cuenta-eliminada', {
        replace: true,
        state: { tipo: 'administrador', email } satisfies ConfirmacionCuentaEliminada,
      })
      olvidarSesion()
    })
  }

  function cancelar(): void {
    setAbierto(false)
    setClave('')
    setConfirmacion('')
  }

  return (
    <section aria-labelledby="titulo-eliminar" className="rounded-2xl border border-publico-peligro/40 bg-publico-superficie p-4 shadow-sm shadow-publico-tinta/5 sm:p-5 lg:col-span-2">
      <h2 id="titulo-eliminar" className="flex items-center gap-2 text-base font-bold text-publico-peligro">
        <span className="grid size-8 place-items-center rounded-lg bg-publico-superficie-suave"><Icono nombre="cerrar" className="size-4" /></span>
        Eliminar cuenta
      </h2>
      <div className="mt-3 max-w-3xl text-sm text-publico-tinta-media">
        <p>Si cierras la cuenta de <b className="text-publico-tinta">{razonSocial}</b>:</p>
        <ul className="mt-2 grid list-disc gap-1 pl-5">
          <li>Tu taller deja de aparecer en el catálogo y nadie más podrá reservarte.</li>
          <li>Las visitas que aún no empezaron se cancelan. Si hay alguna en camino o en proceso, tiene que terminar antes.</li>
          <li>Ni tú ni tus técnicos podrán volver a entrar, y sus correos quedan libres.</li>
          <li>Tus clientes conservan el historial de sus órdenes.</li>
        </ul>
        <p className="mt-2 font-bold text-publico-tinta">No se puede deshacer.</p>
      </div>

      <Resultado mensaje={mensaje} />

      {abierto ? (
        <form noValidate onSubmit={eliminar} className="mt-4 grid max-w-xl gap-x-4 sm:grid-cols-2">
          <CampoTexto id="eliminar-clave" etiqueta="Tu contraseña" tipo="password" autoComplete="current-password" autoFocus value={clave} onChange={(e) => setClave(e.target.value)} error={errores.clave} />
          <CampoTexto id="eliminar-confirmacion" etiqueta={`Escribe ${PALABRA_CONFIRMACION} para confirmar`} autoComplete="off" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} error={errores.confirmacion} />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Boton type="button" variante="secundario" onClick={cancelar} disabled={enviando}>No, mantener mi cuenta</Boton>
            <Boton type="submit" variante="peligro" cargando={enviando} disabled={!listo}>Eliminar mi cuenta</Boton>
          </div>
        </form>
      ) : (
        <Boton type="button" variante="peligro" onClick={() => setAbierto(true)} className="mt-4">Eliminar cuenta…</Boton>
      )}
    </section>
  )
}
