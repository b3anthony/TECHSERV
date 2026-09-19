import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { useSesion } from '../../sesion/SesionProvider.tsx'
import { Boton } from '../../componentes/Boton.tsx'
import { Cargando } from '../../componentes/Cargando.tsx'
import { AvisoError } from '../../componentes/AvisoError.tsx'
import { Vacio } from '../../componentes/Vacio.tsx'
import type { Especialidad, OrdenDetalle } from '../../tipos.ts'
import type {
  AgendaDia,
  EspecialidadItem,
  FotoCargada,
  NuevaReservaPayload,
  TallerItem,
} from './tiposPortal.ts'
import { formatearFechaHora, hoyString } from './fechas.ts'

const CLAVE_BORRADOR = 'techserv.reserva_borrador'
const MAX_FOTOS = 5
const MAX_BYTES_FOTO = 5 * 1024 * 1024 // 5 MB

const DISTRITOS_TRUJILLO = [
  'Trujillo',
  'El Porvenir',
  'Florencia de Mora',
  'Huanchaco',
  'La Esperanza',
  'Laredo',
  'Moche',
  'Salaverry',
  'Víctor Larco Herrera',
]

interface BorradorReserva {
  descripcionFalla?: string
  direccion?: string
  referencia?: string
  distrito?: string
  fecha?: string
  hora?: string
  nombre?: string
  telefono?: string
  correo?: string
  especialidad?: Especialidad
}

function leerBorradorInicial(): BorradorReserva | null {
  try {
    const raw = sessionStorage.getItem(CLAVE_BORRADOR)
    return raw ? (JSON.parse(raw) as BorradorReserva) : null
  } catch {
    return null
  }
}

