import type { Especialidad } from '../../tipos.ts'
import type { IconoNombre } from '../../componentes/Icono.tsx'
import type { FotoCargada } from './tiposPortal.ts'

const MAX_FOTOS = 5
const MAX_BYTES_FOTO = 5 * 1024 * 1024

/** Las mismas reglas para las fotos de una reserva y de una atención por garantía. */
export function prepararFotos(archivos: FileList | File[], cantidadActual: number): { nuevas: FotoCargada[]; error: string | null } {
  const lista = Array.from(archivos)
  if (cantidadActual + lista.length > MAX_FOTOS) {
    return { nuevas: [], error: `Puedes adjuntar como máximo ${MAX_FOTOS} fotos en total.` }
  }
  const nuevas: FotoCargada[] = []
  let error: string | null = null
  for (const archivo of lista) {
    if (archivo.size > MAX_BYTES_FOTO) {
      error = `El archivo "${archivo.name}" supera el tamaño máximo permitido de 5 MB.`
      continue
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
      error = 'Solo se admiten fotos en formato JPG, PNG o WEBP.'
      continue
    }
    nuevas.push({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      archivo,
      nombre: archivo.name,
      urlVistaPrevia: URL.createObjectURL(archivo),
    })
  }
  return { nuevas, error }
}

export function datosFotos(fotos: FotoCargada[]): FormData {
  const datos = new FormData()
  for (const foto of fotos) {
    datos.append('fotos', foto.archivo)
    datos.append('archivos', foto.archivo)
  }
  return datos
}

export const fotosEspecialidad: Record<Especialidad, { src: string; alt: string; icono: IconoNombre }> = {
  SERVICIOS_HOGAR: {
    src: '/portada/especialidad-hogar.jpg',
    alt: 'Electricista revisa con un multímetro el tablero eléctrico de una vivienda.',
    icono: 'casa',
  },
  SOPORTE_INFORMATICO: {
    src: '/portada/especialidad-soporte.jpg',
    alt: 'Técnico repara una laptop abierta sobre la mesa del comedor de una casa.',
    icono: 'laptop',
  },
  REPARACION_ELECTRODOMESTICOS: {
    src: '/portada/especialidad-electro.jpg',
    alt: 'Técnico repara una lavadora en la lavandería de una vivienda.',
    icono: 'lavadora',
  },
}

export const fotosTaller: Record<number, { src: string; alt: string }> = {
  1: {
    src: '/portada/taller-delgado.jpg',
    alt: 'Fachada del local de Servicios Delgado E.I.R.L. en una calle de Trujillo, con la persiana abierta.',
  },
  2: {
    src: '/portada/taller-tecnohogar.jpg',
    alt: 'Técnico de TecnoHogar Trujillo repara un equipo en el mostrador de su taller, rodeado de electrodomésticos.',
  },
  3: {
    src: '/portada/taller-reparaciones.jpg',
    alt: 'Dos técnicos de Reparaciones La Libertad cargan una refrigeradora a una camioneta en una calle de Trujillo.',
  },
}
