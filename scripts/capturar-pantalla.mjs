// Captura una pantalla del frontend YA AUTENTICADO.
//
// Sin esto solo se puede fotografiar lo público: el panel exige sesión, y el
// informe de un brazo no es prueba de que su pantalla se vea bien.
//
//   node capturar.mjs <ruta> <salida.png> [correo] [ancho] [alto]
//
// Habla el protocolo de Chrome por el WebSocket nativo de Node 22: no hace
// falta puppeteer ni instalar nada.

const [ruta, salida, correo = 'jorge@serviciosdelgado.pe', ancho = '1280', alto = '900'] = process.argv.slice(2)
if (!ruta || !salida) { console.error('uso: node capturar.mjs <ruta> <salida.png> [correo] [ancho] [alto]'); process.exit(1) }

const sesion = await (await fetch('http://localhost:5173/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: correo, clave: 'demo1234' }),
})).json()
if (!sesion.token) { console.error('no pude iniciar sesión:', JSON.stringify(sesion).slice(0, 200)); process.exit(1) }

const objetivo = await (await fetch('http://localhost:9222/json/new?about:blank', { method: 'PUT' })).json()
const ws = new WebSocket(objetivo.webSocketDebuggerUrl)
await new Promise((ok) => ws.addEventListener('open', ok, { once: true }))

let n = 0
const pendientes = new Map()
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m.result); pendientes.delete(m.id) }
})
const cdp = (method, params = {}) => new Promise((ok) => {
  const id = ++n
  pendientes.set(id, ok)
  ws.send(JSON.stringify({ id, method, params }))
})

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms))

await cdp('Page.enable')
await cdp('Runtime.enable')
await cdp('Log.enable')
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails
    console.error('EXCEPCION:', d.exception?.description || d.text)
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    console.error('CONSOLA:', m.params.entry.text)
  }
})
await cdp('Emulation.setDeviceMetricsOverride', { width: +ancho, height: +alto, deviceScaleFactor: 1, mobile: +ancho < 500 })

// Primero hay que estar EN el origen para poder escribir su localStorage.
await cdp('Page.navigate', { url: 'http://localhost:5173/entrar' })
await espera(2500)
await cdp('Runtime.evaluate', {
  expression: `localStorage.setItem('techserv.sesion', ${JSON.stringify(JSON.stringify(sesion))})`,
})

await cdp('Page.navigate', { url: 'http://localhost:5173' + ruta })
await espera(4000)

const { data } = await cdp('Page.captureScreenshot', { format: 'png' })
const fs = await import('node:fs/promises')
await fs.writeFile(salida, Buffer.from(data, 'base64'))
console.log('capturado', ruta, '->', salida)

// Los errores de consola de la propia página: si la pantalla se ve vacía,
// aquí está el motivo.
const { result } = await cdp('Runtime.evaluate', {
  expression: `document.body.innerText.slice(0, 400)`, returnByValue: true,
})
console.log('--- texto visible ---')
console.log(result.value)
ws.close()
process.exit(0)
