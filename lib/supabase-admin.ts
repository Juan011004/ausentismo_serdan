import 'server-only'

function config() {
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!key)throw new Error('SUPABASE_NOT_CONFIGURED')
  return {url:url.replace(/\/$/,''),key}
}

export async function supabaseAuthAdmin<T>(path:string,init:RequestInit={}):Promise<T>{
  const {url,key}=config()
  const response=await fetch(`${url}/auth/v1/admin/${path}`,{...init,cache:'no-store',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json',...init.headers}})
  if(!response.ok)throw new Error(`AUTH_ADMIN_${response.status}:${(await response.text()).slice(0,200)}`)
  const text=await response.text()
  return (text?JSON.parse(text):null) as T
}