export function CatalogoReserva(): ReactNode {
  const { usuario } = useSesion()
  const navigate = useNavigate()

  const borradorInicial = leerBorradorInicial()

  // Estados de catálogo
  const [especialidades, setEspecialidades] = useState<EspecialidadItem[]>([])
  const [cargandoEspecialidades, setCargandoEspecialidades] = useState(true)
  const [errorEspecialidades, setErrorEspecialidades] = useState<string | null>(null)

  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState<Especialidad | null>(
    () => borradorInicial?.especialidad ?? null,
  )

  const [talleres, setTalleres] = useState<TallerItem[]>([])
  const [cargandoTalleres, setCargandoTalleres] = useState(false)
  const [errorTalleres, setErrorTalleres] = useState<string | null>(null)

  const [tallerSeleccionado, setTallerSeleccionado] = useState<TallerItem | null>(null)

  const [fecha, setFecha] = useState<string>(() => borradorInicial?.fecha ?? hoyString())
  const [agenda, setAgenda] = useState<AgendaDia | null>(null)
  const [cargandoAgenda, setCargandoAgenda] = useState(false)
  const [errorAgenda, setErrorAgenda] = useState<string | null>(null)

  const [horaSeleccionada, setHoraSeleccionada] = useState<string>(
    () => borradorInicial?.hora ?? '10:00',
  )

  // Formulario
  const [descripcionFalla, setDescripcionFalla] = useState(
    () => borradorInicial?.descripcionFalla ?? '',
  )
  const [direccion, setDireccion] = useState(() => borradorInicial?.direccion ?? '')
  const [referencia, setReferencia] = useState(() => borradorInicial?.referencia ?? '')
  const [distrito, setDistrito] = useState(() => borradorInicial?.distrito ?? 'Trujillo')
  const [nombreCliente, setNombreCliente] = useState(
    () => borradorInicial?.nombre ?? usuario?.nombreCompleto ?? '',
  )
  const [telefonoCliente, setTelefonoCliente] = useState(() => borradorInicial?.telefono ?? '')
  const [correoCliente, setCorreoCliente] = useState(
    () => borradorInicial?.correo ?? usuario?.email ?? '',
  )

  // Fotos
  const [fotos, setFotos] = useState<FotoCargada[]>([])
  const [errorFotos, setErrorFotos] = useState<string | null>(null)

  // Errores de validación y estado de envío
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Modal de confirmación
  const [ordenConfirmada, setOrdenConfirmada] = useState<OrdenDetalle | null>(null)
  const [avisoFotosError, setAvisoFotosError] = useState<string | null>(null)

  // IDs de accesibilidad
  const idHeadingEspecialidad = useId()
  const idHeadingTalleres = useId()
  const idHeadingFormulario = useId()
  const idHeadingResumen = useId()
  const idInputArchivos = useId()
  const inputArchivosRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  // 1. Cargar especialidades
  useEffect(() => {
    let montado = true
    api
      .get<EspecialidadItem[]>('/catalogo/especialidades')
      .then((res) => {
        if (!montado) return
        setEspecialidades(res.data)
        if (res.data.length > 0) {
          setEspecialidadSeleccionada((prev) => {
            if (prev && res.data.some((e) => e.clave === prev)) return prev
            const electro = res.data.find((e) => e.clave === 'REPARACION_ELECTRODOMESTICOS')
            return electro ? electro.clave : res.data[0].clave
          })
        }
      })
      .catch((err) => {
        if (montado) setErrorEspecialidades(mensajeDeError(err))
      })
      .finally(() => {
        if (montado) setCargandoEspecialidades(false)
      })

    return () => {
      montado = false
    }
  }, [])

  function recargarEspecialidades() {
    setCargandoEspecialidades(true)
    setErrorEspecialidades(null)
    api
      .get<EspecialidadItem[]>('/catalogo/especialidades')
      .then((res) => {
        setEspecialidades(res.data)
      })
      .catch((err) => {
        setErrorEspecialidades(mensajeDeError(err))
      })
      .finally(() => {
        setCargandoEspecialidades(false)
      })
  }

  // 2. Cargar talleres cuando cambia la especialidad
  useEffect(() => {
    if (!especialidadSeleccionada) return
    let montado = true
    const esp = especialidadSeleccionada

    // La ruta del catalogo es /catalogo/mypes. Antes se intentaba primero
    // /catalogo/talleres, que NO existe: funcionaba por el reintento, pero
    // dejaba un 500 por peticion en el servidor.
    const peticion = api.get<TallerItem[]>(`/catalogo/mypes?especialidad=${esp}`)

    peticion
      .then((res) => {
        if (!montado) return
        setTalleres(res.data)
        if (res.data.length > 0) {
          setTallerSeleccionado((prev) => {
            if (prev && res.data.some((t) => t.id === prev.id)) {
              return res.data.find((t) => t.id === prev.id) ?? res.data[0]
            }
            return res.data[0]
          })
        } else {
          setTallerSeleccionado(null)
        }
      })
      .catch((err) => {
        if (montado) {
          setErrorTalleres(mensajeDeError(err))
          setTallerSeleccionado(null)
        }
      })
      .finally(() => {
        if (montado) setCargandoTalleres(false)
      })

    return () => {
      montado = false
    }
  }, [especialidadSeleccionada])

  function recargarTalleres() {
    if (especialidadSeleccionada) {
      setCargandoTalleres(true)
      setErrorTalleres(null)
      const peticion = api.get<TallerItem[]>(`/catalogo/mypes?especialidad=${especialidadSeleccionada}`)
      peticion
        .then((res) => {
          setTalleres(res.data)
        })
        .catch((err) => {
          setErrorTalleres(mensajeDeError(err))
        })
        .finally(() => {
          setCargandoTalleres(false)
        })
    }
  }

  // 3. Cargar agenda cuando cambia taller o fecha
  useEffect(() => {
    if (!tallerSeleccionado || !fecha) return
    let montado = true
    const tId = tallerSeleccionado.id

    const peticion = api.get<AgendaDia>(`/catalogo/mypes/${tId}/agenda?fecha=${fecha}`)

    peticion
      .then((res) => {
        if (!montado) return
        setAgenda(res.data)
        const franjas = res.data.franjas
        const actualDisponible = franjas.find(
          (f) => f.hora.startsWith(horaSeleccionada) && f.disponible,
        )
        if (!actualDisponible) {
          const primeraLibre = franjas.find((f) => f.disponible)
          if (primeraLibre) {
            setHoraSeleccionada(primeraLibre.hora.substring(0, 5))
          }
        }
      })
      .catch((err) => {
        if (montado) {
          setErrorAgenda(mensajeDeError(err))
          setAgenda(null)
        }
      })
      .finally(() => {
        if (montado) setCargandoAgenda(false)
      })

    return () => {
      montado = false
    }
  }, [tallerSeleccionado, fecha, horaSeleccionada])

  // 5. Manejo de fotos
  function agregarArchivos(archivos: FileList | File[]) {
    setErrorFotos(null)
    const archivosArray = Array.from(archivos)

    if (fotos.length + archivosArray.length > MAX_FOTOS) {
      setErrorFotos(`Puedes adjuntar como máximo ${MAX_FOTOS} fotos en total.`)
      return
    }

    const nuevas: FotoCargada[] = []
    for (const archivo of archivosArray) {
      if (archivo.size > MAX_BYTES_FOTO) {
        setErrorFotos(`El archivo "${archivo.name}" supera el tamaño máximo permitido de 5 MB.`)
        continue
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
        setErrorFotos(`Solo se admiten fotos en formato JPG, PNG o WEBP.`)
        continue
      }
      nuevas.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        archivo,
        nombre: archivo.name,
        urlVistaPrevia: URL.createObjectURL(archivo),
      })
    }

    if (nuevas.length > 0) {
      setFotos((prev) => [...prev, ...nuevas])
    }
  }

  function quitarFoto(id: string) {
    setFotos((prev) => {
      const encontrada = prev.find((f) => f.id === id)
      if (encontrada) {
        URL.revokeObjectURL(encontrada.urlVistaPrevia)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  // Navegación con flechas para radiogroups
  function manejarTecladoEspecialidad(e: KeyboardEvent, index: number) {
    if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      const sig = (index + 1) % especialidades.length
      setEspecialidadSeleccionada(especialidades[sig].clave)
    } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault()
      const ant = (index - 1 + especialidades.length) % especialidades.length
      setEspecialidadSeleccionada(especialidades[ant].clave)
    }
  }

  function manejarTecladoTaller(e: KeyboardEvent, index: number) {
    if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      const sig = (index + 1) % talleres.length
      setTallerSeleccionado(talleres[sig])
    } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault()
      const ant = (index - 1 + talleres.length) % talleres.length
      setTallerSeleccionado(talleres[ant])
    }
  }

  // Validación del formulario
  function validar(): boolean {
    const err: Record<string, string> = {}

    if (!tallerSeleccionado) {
      err.taller = 'Debes seleccionar un taller disponible.'
    }
    if (!especialidadSeleccionada) {
      err.especialidad = 'Debes seleccionar una especialidad.'
    }
    if (!descripcionFalla.trim() || descripcionFalla.trim().length < 10) {
      err.descripcionFalla = 'Por favor describe la falla con al menos 10 caracteres.'
    }
    if (!direccion.trim()) {
      err.direccion = 'Por favor ingresa la dirección para la visita técnica.'
    }
    if (!distrito.trim()) {
      err.distrito = 'Por favor selecciona el distrito.'
    }
    if (!fecha) {
      err.fecha = 'Por favor selecciona una fecha válida.'
    }
    if (!horaSeleccionada) {
      err.hora = 'Por favor elige una franja horaria.'
    }

    setErrores(err)
    return Object.keys(err).length === 0
  }

  // Confirmar reserva
  async function manejarConfirmar(e: FormEvent) {
    e.preventDefault()
    setErrorEnvio(null)

    if (!validar()) {
      return
    }

    if (!tallerSeleccionado || !especialidadSeleccionada) return

    // Guardar siempre el borrador
    sessionStorage.setItem(
      CLAVE_BORRADOR,
      JSON.stringify({
        mypeId: tallerSeleccionado.id,
        especialidad: especialidadSeleccionada,
        descripcionFalla,
        direccion,
        referencia,
        distrito,
        fecha,
        hora: horaSeleccionada,
        nombre: nombreCliente,
        telefono: telefonoCliente,
        correo: correoCliente,
      }),
    )

    // Si el usuario no ha iniciado sesión, redirigir a /entrar
    if (!usuario) {
      navigate('/entrar', { state: { desde: '/' } })
      return
    }

    // Usuario autenticado: enviar POST /api/mis-ordenes
    setEnviando(true)
    const payload: NuevaReservaPayload = {
      mypeId: tallerSeleccionado.id,
      especialidad: especialidadSeleccionada,
      descripcionFalla: descripcionFalla.trim(),
      direccion: direccion.trim(),
      referencia: referencia.trim() ? referencia.trim() : null,
      distrito: distrito.trim(),
      fecha,
      hora: horaSeleccionada,
    }

    try {
      const res = await api.post<OrdenDetalle>('/mis-ordenes', payload)
      const ordenCreada = res.data
      setOrdenConfirmada(ordenCreada)
      sessionStorage.removeItem(CLAVE_BORRADOR)

      // Subir fotos si las hay
      if (fotos.length > 0) {
        const formData = new FormData()
        for (const f of fotos) {
          formData.append('fotos', f.archivo)
          formData.append('archivos', f.archivo)
        }
        try {
          await api.post(`/mis-ordenes/${ordenCreada.id}/fotos`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch {
          setAvisoFotosError(
            `Tu orden ${ordenCreada.codigo} se registró con éxito, pero ocurrió un problema al adjuntar las fotos. Podrás añadirlas luego en el seguimiento.`,
          )
        }
      }

      if (dialogRef.current && typeof dialogRef.current.showModal === 'function') {
        dialogRef.current.showModal()
      }
    } catch (err) {
      setErrorEnvio(mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  function cerrarModalYVerOrden() {
    if (dialogRef.current) {
      dialogRef.current.close()
    }
    if (ordenConfirmada) {
      navigate(`/mis-ordenes/${ordenConfirmada.id}`)
    } else {
      navigate('/mis-ordenes')
    }
  }

  const objetoEspecialidad = especialidades.find((e) => e.clave === especialidadSeleccionada)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Encabezado de la página */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
          Reserva tu servicio técnico a domicilio
        </h1>
        <p className="mt-1 text-base text-tinta-suave">
          Talleres de Trujillo, con precio y calificación a la vista.
        </p>
      </header>

      {/* Rejilla de 2 columnas (formulario y resumen lateral) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Columna principal */}
        <div className="flex flex-col gap-6">
          {/* 1. Selector de especialidad */}
          <section
            className="rounded-xl border border-linea bg-superficie p-6 shadow-xs"
            aria-labelledby={idHeadingEspecialidad}
          >
            <h2 id={idHeadingEspecialidad} className="text-lg font-bold text-tinta mb-4">
              Selector de especialidad
            </h2>

            {cargandoEspecialidades && <Cargando />}

            {errorEspecialidades && (
              <AvisoError mensaje={errorEspecialidades} reintentar={recargarEspecialidades} />
            )}

            {!cargandoEspecialidades && !errorEspecialidades && especialidades.length === 0 && (
              <Vacio
                titulo="No hay especialidades disponibles"
                detalle="En este momento no hay especialidades de atención disponibles."
              />
            )}

            {!cargandoEspecialidades && !errorEspecialidades && especialidades.length > 0 && (
              <div
                className="flex flex-col gap-3"
                role="radiogroup"
                aria-labelledby={idHeadingEspecialidad}
              >
                {especialidades.map((esp, idx) => {
                  const estaSeleccionada = especialidadSeleccionada === esp.clave
                  return (
                    <div
                      key={esp.clave}
                      role="radio"
                      aria-checked={estaSeleccionada}
                      tabIndex={estaSeleccionada ? 0 : -1}
                      onClick={() => setEspecialidadSeleccionada(esp.clave)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault()
                          setEspecialidadSeleccionada(esp.clave)
                        } else {
                          manejarTecladoEspecialidad(e, idx)
                        }
                      }}
                      className={`relative flex cursor-pointer items-start gap-3.5 rounded-lg p-4 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie ${
                        estaSeleccionada
                          ? 'border-2 border-accion bg-accion-tenue'
                          : 'border border-linea bg-superficie hover:border-linea-fuerte'
                      }`}
                    >
                      {/* Círculo indicador de radio accesible */}
                      <div
                        aria-hidden="true"
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-superficie ${
                          estaSeleccionada ? 'border-accion' : 'border-linea-fuerte'
                        }`}
                      >
                        {estaSeleccionada && (
                          <div className="h-2.5 w-2.5 rounded-full bg-accion" />
                        )}
                      </div>

                      <div className="flex flex-col">
                        <span className="text-base font-semibold text-tinta">{esp.titulo}</span>
                        <span className="text-sm text-tinta-suave">{esp.detalle}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* 2. Lista de talleres disponibles */}
          <section
            className="rounded-xl border border-linea bg-superficie p-6 shadow-xs"
            aria-labelledby={idHeadingTalleres}
          >
            <h2 id={idHeadingTalleres} className="text-lg font-bold text-tinta mb-4">
              Talleres disponibles
            </h2>

            {cargandoTalleres && <Cargando />}

            {errorTalleres && (
              <AvisoError mensaje={errorTalleres} reintentar={recargarTalleres} />
            )}

            {!cargandoTalleres && !errorTalleres && talleres.length === 0 && (
              <p className="text-sm text-tinta-suave">
                No hay talleres disponibles para esta especialidad en este momento.
              </p>
            )}

            {!cargandoTalleres && !errorTalleres && talleres.length > 0 && (
              <div
                className="flex flex-col gap-3"
                role="radiogroup"
                aria-labelledby={idHeadingTalleres}
              >
                {talleres.map((taller, idx) => {
                  const estaSeleccionado = tallerSeleccionado?.id === taller.id
                  return (
                    <div
                      key={taller.id}
                      role="radio"
                      aria-checked={estaSeleccionado}
                      tabIndex={estaSeleccionado ? 0 : -1}
                      onClick={() => setTallerSeleccionado(taller)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault()
                          setTallerSeleccionado(taller)
                        } else {
                          manejarTecladoTaller(e, idx)
                        }
                      }}
                      className={`relative flex cursor-pointer items-start gap-3.5 rounded-lg p-4 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie ${
                        estaSeleccionado
                          ? 'border-2 border-accion bg-accion-tenue'
                          : 'border border-linea bg-superficie hover:border-linea-fuerte'
                      }`}
                    >
                      <div
                        aria-hidden="true"
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-superficie ${
                          estaSeleccionado ? 'border-accion' : 'border-linea-fuerte'
                        }`}
                      >
                        {estaSeleccionado && (
                          <div className="h-2.5 w-2.5 rounded-full bg-accion" />
                        )}
                      </div>

                      <div className="flex flex-1 flex-col gap-1 min-w-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-base font-bold text-tinta">{taller.razonSocial}</span>
                          <span className="text-sm font-semibold text-tinta whitespace-nowrap">
                            Desde S/ {taller.tarifaBase.toFixed(2)} por visita
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-tinta-suave">
                          <span className="inline-flex items-center gap-1 font-semibold text-tinta">
                            <svg
                              className="h-4 w-4 text-pendiente fill-current shrink-0"
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {taller.promedio.toFixed(1)} de 5
                            <span className="font-normal text-tinta-suave">
                              ({taller.servicios} servicios)
                            </span>
                          </span>

                          <span aria-hidden="true" className="text-tinta-suave">
                            —
                          </span>

                          <span className="text-tinta-suave">
                            {taller.direccion}, {taller.distrito}
                          </span>

                          <span aria-hidden="true" className="text-tinta-suave">
                            —
                          </span>

                          {taller.atiendeHoy ? (
                            <span className="inline-flex items-center rounded-md border border-linea bg-superficie-suave px-2 py-0.5 text-xs font-semibold text-completada">
                              Atiende hoy
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-linea bg-superficie-suave px-2 py-0.5 text-xs font-medium text-tinta-suave">
                              Atiende desde mañana
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* 3. Formulario de reserva */}
          <section
            className="rounded-xl border border-linea bg-superficie p-6 shadow-xs"
            aria-labelledby={idHeadingFormulario}
          >
            <h2 id={idHeadingFormulario} className="text-lg font-bold text-tinta mb-4">
              Formulario de reserva
            </h2>

            <form onSubmit={manejarConfirmar} noValidate className="flex flex-col gap-5">
              {errorEnvio && (
                <div
                  role="alert"
                  className="rounded-lg border border-peligro bg-superficie p-4 text-sm text-peligro"
                >
                  {errorEnvio}
                </div>
              )}

              {/* ¿Qué está fallando? */}
              <div>
                <label htmlFor="falla" className="block text-sm font-semibold text-tinta mb-1">
                  ¿Qué está fallando?
                </label>
                <textarea
                  id="falla"
                  name="falla"
                  rows={3}
                  required
                  aria-invalid={errores.descripcionFalla ? true : undefined}
                  aria-describedby={errores.descripcionFalla ? 'falla-error' : undefined}
                  value={descripcionFalla}
                  onChange={(e) => {
                    setDescripcionFalla(e.target.value)
                    if (errores.descripcionFalla) {
                      setErrores((prev) => ({ ...prev, descripcionFalla: '' }))
                    }
                  }}
                  placeholder="Describe qué problema presenta tu aparato (mínimo 10 caracteres)"
                  className={`block w-full rounded-lg border px-3 py-2 text-sm text-tinta bg-superficie placeholder:text-tinta-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie ${
                    errores.descripcionFalla ? 'border-peligro' : 'border-linea-fuerte'
                  }`}
                />
                {errores.descripcionFalla && (
                  <p id="falla-error" role="alert" className="mt-1 text-xs text-peligro">
                    {errores.descripcionFalla}
                  </p>
                )}
              </div>

              {/* Fotos del problema (opcional) */}
              <div>
                <label
                  htmlFor={idInputArchivos}
                  id="label-fotos"
                  className="block text-sm font-semibold text-tinta mb-1"
                >
                  Fotos del problema (opcional, máximo 5 fotos de hasta 5 MB)
                </label>

                {/* Dropzone accesible */}
                <button
                  type="button"
                  onClick={() => inputArchivosRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (e.dataTransfer.files) {
                      agregarArchivos(e.dataTransfer.files)
                    }
                  }}
                  aria-labelledby="label-fotos texto-dropzone"
                  className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-linea-fuerte bg-lienzo p-5 text-center cursor-pointer hover:border-accion hover:bg-accion-tenue transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
                >
                  <svg
                    className="h-6 w-6 text-tinta-suave"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span id="texto-dropzone" className="text-sm text-tinta-suave">
                    Arrastra fotos del problema aquí o{' '}
                    <span className="font-semibold text-accion underline">elige archivos</span>
                  </span>
                </button>

                <input
                  ref={inputArchivosRef}
                  id={idInputArchivos}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files) {
                      agregarArchivos(e.target.files)
                    }
                  }}
                />

                {errorFotos && (
                  <p role="alert" className="mt-1 text-xs text-peligro">
                    {errorFotos}
                  </p>
                )}

                {/* Miniaturas de fotos cargadas */}
                {fotos.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {fotos.map((foto) => (
                      <div
                        key={foto.id}
                        className="flex items-center gap-3 rounded-md border border-linea bg-superficie p-2.5"
                      >
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-linea bg-superficie-suave"
                          aria-hidden="true"
                        >
                          <img
                            src={foto.urlVistaPrevia}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col min-w-0">
                          <span className="text-xs font-medium text-tinta truncate">
                            {foto.nombre}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => quitarFoto(foto.id)}
                          aria-label={`Quitar foto ${foto.nombre}`}
                          className="shrink-0 rounded-md border border-linea px-2.5 py-1 text-xs font-medium text-peligro hover:bg-superficie-suave focus:outline-none focus:ring-2 focus:ring-peligro focus:ring-offset-2 focus:ring-offset-superficie"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dirección */}
              <div>
                <label htmlFor="direccion" className="block text-sm font-semibold text-tinta mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  id="direccion"
                  name="direccion"
                  autoComplete="street-address"
                  required
                  placeholder="Ej. Jr. San Martín 450"
                  aria-invalid={errores.direccion ? true : undefined}
                  aria-describedby={errores.direccion ? 'direccion-error' : undefined}
                  value={direccion}
                  onChange={(e) => {
                    setDireccion(e.target.value)
                    if (errores.direccion) {
                      setErrores((prev) => ({ ...prev, direccion: '' }))
                    }
                  }}
                  className={`block w-full rounded-lg border px-3 py-2 text-sm text-tinta bg-superficie placeholder:text-tinta-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie ${
                    errores.direccion ? 'border-peligro' : 'border-linea-fuerte'
                  }`}
                />
                {errores.direccion && (
                  <p id="direccion-error" role="alert" className="mt-1 text-xs text-peligro">
                    {errores.direccion}
                  </p>
                )}
              </div>

              {/* Referencia (opcional) */}
              <div>
                <label htmlFor="referencia" className="block text-sm font-semibold text-tinta mb-1">
                  Referencia (opcional)
                </label>
                <input
                  type="text"
                  id="referencia"
                  name="referencia"
                  placeholder="Ej. A media cuadra del parque, rejas blancas"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="block w-full rounded-lg border border-linea-fuerte px-3 py-2 text-sm text-tinta bg-superficie placeholder:text-tinta-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
                />
              </div>

              {/* Distrito */}
              <div>
                <label htmlFor="distrito" className="block text-sm font-semibold text-tinta mb-1">
                  Distrito
                </label>
                <select
                  id="distrito"
                  name="distrito"
                  value={distrito}
                  onChange={(e) => setDistrito(e.target.value)}
                  className="block w-full rounded-lg border border-linea-fuerte px-3 py-2 text-sm text-tinta bg-superficie focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
                >
                  {DISTRITOS_TRUJILLO.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Fecha */}
                <div>
                  <label htmlFor="fecha" className="block text-sm font-semibold text-tinta mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    id="fecha"
                    name="fecha"
                    min={hoyString()}
                    required
                    value={fecha}
                    aria-invalid={errores.fecha ? true : undefined}
                    aria-describedby={errores.fecha ? 'fecha-error' : undefined}
                    onChange={(e) => setFecha(e.target.value)}
                    className={`block w-full rounded-lg border px-3 py-2 text-sm text-tinta bg-superficie focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie ${
                      errores.fecha ? 'border-peligro' : 'border-linea-fuerte'
                    }`}
                  />
                  {errores.fecha && (
                    <p id="fecha-error" role="alert" className="mt-1 text-xs text-peligro">
                      {errores.fecha}
                    </p>
                  )}
                </div>

                {/* Hora */}
                <div>
                  <span
                    id="label-hora"
                    className="block text-sm font-semibold text-tinta mb-1"
                  >
                    Hora de visita
                  </span>

                  {cargandoAgenda ? (
                    <div className="py-2">
                      <p className="text-xs text-tinta-suave">Consultando cupos…</p>
                    </div>
                  ) : errorAgenda ? (
                    <p className="text-xs text-peligro">{errorAgenda}</p>
                  ) : !agenda || agenda.franjas.length === 0 ? (
                    <Vacio
                      titulo="No hay horarios disponibles"
                      detalle="Ese día no hay horarios disponibles. Por favor, prueba con otra fecha."
                    />
                  ) : (
                    <div
                      className="grid grid-cols-4 gap-1.5"
                      role="radiogroup"
                      aria-labelledby="label-hora"
                    >
                      {agenda.franjas.map((franja) => {
                        const horaCorta = franja.hora.substring(0, 5)
                        const estaElegida = horaSeleccionada === horaCorta
                        const deshabilitada = !franja.disponible

                        return (
                          <button
                            key={franja.hora}
                            type="button"
                            role="radio"
                            aria-checked={estaElegida}
                            disabled={deshabilitada}
                            aria-disabled={deshabilitada}
                            onClick={() => {
                              if (!deshabilitada) {
                                setHoraSeleccionada(horaCorta)
                              }
                            }}
                            className={`flex min-h-[40px] items-center justify-center rounded-md px-1 py-1 text-xs font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie ${
                              estaElegida
                                ? 'border-2 border-accion bg-accion-tenue text-accion'
                                : deshabilitada
                                  ? 'cursor-not-allowed border border-linea bg-superficie-suave text-tinta-suave line-through opacity-60'
                                  : 'border border-linea-fuerte bg-superficie text-tinta hover:bg-superficie-suave'
                            }`}
                          >
                            {horaCorta}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {errores.hora && (
                    <p role="alert" className="mt-1 text-xs text-peligro">
                      {errores.hora}
                    </p>
                  )}
                </div>
              </div>

              {/* Tu nombre */}
              <div>
                <label htmlFor="nombre" className="block text-sm font-semibold text-tinta mb-1">
                  Tu nombre
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  autoComplete="name"
                  placeholder="Nombre y apellidos"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  className="block w-full rounded-lg border border-linea-fuerte px-3 py-2 text-sm text-tinta bg-superficie placeholder:text-tinta-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
                />
              </div>

              {/* Teléfono y Correo electrónico */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="telefono" className="block text-sm font-semibold text-tinta mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    autoComplete="tel"
                    placeholder="9 dígitos"
                    value={telefonoCliente}
                    onChange={(e) => setTelefonoCliente(e.target.value)}
                    className="block w-full rounded-lg border border-linea-fuerte px-3 py-2 text-sm text-tinta bg-superficie placeholder:text-tinta-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
                  />
                </div>

                <div>
                  <label htmlFor="correo" className="block text-sm font-semibold text-tinta mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    id="correo"
                    name="correo"
                    autoComplete="email"
                    placeholder="tu@correo.pe"
                    value={correoCliente}
                    onChange={(e) => setCorreoCliente(e.target.value)}
                    className="block w-full rounded-lg border border-linea-fuerte px-3 py-2 text-sm text-tinta bg-superficie placeholder:text-tinta-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
                  />
                </div>
              </div>
            </form>
          </section>
        </div>

        {/* Columna lateral: Resumen de reserva */}
        <aside className="lg:sticky lg:top-8" aria-label="Resumen de reserva">
          <div
            className="rounded-xl border border-linea bg-superficie p-6 shadow-xs"
            aria-labelledby={idHeadingResumen}
          >
            <h2
              id={idHeadingResumen}
              className="border-b border-linea pb-3 mb-4 text-lg font-bold text-tinta"
            >
              Resumen de reserva
            </h2>

            <div className="flex flex-col gap-4 mb-5">
              {/* Taller */}
              <div className="flex flex-col">
                <span className="text-xs text-tinta-suave">Taller elegido</span>
                <span className="text-sm font-semibold text-tinta">
                  {tallerSeleccionado ? tallerSeleccionado.razonSocial : '—'}
                </span>
              </div>

              {/* Especialidad */}
              <div className="flex flex-col">
                <span className="text-xs text-tinta-suave">Especialidad</span>
                <span className="text-sm font-semibold text-tinta">
                  {objetoEspecialidad ? objetoEspecialidad.titulo : '—'}
                </span>
              </div>

              {/* Fecha y hora */}
              <div className="flex flex-col">
                <span className="text-xs text-tinta-suave">Fecha y hora</span>
                <span className="text-sm font-semibold text-tinta">
                  {formatearFechaHora(fecha, horaSeleccionada)}
                </span>
              </div>

              <div className="h-px bg-linea my-1" />

              {/* Visita técnica */}
              <div className="flex items-baseline justify-between rounded-lg border border-linea bg-lienzo p-3.5">
                <span className="text-sm font-semibold text-tinta">Visita técnica:</span>
                <span className="text-base font-bold text-tinta">
                  {tallerSeleccionado
                    ? `desde S/ ${tallerSeleccionado.tarifaBase.toFixed(2)}`
                    : '—'}
                </span>
              </div>

              <p className="text-xs text-tinta-suave leading-relaxed">
                El costo final de repuestos y mano de obra se confirma tras el diagnóstico
              </p>
            </div>

            <Boton
              type="button"
              variante="principal"
              cargando={enviando}
              onClick={manejarConfirmar}
              className="w-full py-3 text-base font-semibold"
            >
              Confirmar reserva
            </Boton>
          </div>
        </aside>
      </div>

      {/* Modal de confirmación */}
      <dialog
        ref={dialogRef}
        aria-labelledby="dialog-reserva-titulo"
        className="fixed inset-0 m-auto max-w-lg w-[calc(100%-2rem)] rounded-xl border border-linea bg-superficie p-6 shadow-xl backdrop:bg-tinta/40"
      >
        {ordenConfirmada && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 id="dialog-reserva-titulo" className="text-xl font-bold text-tinta">
                Reserva registrada
              </h3>
              <p className="mt-1 text-sm text-tinta-suave">
                Tu solicitud de visita técnica ha sido enviada al taller seleccionado.
              </p>
            </div>

            {avisoFotosError && (
              <div
                role="alert"
                className="rounded-lg border border-pendiente bg-superficie-suave p-3 text-xs text-pendiente font-medium"
              >
                {avisoFotosError}
              </div>
            )}

            <div className="flex flex-col gap-2 rounded-lg border border-linea bg-lienzo p-4 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-tinta-suave">Código de orden:</span>
                <span className="font-bold text-tinta font-mono">{ordenConfirmada.codigo}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-tinta-suave">Taller:</span>
                <span className="font-semibold text-tinta text-right">
                  {tallerSeleccionado?.razonSocial}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-tinta-suave">Especialidad:</span>
                <span className="font-semibold text-tinta text-right">
                  {ordenConfirmada.etiquetaEspecialidad || objetoEspecialidad?.titulo}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-tinta-suave">Fecha y hora:</span>
                <span className="font-semibold text-tinta text-right">
                  {formatearFechaHora(
                    ordenConfirmada.fechaProgramada || fecha,
                    ordenConfirmada.horaProgramada || horaSeleccionada,
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-tinta-suave">Dirección:</span>
                <span className="font-semibold text-tinta text-right">
                  {ordenConfirmada.direccion}, {ordenConfirmada.distrito}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-tinta-suave">Visita técnica:</span>
                <span className="font-semibold text-tinta text-right">
                  desde S/ {tallerSeleccionado?.tarifaBase.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Boton
                type="button"
                variante="principal"
                onClick={cerrarModalYVerOrden}
                className="w-full sm:flex-1 font-semibold"
              >
                Ver seguimiento
              </Boton>
              <Boton
                type="button"
                variante="secundario"
                onClick={() => {
                  if (dialogRef.current) dialogRef.current.close()
                  navigate('/mis-ordenes')
                }}
                className="w-full sm:flex-1 font-semibold"
              >
                Ir a mis solicitudes
              </Boton>
            </div>
          </div>
        )}
      </dialog>
    </main>
  )
}
