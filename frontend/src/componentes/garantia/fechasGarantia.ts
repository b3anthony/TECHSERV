/** La cobertura del taller se comunica con la fecha de Perú. */
export function fechaGarantia(momento: string): string {
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' }).format(new Date(momento))
}

/** "2026-10-24": el día de calendario en Lima de ese momento. */
function diaEnLima(momento: Date): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Lima' }).format(momento)
}

/**
 * Días de calendario (en Lima) entre hoy y el día en que vence: dos garantías
 * que vencen el mismo día dicen lo mismo, venzan a la hora que venzan.
 */
export function diasRestantes(venceEn: string): number {
  const vence = diaEnLima(new Date(venceEn))
  const hoy = diaEnLima(new Date())
  const dias = Math.round((Date.parse(`${vence}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86_400_000)
  return Math.max(0, dias)
}
