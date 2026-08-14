import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/AppShell'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
export const metadata: Metadata = { title: 'Ausentismo | Serdan - Bavaria', description: 'Gestión diaria de asistencia y cubrimientos' }
// La CSP con nonce exige render dinámico para que Next.js pueda aplicar el
// nonce de cada solicitud a todos sus scripts de hidratación.
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={inter.className}><AppShell>{children}</AppShell><Toaster richColors position="top-right" /></body></html>
}
