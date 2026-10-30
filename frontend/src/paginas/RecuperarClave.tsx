import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/cliente.ts'
import { focoClaro } from '../componentes/marco/foco.ts'
import { Boton } from '../componentes/publico/Boton.tsx'
import { CampoTexto } from '../componentes/publico/CampoTexto.tsx'
import { Resultado } from '../componentes/publico/Resultado.tsx'
import { TarjetaAcceso } from '../componentes/publico/TarjetaAcceso.tsx'
import { useEnvio } from '../componentes/publico/useEnvio.ts'

const MENSAJE_ENVIADO = 'Si hay una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva. Vale 30 minutos. Revisa también el correo no deseado.'

export function RecuperarClave(): ReactNode {
  const [email, setEmail] = useState('')
  const { enviando, mensaje, errores, enviar } = useEnvio()
  const enviado = mensaje?.tipo === 'exito'

  async function recuperar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    await enviar(async () => {
      await api.post('/auth/recuperar-clave', { email: email.trim() })
    }, MENSAJE_ENVIADO)
  }

  return (
    <TarjetaAcceso tituloId="titulo-recuperar-clave">
      <p className="mb-6 text-sm text-publico-tinta-suave">
        <Link to="/entrar" className={`rounded-sm underline decoration-publico-acento decoration-2 underline-offset-4 ${focoClaro}`}>Iniciar sesión</Link> / Recuperar contraseña
      </p>
      <h1 id="titulo-recuperar-clave" className="text-[clamp(2rem,1.4rem+2vw,2.75rem)] leading-[1.13] font-bold tracking-[-0.03em]">Recuperar contraseña</h1>
      <p className="mt-2 text-publico-tinta-media">Escribe el correo con el que entras a TechServ.</p>

      <div className="mt-6"><Resultado mensaje={mensaje} /></div>

      {!enviado && (
        <form onSubmit={recuperar} className="grid gap-3" noValidate>
          <CampoTexto
            id="correo-recuperar"
            etiqueta="Correo electrónico"
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={160}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errores.email}
          />
          <Boton type="submit" cargando={enviando} className="mt-2 min-h-13 w-full">Enviarme el enlace</Boton>
        </form>
      )}

      <Link to="/entrar" className={`mt-6 inline-flex min-h-11 items-center rounded-sm text-sm font-bold text-publico-tinta underline decoration-publico-acento decoration-2 underline-offset-4 ${focoClaro}`}>
        Volver a iniciar sesión
      </Link>
    </TarjetaAcceso>
  )
}
