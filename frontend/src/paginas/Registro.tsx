import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSesion } from '../sesion/SesionProvider.tsx'
import { api, guardarSesion, mensajeDeError } from '../api/cliente.ts'
import { CampoTexto } from '../componentes/publico/CampoTexto.tsx'
import { AreaTexto } from '../componentes/publico/AreaTexto.tsx'
import { Selector } from '../componentes/publico/Selector.tsx'
import { Boton } from '../componentes/publico/Boton.tsx'
import { Aviso } from '../componentes/publico/Aviso.tsx'
import { TarjetaAcceso } from '../componentes/publico/TarjetaAcceso.tsx'
import type { ErrorApi, RespuestaSesion } from '../tipos.ts'
import axios from 'axios'

type Pestana = 'cliente' | 'negocio'

export function Registro(): ReactNode {
  const [pestana, setPestana] = useState<Pestana>('cliente')

  return (
    <TarjetaAcceso tituloId="titulo-registro">
      <p className="mb-6 text-sm text-publico-tinta-suave">
        <Link to="/" className="rounded-sm underline decoration-publico-acento decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-publico-acento focus:ring-offset-2 focus:ring-offset-publico-superficie">Inicio</Link> / Crear cuenta
      </p>
      <h1 id="titulo-registro" className="text-3xl font-bold leading-tight tracking-tight text-publico-tinta sm:text-4xl">Crear cuenta</h1>
      <p className="mt-2 text-base text-publico-tinta-media">Elige el tipo de cuenta que necesitas.</p>

      <div className="mt-6 flex gap-1 rounded-lg border border-publico-linea bg-publico-superficie-suave p-1" role="tablist" aria-label="Tipo de cuenta">
        <button
          id="pestana-cliente"
          type="button"
          role="tab"
          aria-controls="panel-registro"
          aria-selected={pestana === 'cliente'}
          onClick={() => setPestana('cliente')}
          className={`min-h-11 flex-1 rounded-md px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-publico-acento focus:ring-offset-2 focus:ring-offset-publico-superficie ${pestana === 'cliente' ? 'bg-publico-superficie text-publico-tinta shadow-sm' : 'text-publico-tinta-media hover:text-publico-tinta'}`}
        >
          Cliente
        </button>
        <button
          id="pestana-negocio"
          type="button"
          role="tab"
          aria-controls="panel-registro"
          aria-selected={pestana === 'negocio'}
          onClick={() => setPestana('negocio')}
          className={`min-h-11 flex-1 rounded-md px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-publico-acento focus:ring-offset-2 focus:ring-offset-publico-superficie ${pestana === 'negocio' ? 'bg-publico-superficie text-publico-tinta shadow-sm' : 'text-publico-tinta-media hover:text-publico-tinta'}`}
        >
          Negocio
        </button>
      </div>

      <div id="panel-registro" role="tabpanel" aria-labelledby={pestana === 'cliente' ? 'pestana-cliente' : 'pestana-negocio'}>
        {pestana === 'cliente' ? <FormularioCliente /> : <FormularioNegocio />}
      </div>

      <p className="mt-6 text-sm text-publico-tinta-media">
        ¿Ya tienes cuenta?{' '}
        <Link to="/entrar" className="inline-flex min-h-11 items-center rounded-sm font-bold text-publico-tinta underline decoration-publico-acento decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-publico-acento focus:ring-offset-2 focus:ring-offset-publico-superficie">
          Inicia sesión
        </Link>
      </p>
    </TarjetaAcceso>
  )
}

/* ─── Formulario de registro de cliente ─── */

