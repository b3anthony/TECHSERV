import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { CampoTexto } from '../../componentes/publico/CampoTexto.tsx'
import type { ErrorApi } from '../../tipos.ts'
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

type Errores = Partial<Record<'nombres' | 'apellidos' | 'email' | 'telefono', string>>

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
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  // Un taller atiende una sola especialidad, y sus técnicos, esa.
  const especialidadTaller = tarifas[0]

  function validar(): Errores {
    const e: Errores = {}
    if (!nombres.trim()) e.nombres = 'Escribe los nombres'
    if (!apellidos.trim()) e.apellidos = 'Escribe los apellidos'
    if (!edicion && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Escribe un correo válido: ahí le llegarán las visitas'
    return e
  }

  async function guardar(ev: FormEvent): Promise<void> {
    ev.preventDefault()
    const encontrados = validar()
    setErrores(encontrados)
    setErrorGeneral(null)
    if (Object.keys(encontrados).length > 0) return

    const cuerpo: DatosTecnico = { nombres: nombres.trim(), apellidos: apellidos.trim(), telefono: telefono.trim() }
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
      detalle={edicion ? 'Cambia sus datos de contacto.' : 'No necesita contraseña: recibirá cada visita en su correo, con botones para confirmar y avisar cuando salga.'}
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

        {especialidadTaller && (
          <div className="grid gap-1.5 sm:col-span-2">
            <p className="text-sm font-bold">Atiende</p>
            <p className="flex min-h-13 items-center gap-2 rounded-lg bg-publico-superficie-suave px-3.5 text-publico-tinta-media">
              <Icono nombre={ICONO_ESPECIALIDAD[especialidadTaller.especialidad]} className="size-5 shrink-0" />
              {especialidadTaller.titulo}
              <span className="ml-auto text-xs">la especialidad de tu taller</span>
            </p>
          </div>
        )}
      </form>
    </DialogoPanel>
  )
}
