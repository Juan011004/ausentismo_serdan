'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3,ClipboardCheck,Database,LayoutDashboard,LogOut,ShieldCheck,Users } from 'lucide-react'
import { cn } from '@/lib/ui'
import { useEffect,useState } from 'react'

const allItems=[
  {href:'/',label:'Registro diario',icon:ClipboardCheck},
  {href:'/consolidado',label:'Consolidado',icon:BarChart3},
  {href:'/estructura',label:'Estructura',icon:Database},
  {href:'/dashboard',label:'Dashboard',icon:LayoutDashboard},
  {href:'/admin/sync',label:'Sincronización',icon:ShieldCheck},
  {href:'/admin/usuarios',label:'Usuarios',icon:Users}
]

export function AppShell({children}:{children:React.ReactNode}){
  const pathname=usePathname(),[role,setRole]=useState('')
  useEffect(()=>{fetch('/api/me').then(r=>r.ok?r.json():null).then(r=>setRole(r?.role??''));let last=Date.now();const active=()=>{last=Date.now()};for(const event of ['click','keydown','pointerdown'])addEventListener(event,active,{passive:true});const timer=setInterval(()=>{if(Date.now()-last>30*60*1000)logout('/login?reason=inactive')},60_000);return()=>{clearInterval(timer);for(const event of ['click','keydown','pointerdown'])removeEventListener(event,active)}},[])
  async function logout(destination='/login'){await fetch('/api/auth/logout',{method:'POST'}).catch(()=>null);location.href=destination}
  const items=allItems.filter(x=>(!x.href.startsWith('/admin/')||role==='admin')&&(x.href!=='/'||role!=='consulta'))
  if(pathname==='/login')return children
  return <div className="min-h-screen lg:flex"><aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:flex-col"><div className="border-b border-slate-200 px-5 py-5"><p className="text-xl font-black text-blue-800">SERDAN</p><p className="text-xs font-bold tracking-widest text-red-600">BAVARIA · TAT</p></div><nav className="flex-1 space-y-1 p-3">{items.map(({href,label,icon:Icon})=><Link key={href} href={href} className={cn('flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold',pathname===href?'bg-blue-700 text-white':'hover:bg-slate-100')}><Icon className="h-5 w-5"/>{label}</Link>)}</nav><button onClick={()=>logout()} className="m-3 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold hover:bg-slate-100"><LogOut className="h-5 w-5"/>Salir</button></aside><div className="min-w-0 flex-1 lg:ml-64"><header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between"><div><p className="font-bold">Gestión de Ausentismo</p><p className="text-xs text-slate-500">Operación nacional</p></div><div className="flex gap-1 lg:hidden">{items.map(({href,icon:Icon})=><Link key={href} href={href} className={cn('rounded-lg p-2',pathname===href?'bg-blue-700 text-white':'bg-slate-100')} aria-label={href}><Icon className="h-5 w-5"/></Link>)}</div></div></header><main className="mx-auto max-w-7xl p-4 lg:p-6">{children}</main></div></div>
}
