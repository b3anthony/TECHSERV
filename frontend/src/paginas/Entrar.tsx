import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSesion } from '../sesion/SesionProvider.tsx'
import { Campo } from '../componentes/Campo.tsx'
import { Boton } from '../componentes/Boton.tsx'
import { mensajeDeError } from '../api/cliente.ts'
import type { ErrorApi } from '../tipos.ts'
import axios from 'axios'

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
      const usuario = await entrar(email, clave)
      const destino = desde ?? (usuario.rol === 'ADMIN_MYPE' ? '/panel' : '/mis-ordenes')
      navigate(destino, { replace: true })
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
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold text-tinta">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-tinta-suave">
        Ingresa a tu cuenta de TechServ.
      </p>

      <form onSubmit={manejarEnvio} className="mt-6 space-y-4" noValidate>
        {errorGeneral && (
          <div role="alert" className="rounded-lg border border-peligro bg-superficie p-3 text-sm text-peligro">
            {errorGeneral}
          </div>
        )}

        <Campo
          etiqueta="Correo electrónico"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errores['email']}
        />

        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          error={errores['clave']}
        />

        <Boton type="submit" cargando={enviando} className="w-full">
          Entrar
        </Boton>
      </form>

      <p className="mt-4 text-center text-sm text-tinta-suave">
        ¿No tienes cuenta?{' '}
        <a
          href="/registro"
          className="inline-block py-2 px-1 font-semibold text-accion underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo rounded"
        >
          Regístrate
        </a>
      </p>
    </main>
  )
}
