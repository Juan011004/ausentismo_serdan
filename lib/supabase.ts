import 'server-only'
function config() { const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY; if(!url||!key) throw new Error('SUPABASE_NOT_CONFIGURED'); return {url:url.replace(/\/$/,''),key} }
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
export async function supabaseRequest<T>(path:string,init:RequestInit={}):Promise<T>{
  const {url,key}=config(),method=(init.method??'GET').toUpperCase(),attempts=method==='GET'?3:1
  for(let attempt=0;attempt<attempts;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12_000)
    try{
      const response=await fetch(`${url}/rest/v1/${path}`,{...init,signal:controller.signal,cache:'no-store',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json',...init.headers}})
      if(response.ok){const text=await response.text();return (text?JSON.parse(text):null) as T}
      if(attempt<attempts-1&&[408,429,500,502,503,504].includes(response.status)){await wait(250*2**attempt+Math.random()*200);continue}
      throw new Error(`SUPABASE_${response.status}:${(await response.text()).slice(0,300)}`)
    }catch(error){if(attempt===attempts-1||method!=='GET')throw error;await wait(250*2**attempt+Math.random()*200)}
    finally{clearTimeout(timer)}
  }
  throw new Error('SUPABASE_UNAVAILABLE')
}
export async function rpc<T>(name:string,body:object):Promise<T>{return supabaseRequest<T>(`rpc/${name}`,{method:'POST',body:JSON.stringify(body)})}
