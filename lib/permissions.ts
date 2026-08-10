import 'server-only'
import { supabaseRequest } from './supabase'
import type { AppRole,AccessProfile } from './access'
export { canAccess,filterByAccess } from './access'
export async function getAccessProfile(email:string):Promise<AccessProfile>{const profiles=await supabaseRequest<{id:string;email:string;role:AppRole}[]>(`profiles?email=eq.${encodeURIComponent(email.toLowerCase())}&active=eq.true&select=id,email,role`);const profile=profiles[0];if(!profile)throw new Error('FORBIDDEN');const scopes=await supabaseRequest<{regional:string;gerencia:string}[]>(`profile_scopes?profile_id=eq.${profile.id}&select=regional,gerencia`);return {...profile,scopes}}
