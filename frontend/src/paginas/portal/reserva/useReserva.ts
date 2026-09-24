import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, mensajeDeError } from '../../../api/cliente.ts'
import { useSesion } from '../../../sesion/SesionProvider.tsx'
import type { Especialidad, OrdenDetalle } from '../../../tipos.ts'
import type {
  AgendaDia,
  EspecialidadItem,
  FotoCargada,
  NuevaReservaPayload,
  TallerItem,
} from '../tiposPortal.ts'
import { hoyString } from '../fechas.ts'
import { DISTRITOS_TRUJILLO } from '../distritos.ts'

const CLAVE_BORRADOR = 'techserv.reserva_borrador'
const MAX_FOTOS = 5
const MAX_BYTES_FOTO = 5 * 1024 * 1024 // 5 MB

interface BorradorReserva {
  mypeId?: number
  descripcionFalla?: string
  direccion?: string
  referencia?: string
  distrito?: string
  fecha?: string
  hora?: string
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

function fechaFinTira(inicio: string): string {
  const fin = new Date(`${inicio}T12:00:00`)
  fin.setDate(fin.getDate() + 6)
  return `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`
}

function fechaUrlValida(valor: string | null): valor is string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor < hoyString()) return false
  const fecha = new Date(`${valor}T00:00:00`)
  return !Number.isNaN(fecha.getTime()) &&
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}` === valor
}

export function useReserva() {
  const { usuario } = useSesion()
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const especialidadUrl = parametros.get('especialidad')
  const mypeUrl = parametros.get('mype')
  const fechaUrl = parametros.get('fecha')
  const distritoUrl = parametros.get('distrito')

  const borradorInicial = leerBorradorInicial()
  const valoresIniciales = useRef({
    especialidadUrl,
    mypeUrl,
    especialidadBorrador: borradorInicial?.especialidad,
    mypeBorrador: borradorInicial?.mypeId,
  })
  const mypeInicialPendiente = useRef(true)

  // Orden local de talleres, sin alterar la respuesta ni la selección
  const [ordenTalleres, setOrdenTalleres] = useState<'recomendados' | 'precio' | 'calificados'>('recomendados')

  // Estados de catálogo
  const [especialidades, setEspecialidades] = useState<EspecialidadItem[]>([])
  const [cargandoEspecialidades, setCargandoEspecialidades] = useState(true)
  const [errorEspecialidades, setErrorEspecialidades] = useState<string | null>(null)

  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState<Especialidad | null>(
    null,
  )

  const [talleres, setTalleres] = useState<TallerItem[]>([])
  const [cargandoTalleres, setCargandoTalleres] = useState(false)
  const [errorTalleres, setErrorTalleres] = useState<string | null>(null)

  const [tallerSeleccionado, setTallerSeleccionado] = useState<TallerItem | null>(null)

  const [fecha, setFecha] = useState<string>(() => fechaUrlValida(fechaUrl) ? fechaUrl : borradorInicial?.fecha ?? hoyString())
  const [inicioTira, setInicioTira] = useState<string>(() => {
    const hoy = hoyString()
    return fecha && (fecha < hoy || fecha > fechaFinTira(hoy)) ? fecha : hoy
  })
  function elegirFecha(nuevaFecha: string) {
    if (nuevaFecha && (nuevaFecha < inicioTira || nuevaFecha > fechaFinTira(inicioTira))) setInicioTira(nuevaFecha)
    setFecha(nuevaFecha)
  }
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
  const [distrito, setDistrito] = useState(() => distritoUrl && DISTRITOS_TRUJILLO.includes(distritoUrl) ? distritoUrl : borradorInicial?.distrito ?? 'Trujillo')
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
            const especialidadInicial = res.data.find((e) => e.clave === valoresIniciales.current.especialidadUrl)
            if (especialidadInicial) return especialidadInicial.clave
            const especialidadBorrador = valoresIniciales.current.especialidadBorrador
            if (especialidadBorrador && res.data.some((e) => e.clave === especialidadBorrador)) return especialidadBorrador
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
          const esSeleccionInicial = mypeInicialPendiente.current
          mypeInicialPendiente.current = false
          setTallerSeleccionado((prev) => {
            if (esSeleccionInicial) {
              const mypeInicialUrl = valoresIniciales.current.mypeUrl
              const idUrl = mypeInicialUrl && /^\d+$/.test(mypeInicialUrl) ? Number(mypeInicialUrl) : null
              const tallerUrl = idUrl !== null && Number.isSafeInteger(idUrl) && idUrl > 0
                ? res.data.find((t) => t.id === idUrl)
                : undefined
              if (tallerUrl) return tallerUrl
              const tallerBorrador = res.data.find((t) => t.id === valoresIniciales.current.mypeBorrador)
              if (tallerBorrador) return tallerBorrador
            }
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

  function manejarTecladoTaller(e: KeyboardEvent, index: number, lista: TallerItem[] = talleres) {
    if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      const sig = (index + 1) % lista.length
      setTallerSeleccionado(lista[sig])
    } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault()
      const ant = (index - 1 + lista.length) % lista.length
      setTallerSeleccionado(lista[ant])
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
    const primero = ['especialidad', 'taller', 'fecha', 'hora', 'descripcionFalla', 'direccion', 'distrito'].find((clave) => err[clave])
    if (primero) {
      const selectores: Record<string, string> = {
        especialidad: `#${CSS.escape(idHeadingEspecialidad)} [role="radio"]`,
        taller: `#${CSS.escape(idHeadingTalleres)} [role="radio"]`,
        fecha: '#dia-primero',
        hora: '#hora-primera',
        descripcionFalla: '#falla',
        direccion: '#direccion',
        distrito: '#distrito',
      }
      requestAnimationFrame(() => {
        const control = document.querySelector<HTMLElement>(selectores[primero])
        const destino = control ?? (primero === 'hora' ? document.getElementById('grupo-horas') : null)
        destino?.focus()
      })
    }
    return Object.keys(err).length === 0
  }

  // Confirmar reserva
  async function manejarConfirmar(e: FormEvent) {
    e.preventDefault()
    // Una reserva ya registrada (o en camino) no se vuelve a enviar: sin esto,
    // cerrar el diálogo y pulsar Confirmar otra vez creaba una orden duplicada.
    if (enviando || ordenConfirmada) return
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
      }),
    )

    // Si el usuario no ha iniciado sesión, redirigir a /entrar
    if (!usuario) {
      navigate('/entrar', { state: { desde: '/reservar' } })
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

  function cerrarModalYVerSolicitudes() {
    dialogRef.current?.close()
    navigate('/mis-ordenes')
  }

  const objetoEspecialidad = especialidades.find((e) => e.clave === especialidadSeleccionada)

  const pasosCompletos = [
    Boolean(especialidadSeleccionada),
    Boolean(tallerSeleccionado),
    Boolean(fecha && agenda?.fecha === fecha && agenda.franjas.some((franja) => franja.disponible && franja.hora.startsWith(horaSeleccionada))),
    descripcionFalla.trim().length >= 10 && Boolean(direccion.trim()) && Boolean(distrito.trim()),
  ]
  const pasosPendientes = ['especialidad', 'taller', 'día y hora', 'dirección y detalle'].filter((_, indice) => !pasosCompletos[indice])

  return {
    usuario, especialidades, cargandoEspecialidades, errorEspecialidades, recargarEspecialidades,
    especialidadSeleccionada, setEspecialidadSeleccionada, objetoEspecialidad,
    talleres, ordenTalleres, setOrdenTalleres, cargandoTalleres, errorTalleres, recargarTalleres, tallerSeleccionado, setTallerSeleccionado,
    fecha, inicioTira, elegirFecha, agenda, cargandoAgenda, errorAgenda, horaSeleccionada, setHoraSeleccionada,
    descripcionFalla, setDescripcionFalla, direccion, setDireccion, referencia, setReferencia, distrito, setDistrito,
    fotos, errorFotos, agregarArchivos, quitarFoto, errores, setErrores, errorEnvio, enviando,
    ordenConfirmada, avisoFotosError, dialogRef, inputArchivosRef, idInputArchivos,
    idHeadingEspecialidad, idHeadingTalleres, manejarTecladoEspecialidad, manejarTecladoTaller,
    manejarConfirmar, cerrarModalYVerOrden, cerrarModalYVerSolicitudes, pasosCompletos, pasosPendientes,
  }
}

export type Reserva = ReturnType<typeof useReserva>
