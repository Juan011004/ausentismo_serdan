'use client'
import { FormEvent, useState } from 'react'

export default function LoginPage() {
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setLoading(true);setError('')
    const form=new FormData(event.currentTarget)
    const response=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password')})})
    setLoading(false)
    if(response.ok)location.href='/'
    else setError('Correo, contraseña o permisos inválidos.')
  }
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-4"><section className="card w-full max-w-sm p-8"><div className="text-center"><p className="text-3xl font-black text-blue-800">SERDAN</p><p className="mt-1 text-sm font-bold tracking-widest text-red-600">BAVARIA · TAT</p><h1 className="mt-8 text-xl font-bold">Gestión de ausentismo</h1><p className="mt-2 text-sm text-slate-500">Ingresa con la cuenta asignada por el administrador.</p></div><form className="mt-6 space-y-4" method="post" action="/api/auth/login" onSubmit={submit}><label className="block text-sm font-semibold">Correo<input name="email" type="email" autoComplete="username" required className="mt-1 w-full rounded-lg border p-3" /></label><label className="block text-sm font-semibold">Contraseña<input name="password" type="password" autoComplete="current-password" minLength={8} required className="mt-1 w-full rounded-lg border p-3" /></label>{error&&<p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}<button disabled={loading} className="btn-primary w-full" type="submit">{loading?'Ingresando…':'Ingresar'}</button></form></section></main>
}
