import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../sesion/SesionProvider.tsx'
import { api, guardarSesion, mensajeDeError } from '../api/cliente.ts'
import { Campo } from '../componentes/Campo.tsx'
import { AreaTexto } from '../componentes/AreaTexto.tsx'
import { Selector } from '../componentes/Selector.tsx'
import { Boton } from '../componentes/Boton.tsx'
import type { ErrorApi, RespuestaSesion } from '../tipos.ts'
import axios from 'axios'

type Pestana = 'cliente' | 'negocio'

export function Registro(): ReactNode {
  const [pestana, setPestana] = useState<Pestana>('cliente')

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-xl font-bold text-tinta">Crear cuenta</h1>
      <p className="mt-1 text-sm text-tinta-suave">
        Elige el tipo de cuenta que necesitas.
      </p>

      <div className="mt-6 flex gap-1 rounded-lg border border-linea bg-superficie-suave p-1" role="tablist">
        <button
          role="tab"
          aria-selected={pestana === 'cliente'}
          onClick={() => setPestana('cliente')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo ${pestana === 'cliente' ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-suave'}`}
        >
          Cliente
        </button>
        <button
          role="tab"
          aria-selected={pestana === 'negocio'}
          onClick={() => setPestana('negocio')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo ${pestana === 'negocio' ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-suave'}`}
        >
          Negocio
        </button>
      </div>

      {pestana === 'cliente' ? <FormularioCliente /> : <FormularioNegocio />}

      <p className="mt-4 text-center text-sm text-tinta-suave">
        ¿Ya tienes cuenta?{' '}
        <a
          href="/entrar"
          className="font-semibold text-accion underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo"
        >
          Inicia sesión
        </a>
      </p>
    </main>
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
    <form onSubmit={manejarEnvio} className="mt-4 space-y-4" noValidate>
      {errorGeneral && (
        <div role="alert" className="rounded-lg border border-peligro bg-superficie p-3 text-sm text-peligro">
          {errorGeneral}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Campo
          etiqueta="Nombres"
          value={campos.nombres}
          onChange={(e) => actualizar('nombres', e.target.value)}
          error={errores['nombres']}
          required
        />
        <Campo
          etiqueta="Apellidos"
          value={campos.apellidos}
          onChange={(e) => actualizar('apellidos', e.target.value)}
          error={errores['apellidos']}
          required
        />
      </div>

      <Campo
        etiqueta="Correo electrónico"
        type="email"
        autoComplete="email"
        value={campos.email}
        onChange={(e) => actualizar('email', e.target.value)}
        error={errores['email']}
        required
      />

      <Campo
        etiqueta="Contraseña"
        type="password"
        autoComplete="new-password"
        value={campos.clave}
        onChange={(e) => actualizar('clave', e.target.value)}
        error={errores['clave']}
        required
      />

      <Campo
        etiqueta="Teléfono"
        type="tel"
        value={campos.telefono}
        onChange={(e) => actualizar('telefono', e.target.value)}
        error={errores['telefono']}
        placeholder="9 dígitos"
      />

      <Campo
        etiqueta="Dirección"
        value={campos.direccion}
        onChange={(e) => actualizar('direccion', e.target.value)}
        error={errores['direccion']}
      />

      <Campo
        etiqueta="Referencia"
        value={campos.referencia}
        onChange={(e) => actualizar('referencia', e.target.value)}
        error={errores['referencia']}
      />

      <Campo
        etiqueta="Distrito"
        value={campos.distrito}
        onChange={(e) => actualizar('distrito', e.target.value)}
        error={errores['distrito']}
      />

      <Boton type="submit" cargando={enviando} className="w-full">
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
    <form onSubmit={manejarEnvio} className="mt-4 space-y-4" noValidate>
      {errorGeneral && (
        <div role="alert" className="rounded-lg border border-peligro bg-superficie p-3 text-sm text-peligro">
          {errorGeneral}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Campo
          etiqueta="Nombres"
          value={campos.nombres}
          onChange={(e) => actualizar('nombres', e.target.value)}
          error={errores['nombres']}
          required
        />
        <Campo
          etiqueta="Apellidos"
          value={campos.apellidos}
          onChange={(e) => actualizar('apellidos', e.target.value)}
          error={errores['apellidos']}
          required
        />
      </div>

      <Campo
        etiqueta="Correo electrónico"
        type="email"
        autoComplete="email"
        value={campos.email}
        onChange={(e) => actualizar('email', e.target.value)}
        error={errores['email']}
        required
      />

      <Campo
        etiqueta="Contraseña"
        type="password"
        autoComplete="new-password"
        value={campos.clave}
        onChange={(e) => actualizar('clave', e.target.value)}
        error={errores['clave']}
        required
      />

      <Campo
        etiqueta="Teléfono"
        type="tel"
        value={campos.telefono}
        onChange={(e) => actualizar('telefono', e.target.value)}
        error={errores['telefono']}
        placeholder="9 dígitos"
      />

      <Campo
        etiqueta="Razón social"
        value={campos.razonSocial}
        onChange={(e) => actualizar('razonSocial', e.target.value)}
        error={errores['razonSocial']}
        required
      />

      <Campo
        etiqueta="RUC"
        value={campos.ruc}
        onChange={(e) => actualizar('ruc', e.target.value)}
        error={errores['ruc']}
        required
        placeholder="11 dígitos"
      />

      <AreaTexto
        etiqueta="Descripción del negocio"
        value={campos.descripcion}
        onChange={(e) => actualizar('descripcion', e.target.value)}
        error={errores['descripcion']}
        rows={3}
      />

      <Campo
        etiqueta="Dirección del negocio"
        value={campos.direccion}
        onChange={(e) => actualizar('direccion', e.target.value)}
        error={errores['direccion']}
        required
      />

      <Campo
        etiqueta="Distrito"
        value={campos.distrito}
        onChange={(e) => actualizar('distrito', e.target.value)}
        error={errores['distrito']}
        required
      />

      {/* Especialidades con tarifa */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-tinta">Especialidades y tarifas</legend>

        {especialidades.map((esp, i) => (
          <div key={i} className="flex items-end gap-3 rounded-lg border border-linea bg-superficie-suave p-3">
            <Selector
              etiqueta="Especialidad"
              value={esp.especialidad}
              onChange={(e) => actualizarEspecialidad(i, 'especialidad', e.target.value)}
              className="flex-1"
            >
              <option value="SERVICIOS_HOGAR">Servicios del hogar</option>
              <option value="SOPORTE_INFORMATICO">Soporte técnico e informático</option>
              <option value="REPARACION_ELECTRODOMESTICOS">Reparación de electrodomésticos</option>
            </Selector>

            <Campo
              etiqueta="Tarifa base (S/)"
              type="number"
              min="1"
              step="0.01"
              value={esp.tarifaBase}
              onChange={(e) => actualizarEspecialidad(i, 'tarifaBase', e.target.value)}
              className="w-32"
            />

            {especialidades.length > 1 && (
              <button
                type="button"
                onClick={() => quitarEspecialidad(i)}
                className="mb-0.5 rounded-md px-2 py-2 text-xs text-peligro hover:bg-superficie focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo"
              >
                Quitar
              </button>
            )}
          </div>
        ))}

        {errores['especialidades'] && (
          <p role="alert" className="text-xs text-peligro">{errores['especialidades']}</p>
        )}

        <Boton type="button" variante="secundario" onClick={agregarEspecialidad} className="text-xs">
          Agregar especialidad
        </Boton>
      </fieldset>

      <Boton type="submit" cargando={enviando} className="w-full">
        Crear cuenta de negocio
      </Boton>
    </form>
  )
}
