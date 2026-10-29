import type { ReactNode } from 'react'
import { AccesoLayout } from '../shared/layout/AccesoLayout'

interface AuthLayoutProps {
  children: ReactNode
  activeTab: 'login' | 'register'
}

export default function AuthLayout({ children, activeTab }: AuthLayoutProps) {
  return (
    <AccesoLayout
      idTitulo="acceso-titulo"
      pestanaActiva={activeTab}
      titulo={activeTab === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
      descripcion={activeTab === 'login' ? 'Ingresa con tu cuenta institucional para continuar.' : 'Regístrate con tu correo institucional.'}
    >
      {children}
    </AccesoLayout>
  )
}
