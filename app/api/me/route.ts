import { NextResponse } from 'next/server'
import { apiError,requireUser } from '@/lib/api'
export async function GET(){try{const user=await requireUser();return NextResponse.json({role:user.role,scopes:user.scopes})}catch(error){return apiError(error)}}