function FormularioCliente(): ReactNode {
  const navigate = useNavigate()
  const { entrar: _entrar } = useSesion()

  const [campos, setCampos] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    clave: '',
    telefono: '',
    direccion: '',
    referencia: '',
    distrito: '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)

  function actualizar(campo: string, valor: string) {
    setCampos((prev) => ({ ...prev, [campo]: valor }))
  }

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault()
    setErrores({})
    setErrorGeneral('')
    setEnviando(true)

    try {
      const r = await api.post('/auth/registro/cliente', campos)
      const sesion = r.data as RespuestaSesion
      guardarSesion(sesion)
      navigate('/mis-ordenes', { replace: true })
      window.location.reload()
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
    <form onSubmit={manejarEnvio} className="mt-6 space-y-1" noValidate>
      {errorGeneral && (
        <Aviso tipo="error">{errorGeneral}</Aviso>
      )}

      <div className="grid gap-x-4 sm:grid-cols-2">
        <CampoTexto
          id="nombres"
          etiqueta="Nombres"
          value={campos.nombres}
          onChange={(e) => actualizar('nombres', e.target.value)}
          error={errores['nombres']}
          required
        />
        <CampoTexto
          id="apellidos"
          etiqueta="Apellidos"
          value={campos.apellidos}
          onChange={(e) => actualizar('apellidos', e.target.value)}
          error={errores['apellidos']}
          required
        />
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <CampoTexto
          id="email"
          etiqueta="Correo electrónico"
          type="email"
          autoComplete="email"
          value={campos.email}
          onChange={(e) => actualizar('email', e.target.value)}
          error={errores['email']}
          required
        />
        <CampoTexto
          id="telefono"
          etiqueta="Teléfono"
          type="tel"
          placeholder="9 dígitos"
          value={campos.telefono}
          onChange={(e) => actualizar('telefono', e.target.value)}
          error={errores['telefono']}
        />
      </div>

      <CampoTexto
        id="clave"
        etiqueta="Contraseña"
        type="password"
        autoComplete="new-password"
        value={campos.clave}
        onChange={(e) => actualizar('clave', e.target.value)}
        error={errores['clave']}
        required
      />

      <CampoTexto
        id="direccion"
        etiqueta="Dirección"
        value={campos.direccion}
        onChange={(e) => actualizar('direccion', e.target.value)}
        error={errores['direccion']}
      />

      <div className="grid gap-x-4 sm:grid-cols-2">
        <CampoTexto
          id="referencia"
          etiqueta="Referencia"
          value={campos.referencia}
          onChange={(e) => actualizar('referencia', e.target.value)}
          error={errores['referencia']}
        />
        <CampoTexto
          id="distrito"
          etiqueta="Distrito"
          value={campos.distrito}
          onChange={(e) => actualizar('distrito', e.target.value)}
          error={errores['distrito']}
        />
      </div>

      <Boton type="submit" cargando={enviando} className="mt-4 w-full">
        Crear cuenta de cliente
      </Boton>
    </form>
  )
}

/* ─── Formulario de registro de negocio ─── */

