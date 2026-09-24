import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { CampoTexto } from '../../componentes/publico/CampoTexto.tsx'
import type { Especialidad, ErrorApi } from '../../tipos.ts'
import { DialogoPanel } from './comun.tsx'
import { ICONO_ESPECIALIDAD } from './formato.ts'
import { useTarifas } from './datos.ts'
import type { DatosTecnico, TecnicoDisponible } from './tiposPanel.ts'

interface DialogoTecnicoProps {
  abierto: boolean
  /** Sin técnico: alta. Con técnico: edición. */
  tecnico?: TecnicoDisponible | null
  alCerrar: () => void
  alGuardar?: (nombre: string) => void
}

type Errores = Partial<Record<'nombres' | 'apellidos' | 'email' | 'telefono' | 'especialidades', string>>

/**
 * Alta y edición de un técnico. Se monta de nuevo cada vez que se abre (la
 * página le pone una `key`), así el formulario siempre arranca limpio.
 */
export function DialogoTecnico({ abierto, tecnico, alCerrar, alGuardar }: DialogoTecnicoProps): ReactNode {
  const queryClient = useQueryClient()
  const { data: tarifas = [] } = useTarifas()
  const edicion = Boolean(tecnico)

  const [nombres, setNombres] = useState(tecnico?.nombres ?? '')
  const [apellidos, setApellidos] = useState(tecnico?.apellidos ?? '')
  const [email, setEmail] = useState(tecnico?.email ?? '')
  const [telefono, setTelefono] = useState(tecnico?.telefono ?? '')
  const [especialidades, setEspecialidades] = useState<Especialidad[]>(tecnico?.especialidades ?? [])
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  function alternar(e: Especialidad): void {
    setEspecialidades((actual) => (actual.includes(e) ? actual.filter((x) => x !== e) : [...actual, e]))
  }

  function validar(): Errores {
    const e: Errores = {}
    if (!nombres.trim()) e.nombres = 'Escribe los nombres'
    if (!apellidos.trim()) e.apellidos = 'Escribe los apellidos'
    if (!edicion && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Escribe un correo válido: ahí le llegarán las visitas'
    if (especialidades.length === 0) e.especialidades = 'Elige al menos un servicio'
    return e
  }

  async function guardar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    const encontrados = validar()
    setErrores(encontrados)
    setErrorGeneral(null)
    if (Object.keys(encontrados).length > 0) return

    const cuerpo: DatosTecnico = { nombres: nombres.trim(), apellidos: apellidos.trim(), telefono: telefono.trim(), especialidades }
    setGuardando(true)
    try {
      if (tecnico) await api.patch(`/panel/tecnicos/${tecnico.id}`, { ...cuerpo, disponible: tecnico.disponible })
      else await api.post('/panel/tecnicos', { ...cuerpo, email: email.trim() })
      await queryClient.invalidateQueries({ queryKey: ['panel', 'tecnicos'] })
      alGuardar?.(`${cuerpo.nombres} ${cuerpo.apellidos}`)
      alCerrar()
    } catch (err) {
      const campos = axios.isAxiosError(err) ? (err.response?.data as ErrorApi | undefined)?.campos : undefined
      if (campos) setErrores(campos as Errores)
      setErrorGeneral(mensajeDeError(err))
    } finally {
      setGuardando(false)
    }
  }

  const idForm = edicion ? 'form-editar-tecnico' : 'form-nuevo-tecnico'

  return (
    <DialogoPanel
      abierto={abierto}
      alCerrar={alCerrar}
      ocupado={guardando}
      titulo={edicion ? `Editar a ${tecnico?.nombreCompleto}` : 'Añadir técnico'}
      detalle={edicion ? 'Cambia sus datos o los servicios que atiende.' : 'No necesita contraseña: recibirá cada visita en su correo, con botones para confirmar y avisar cuando salga.'}
      pie={
        <>
          <Boton type="button" variante="secundario" disabled={guardando} onClick={alCerrar}>Cancelar</Boton>
          <Boton type="submit" form={idForm} cargando={guardando}>{edicion ? 'Guardar cambios' : 'Añadir al equipo'}</Boton>
        </>
      }
    >
      <form id={idForm} noValidate onSubmit={guardar} className="grid gap-x-4 sm:grid-cols-2">
        {errorGeneral && <Aviso tipo="error" className="mb-4 sm:col-span-2">{errorGeneral}</Aviso>}
        <CampoTexto id={`${idForm}-nombres`} etiqueta="Nombres" autoFocus value={nombres} onChange={(e) => setNombres(e.target.value)} error={errores.nombres} autoComplete="off" maxLength={80} />
        <CampoTexto id={`${idForm}-apellidos`} etiqueta="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} error={errores.apellidos} autoComplete="off" maxLength={80} />
        {edicion ? (
          <div className="grid gap-1.5 pb-5">
            <p className="text-sm font-bold">Correo</p>
            <p className="flex min-h-13 items-center gap-2 truncate rounded-lg bg-publico-superficie-suave px-3.5 text-publico-tinta-media">
              <Icono nombre="correo" className="size-4 shrink-0" />{tecnico?.email}
            </p>
          </div>
        ) : (
          <CampoTexto id={`${idForm}-email`} etiqueta="Correo" tipo="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errores.email} autoComplete="off" maxLength={160} />
        )}
        <CampoTexto id={`${idForm}-telefono`} etiqueta="Teléfono (opcional)" tipo="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} error={errores.telefono} autoComplete="off" maxLength={20} />

        <fieldset className="sm:col-span-2" aria-describedby={`${idForm}-esp-error`}>
          <legend className="mb-2 text-sm font-bold">¿Qué servicios atiende?</legend>
          <div className="grid gap-2">
            {tarifas.map((t) => {
              const marcado = especialidades.includes(t.especialidad)
              return (
                <label key={t.especialidad} className={`flex min-h-13 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 has-[:focus]:ring-2 has-[:focus]:ring-publico-acento has-[:focus]:ring-offset-2 has-[:focus]:ring-offset-publico-superficie ${marcado ? 'border-publico-acento-hondo bg-publico-acento-tenue' : 'border-publico-linea hover:border-publico-linea-fuerte'}`}>
                  <input type="checkbox" checked={marcado} onChange={() => alternar(t.especialidad)} className="sr-only" />
                  <Icono nombre={ICONO_ESPECIALIDAD[t.especialidad]} className="size-5 shrink-0 text-publico-tinta-media" />
                  <span className="flex-1 text-sm font-bold">{t.titulo}</span>
                  <span aria-hidden="true" className={`grid size-6 place-items-center rounded-md border-2 ${marcado ? 'border-publico-tinta bg-publico-tinta text-publico-acento' : 'border-publico-linea-fuerte bg-publico-superficie'}`}>
                    {marcado && <Icono nombre="visto" className="size-3.5" />}
                  </span>
                </label>
              )
            })}
          </div>
          <p id={`${idForm}-esp-error`} role="alert" className="mt-1.5 min-h-5 text-xs font-bold text-publico-peligro">{errores.especialidades ?? ''}</p>
        </fieldset>
      </form>
    </DialogoPanel>
  )
}
