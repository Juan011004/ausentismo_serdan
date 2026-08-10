import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/AppShell'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
export const metadata: Metadata = { title: 'Ausentismo | Serdan - Bavaria', description: 'Gestión diaria de asistencia y cubrimientos' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={inter.className}><AppShell>{children}</AppShell><Toaster richColors position="top-right" /></body></html>
}
