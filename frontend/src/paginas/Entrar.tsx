import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useSesion } from '../sesion/SesionProvider.tsx'
import { CampoTexto } from '../componentes/publico/CampoTexto.tsx'
import { Boton } from '../componentes/publico/Boton.tsx'
import { Aviso } from '../componentes/publico/Aviso.tsx'
import { TarjetaAcceso } from '../componentes/publico/TarjetaAcceso.tsx'
import { mensajeDeError } from '../api/cliente.ts'
import type { ErrorApi } from '../tipos.ts'

export function Entrar(): ReactNode {
  const { entrar } = useSesion()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const desde = (location.state as { desde?: string } | null)?.desde

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault()
    setErrores({})
    setErrorGeneral('')
    setEnviando(true)

    try {
      const sesion = await entrar(email, clave)
      const destino = desde ?? (sesion.usuario.rol === 'ADMIN_MYPE' ? '/panel' : '/mis-ordenes')
      navigate(destino, {
        replace: true,
        state: sesion.cuentaReactivada ? { aviso: 'Qué bueno verte otra vez. Tu cuenta volvió a estar activa.' } : undefined,
      })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as ErrorApi | undefined
        if (data?.campos) {
          setErrores(data.campos)
        } else {
          setErrorGeneral(mensajeDeError(err))
        }
      } else {
        setErrorGeneral(mensajeDeError(err))
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <TarjetaAcceso tituloId="titulo-entrar">
      <p className="mb-6 text-sm text-publico-tinta-suave">
        <Link to="/" className="rounded-sm underline decoration-publico-acento decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-publico-acento focus:ring-offset-2 focus:ring-offset-publico-superficie">Inicio</Link> / Iniciar sesión
      </p>
      <h1 id="titulo-entrar" className="text-[clamp(2rem,1.4rem+2vw,2.75rem)] leading-[1.13] font-bold tracking-[-0.03em]">Iniciar sesión</h1>
      <p className="mt-2 text-publico-tinta-media">Entra a tu cuenta para continuar en TechServ.</p>

      {desde === '/reservar' && (
        <Aviso tipo="info" className="mt-6">Inicia sesión para confirmar tu reserva. Lo que elegiste sigue guardado.</Aviso>
      )}

      <form onSubmit={manejarEnvio} className="mt-6 grid gap-3" noValidate>
        {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}

        <CampoTexto
          id="correo-entrar"
          etiqueta="Correo electrónico"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errores['email']}
        />

        <CampoTexto
          id="clave-entrar"
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          error={errores['clave']}
        />

        <Boton type="submit" cargando={enviando} className="mt-5 min-h-13 w-full">
          Entrar
        </Boton>
      </form>

      <p className="mt-6 text-sm text-publico-tinta-media">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="inline-flex min-h-11 items-center rounded-sm font-bold text-publico-tinta underline decoration-publico-acento decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-publico-acento focus:ring-offset-2 focus:ring-offset-publico-superficie">Crear cuenta</Link>
      </p>
    </TarjetaAcceso>
  )
}
