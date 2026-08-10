import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'
import { apiError,requireUser } from '@/lib/api'
import { enforceMutation } from '@/lib/security'
import { supabaseAuthAdmin } from '@/lib/supabase-admin'
import { supabaseRequest } from '@/lib/supabase'

const role=z.enum(['admin','regional','gerencia','consulta'])
const createSchema=z.object({action:z.literal('create'),email:z.string().trim().email().endsWith('@serdan.com.co'),password:z.string().min(12).max(200),role})
const updateSchema=z.object({action:z.literal('update'),id:z.string().uuid(),email:z.string().trim().email().endsWith('@serdan.com.co'),role,active:z.boolean(),password:z.string().min(12).max(200).optional()})
type AuthUser={id:string;email?:string;created_at:string;last_sign_in_at?:string}
type Profile={email:string;role:z.infer<typeof role>;active:boolean}

async function admin(){const user=await requireUser();if(user.role!=='admin')throw new Error('FORBIDDEN');return user}

export async function GET(){try{await admin();const [auth,profiles]=await Promise.all([supabaseAuthAdmin<{users:AuthUser[]}>('users?page=1&per_page=1000'),supabaseRequest<Profile[]>('profiles?select=email,role,active&order=email')]);const byEmail=new Map(profiles.map(p=>[p.email,p]));return NextResponse.json({users:auth.users.map(u=>({...u,email:u.email??'',profile:byEmail.get((u.email??'').toLowerCase())??null})),profilesWithoutAuth:profiles.filter(p=>!auth.users.some(u=>u.email?.toLowerCase()===p.email))})}catch(error){return apiError(error)}}

export async function POST(request:NextRequest){try{const actor=await admin();await enforceMutation(request,actor.email);const raw=await request.json();if(raw.action==='create'){const input=createSchema.parse(raw);const created=await supabaseAuthAdmin<{id:string}>('users',{method:'POST',body:JSON.stringify({email:input.email.toLowerCase(),password:input.password,email_confirm:true})});try{await supabaseRequest('profiles?on_conflict=email',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({email:input.email.toLowerCase(),role:input.role,active:true})})}catch(error){await supabaseAuthAdmin(`users/${created.id}`,{method:'DELETE'}).catch(()=>null);throw error}return NextResponse.json({ok:true},{status:201})}const input=updateSchema.parse(raw);await supabaseAuthAdmin(`users/${input.id}`,{method:'PUT',body:JSON.stringify(input.password?{password:input.password}:{})});await supabaseRequest(`profiles?email=eq.${encodeURIComponent(input.email.toLowerCase())}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({role:input.role,active:input.active,updated_at:new Date().toISOString()})});return NextResponse.json({ok:true})}catch(error){return apiError(error)}}
