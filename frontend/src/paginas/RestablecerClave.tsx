import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/cliente.ts'
import { focoAmarillo, focoClaro } from '../componentes/marco/foco.ts'
import { Boton } from '../componentes/publico/Boton.tsx'
import { CampoTexto } from '../componentes/publico/CampoTexto.tsx'
import { Resultado } from '../componentes/publico/Resultado.tsx'
import { TarjetaAcceso } from '../componentes/publico/TarjetaAcceso.tsx'
import { useEnvio } from '../componentes/publico/useEnvio.ts'

export function RestablecerClave(): ReactNode {
  const { token } = useParams<{ token: string }>()
  const [claveNueva, setClaveNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const { enviando, mensaje, errores, enviar, setErrores, setMensaje } = useEnvio()
  const restablecida = mensaje?.tipo === 'exito'

  async function restablecer(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    setMensaje(null)
    const locales: Record<string, string> = {}
    if (!claveNueva.trim()) locales.claveNueva = 'Escribe una contraseña'
    else if (claveNueva.length < 8) locales.claveNueva = 'La contraseña debe tener al menos 8 caracteres'
    if (claveNueva !== repetida) locales.repetida = 'Las dos contraseñas no coinciden'
    setErrores(locales)
    if (Object.keys(locales).length > 0) return

    const ok = await enviar(async () => {
      await api.post('/auth/restablecer-clave', { token, claveNueva })
    }, 'Listo, ya puedes entrar con tu contraseña nueva')
    if (ok) {
      setClaveNueva('')
      setRepetida('')
    }
  }

  return (
    <TarjetaAcceso tituloId="titulo-restablecer-clave">
      <p className="mb-6 text-sm text-publico-tinta-suave">
        <Link to="/entrar" className={`rounded-sm underline decoration-publico-acento decoration-2 underline-offset-4 ${focoClaro}`}>Iniciar sesión</Link> / Contraseña nueva
      </p>
      <h1 id="titulo-restablecer-clave" className="text-[clamp(2rem,1.4rem+2vw,2.75rem)] leading-[1.13] font-bold tracking-[-0.03em]">Crear una contraseña nueva</h1>
      <p className="mt-2 text-publico-tinta-media">Elige una contraseña de al menos 8 caracteres.</p>

      <div className="mt-6"><Resultado mensaje={mensaje} /></div>

      {restablecida ? (
        <Link to="/entrar" replace className={`inline-flex min-h-13 w-full items-center justify-center rounded-lg border border-publico-acento bg-publico-acento px-5 py-2.5 text-sm font-bold text-publico-tinta hover:bg-publico-acento-hondo motion-safe:transition-colors ${focoAmarillo}`}>
          Iniciar sesión
        </Link>
      ) : (
        <>
          <form onSubmit={restablecer} className="grid gap-3" noValidate>
            <CampoTexto
              id="clave-restablecer"
              etiqueta="Contraseña nueva"
              type="password"
              autoComplete="new-password"
              ayuda="Al menos 8 caracteres."
              required
              minLength={8}
              value={claveNueva}
              onChange={(e) => setClaveNueva(e.target.value)}
              error={errores.claveNueva}
            />
            <CampoTexto
              id="clave-restablecer-repetida"
              etiqueta="Repite la contraseña nueva"
              type="password"
              autoComplete="new-password"
              required
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              error={errores.repetida}
            />
            <Boton type="submit" cargando={enviando} className="mt-2 min-h-13 w-full">Guardar contraseña nueva</Boton>
          </form>
          <Link to="/recuperar-clave" replace className={`mt-6 inline-flex min-h-11 items-center rounded-sm text-sm font-bold text-publico-tinta underline decoration-publico-acento decoration-2 underline-offset-4 ${focoClaro}`}>
            Pedir un enlace nuevo
          </Link>
        </>
      )}
    </TarjetaAcceso>
  )
}