function FormularioNegocio(): ReactNode {
  const navigate = useNavigate()

  const [campos, setCampos] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    clave: '',
    telefono: '',
    razonSocial: '',
    ruc: '',
    descripcion: '',
    direccion: '',
    distrito: '',
  })
  const [especialidades, setEspecialidades] = useState([
    { especialidad: 'SERVICIOS_HOGAR' as const, tarifaBase: '' },
  ])
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)

  function actualizar(campo: string, valor: string) {
    setCampos((prev) => ({ ...prev, [campo]: valor }))
  }

  function actualizarEspecialidad(indice: number, campo: 'especialidad' | 'tarifaBase', valor: string) {
    setEspecialidades((prev) =>
      prev.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)),
    )
  }

  function agregarEspecialidad() {
    setEspecialidades((prev) => [
      ...prev,
      { especialidad: 'SERVICIOS_HOGAR' as const, tarifaBase: '' },
    ])
  }

  function quitarEspecialidad(indice: number) {
    setEspecialidades((prev) => prev.filter((_, i) => i !== indice))
  }

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault()
    setErrores({})
    setErrorGeneral('')
    setEnviando(true)

    const cuerpo = {
      ...campos,
      especialidades: especialidades.map((esp) => ({
        especialidad: esp.especialidad,
        tarifaBase: esp.tarifaBase ? Number(esp.tarifaBase) : null,
      })),
    }

    try {
      const r = await api.post('/auth/registro/negocio', cuerpo)
      const sesion = r.data as RespuestaSesion
      guardarSesion(sesion)
      navigate('/panel', { replace: true })
      window.location.reload()
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
    <form onSubmit={manejarEnvio} className="mt-6 space-y-1" noValidate>
      {errorGeneral && (
        <Aviso tipo="error">{errorGeneral}</Aviso>
      )}

      <h2 className="mb-3 border-b border-publico-linea pb-2 text-xs font-bold tracking-[0.08em] text-publico-tinta-suave uppercase">Tus datos</h2>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <CampoTexto
          id="nombres"
          etiqueta="Nombres"
          value={campos.nombres}
          onChange={(e) => actualizar('nombres', e.target.value)}
          error={errores['nombres']}
          required
        />
        <CampoTexto
          id="apellidos"
          etiqueta="Apellidos"
          value={campos.apellidos}
          onChange={(e) => actualizar('apellidos', e.target.value)}
          error={errores['apellidos']}
          required
        />
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <CampoTexto
          id="email"
          etiqueta="Correo electrónico"
          type="email"
          autoComplete="email"
          value={campos.email}
          onChange={(e) => actualizar('email', e.target.value)}
          error={errores['email']}
          required
        />
        <CampoTexto
          id="telefono"
          etiqueta="Teléfono"
          type="tel"
          placeholder="9 dígitos"
          value={campos.telefono}
          onChange={(e) => actualizar('telefono', e.target.value)}
          error={errores['telefono']}
        />
      </div>

      <CampoTexto
        id="clave"
        etiqueta="Contraseña"
        type="password"
        autoComplete="new-password"
        value={campos.clave}
        onChange={(e) => actualizar('clave', e.target.value)}
        error={errores['clave']}
        required
      />

      <h2 className="mt-3 mb-3 border-b border-publico-linea pb-2 text-xs font-bold tracking-[0.08em] text-publico-tinta-suave uppercase">Tu negocio</h2>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <CampoTexto
          id="razonSocial"
          etiqueta="Razón social"
          value={campos.razonSocial}
          onChange={(e) => actualizar('razonSocial', e.target.value)}
          error={errores['razonSocial']}
          required
        />
        <CampoTexto
          id="ruc"
          etiqueta="RUC"
          placeholder="11 dígitos"
          value={campos.ruc}
          onChange={(e) => actualizar('ruc', e.target.value)}
          error={errores['ruc']}
          required
        />
      </div>

      <AreaTexto
        id="descripcion"
        etiqueta="Descripción del negocio"
        value={campos.descripcion}
        onChange={(e) => actualizar('descripcion', e.target.value)}
        error={errores['descripcion']}
        rows={3}
      />

      <div className="grid gap-x-4 sm:grid-cols-2">
        <CampoTexto
          id="direccion"
          etiqueta="Dirección del negocio"
          value={campos.direccion}
          onChange={(e) => actualizar('direccion', e.target.value)}
          error={errores['direccion']}
          required
        />
        <CampoTexto
          id="distrito"
          etiqueta="Distrito"
          value={campos.distrito}
          onChange={(e) => actualizar('distrito', e.target.value)}
          error={errores['distrito']}
          required
        />
      </div>

      {/* Especialidades con tarifa */}
      <fieldset className="mt-3 space-y-3">
        <legend className="text-sm font-bold text-publico-tinta">Especialidades y tarifas</legend>

        {especialidades.map((esp, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-publico-linea bg-publico-superficie-suave p-3 sm:flex-row sm:items-end">
            <Selector
              id={`especialidad-${i}`}
              etiqueta="Especialidad"
              value={esp.especialidad}
              onChange={(e) => actualizarEspecialidad(i, 'especialidad', e.target.value)}
              className="flex-1 min-w-0"
            >
              <option value="SERVICIOS_HOGAR">Servicios del hogar</option>
              <option value="SOPORTE_INFORMATICO">Soporte técnico e informático</option>
              <option value="REPARACION_ELECTRODOMESTICOS">Reparación de electrodomésticos</option>
            </Selector>

            <div className="flex items-end gap-3">
              <CampoTexto
                id={`tarifa-${i}`}
                etiqueta="Tarifa base (S/)"
                type="number"
                min="1"
                step="0.01"
                value={esp.tarifaBase}
                onChange={(e) => actualizarEspecialidad(i, 'tarifaBase', e.target.value)}
                className="w-32 flex-1 sm:flex-none"
              />

              {especialidades.length > 1 && (
                <button
                  type="button"
                  onClick={() => quitarEspecialidad(i)}
                  className="mb-0.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 py-2 text-xs font-bold text-publico-peligro hover:bg-publico-superficie focus:outline-none focus:ring-2 focus:ring-publico-acento focus:ring-offset-2 focus:ring-offset-publico-superficie"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        ))}

        <p role={errores['especialidades'] ? 'alert' : undefined} className="min-h-5 text-xs font-bold text-publico-peligro">
          {errores['especialidades']}
        </p>

        <Boton type="button" variante="secundario" onClick={agregarEspecialidad}>
          Agregar especialidad
        </Boton>
      </fieldset>

      <Boton type="submit" cargando={enviando} className="mt-4 w-full">
        Crear cuenta de negocio
      </Boton>
    </form>
  )
}
