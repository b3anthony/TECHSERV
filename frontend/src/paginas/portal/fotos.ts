import type { Especialidad } from '../../tipos.ts'
import type { IconoNombre } from '../../componentes/Icono.tsx'

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
