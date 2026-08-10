import {afterEach,describe,expect,it,vi} from 'vitest'
import {resilientFetch} from './client-api'

describe('cliente resiliente',()=>{
  afterEach(()=>vi.unstubAllGlobals())
  it('deduplica lecturas simultáneas y entrega respuestas independientes',async()=>{
    const network=vi.fn(async()=>new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}}))
    vi.stubGlobal('fetch',network)
    const [a,b]=await Promise.all([resilientFetch('/api/initial'),resilientFetch('/api/initial')])
    expect(network).toHaveBeenCalledTimes(1)
    expect(await a.json()).toEqual({ok:true})
    expect(await b.json()).toEqual({ok:true})
  })
})
