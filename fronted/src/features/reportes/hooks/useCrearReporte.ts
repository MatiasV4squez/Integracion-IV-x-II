import { useRef, useState } from 'react'
import type { DatosReporte, EstadoEnvioReporte } from '../models/reporte'
import { crearReporte, ErrorCrearReporte } from '../service/crear-reporte-api'

export function useCrearReporte(token: string) {
  const [envio, setEnvio] = useState<EstadoEnvioReporte>({
    estado: 'inicial',
  })
  const bloqueado = useRef(false)

  async function enviar(datos: DatosReporte) {
    if (bloqueado.current) return

    bloqueado.current = true
    setEnvio({ estado: 'enviando' })

    try {
      await crearReporte(datos, token)
      setEnvio({ estado: 'enviado' })
    } catch (error) {
      const incierto = error instanceof ErrorCrearReporte && error.incierto
      const mensaje = error instanceof Error
        ? error.message
        : 'Ocurrió un error al enviar el reporte.'

      bloqueado.current = incierto

      setEnvio(incierto
        ? { estado: 'incierto', mensaje }
        : { estado: 'error', mensaje })
    }
  }

  return { envio, enviar }
}