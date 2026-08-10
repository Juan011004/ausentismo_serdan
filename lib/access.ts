export type AppRole='admin'|'regional'|'gerencia'|'consulta'
export type AccessProfile={id:string;email:string;role:AppRole;scopes:{regional:string;gerencia:string}[]}
export function canAccess(profile:AccessProfile,regional:string,gerencia:string,write=false){if(profile.role==='admin')return true;if(write&&profile.role==='consulta')return false;if(profile.role==='consulta')return true;return profile.scopes.some(s=>profile.role==='regional'?s.regional===regional:s.gerencia===gerencia)}
export function filterByAccess<T extends {regional:string;gerencia:string}>(profile:AccessProfile,rows:T[]){return rows.filter(r=>canAccess(profile,r.regional,r.gerencia))}
