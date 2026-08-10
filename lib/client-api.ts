type ResilientOptions=RequestInit&{timeoutMs?:number;retries?:number;dedupe?:boolean}

let csrf=''
let csrfRequest:Promise<string>|null=null
const inflight=new Map<string,Promise<Response>>()
const retryable=new Set([408,425,429,500,502,503,504])
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))

async function run(input:string,init:ResilientOptions={}){
  const {timeoutMs=12_000,retries=2,dedupe=true,...requestInit}=init
  const method=(requestInit.method??'GET').toUpperCase()
  const key=`${method}:${input}`
  const execute=async()=>{
    let lastError:unknown
    for(let attempt=0;attempt<=retries;attempt++){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs)
      const cancel=()=>controller.abort()
      requestInit.signal?.addEventListener('abort',cancel,{once:true})
      try{
        const response=await fetch(input,{...requestInit,signal:controller.signal})
        if(!retryable.has(response.status)||attempt===retries)return response
        const retryAfter=Number(response.headers.get('retry-after'))
        await delay(Number.isFinite(retryAfter)&&retryAfter>0?retryAfter*1000:300*2**attempt+Math.random()*250)
      }catch(error){
        lastError=error
        if(requestInit.signal?.aborted||attempt===retries)throw error
        await delay(300*2**attempt+Math.random()*250)
      }finally{clearTimeout(timer);requestInit.signal?.removeEventListener('abort',cancel)}
    }
    throw lastError
  }
  if(method!=='GET'||!dedupe)return execute()
  const existing=inflight.get(key);if(existing)return existing.then(response=>response.clone())
  const promise=execute();inflight.set(key,promise)
  try{return (await promise).clone()}finally{inflight.delete(key)}
}

export async function resilientFetch(input:string,init:ResilientOptions={}){
  return run(input,{...init,retries:init.retries??((init.method??'GET').toUpperCase()==='GET'?2:0)})
}

async function getCsrf(){
  if(csrf)return csrf
  csrfRequest??=run('/api/csrf',{dedupe:true,retries:2}).then(async response=>{
    if(!response.ok)throw new Error('No se pudo iniciar la sesión segura')
    return (await response.json()).token as string
  }).finally(()=>{csrfRequest=null})
  csrf=await csrfRequest
  return csrf
}

export async function secureFetch(input:string,init:ResilientOptions={}){
  const token=await getCsrf()
  // Guardar el lote es seguro de reintentar: requestId lo hace idempotente.
  const idempotentBatch=input==='/api/records'&&(init.method??'GET').toUpperCase()==='POST'
  let response=await run(input,{...init,retries:init.retries??(idempotentBatch?3:0),dedupe:false,headers:{...init.headers,'x-csrf-token':token}})
  if(response.status===403){csrf='';const renewed=await getCsrf();response=await run(input,{...init,retries:0,dedupe:false,headers:{...init.headers,'x-csrf-token':renewed}})}
  return response
}
