import axios from 'axios'
import type { AxiosInstance } from 'axios'
import type { ErrorApi, RespuestaSesion } from '../tipos.ts'

const CLAVE_SESION = 'techserv.sesion'

export const api: AxiosInstance = axios.create({
  baseURL: '/api',
})

export function leerToken(): string | null {
  const raw = localStorage.getItem(CLAVE_SESION)
  if (!raw) return null
  try {
    const sesion: RespuestaSesion = JSON.parse(raw)
    if (new Date(sesion.expiraEn) <= new Date()) {
      borrarSesion()
      return null
    }
    return sesion.token
  } catch {
    borrarSesion()
    return null
  }
}

export function guardarSesion(s: RespuestaSesion): void {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(s))
}

export function borrarSesion(): void {
  localStorage.removeItem(CLAVE_SESION)
}

export function mensajeDeError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as ErrorApi | undefined
    if (data?.mensaje) return data.mensaje
  }
  return 'No se pudo completar la operación. Inténtalo otra vez.'
}

// Interceptor de petición: añade Authorization cuando hay token
api.interceptors.request.use((config) => {
  const token = leerToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de respuesta: ante 401, borra sesión y redirige a /entrar
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      borrarSesion()
      window.location.assign('/entrar')
    }
    return Promise.reject(error)
  },
)
