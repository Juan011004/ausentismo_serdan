import { NextResponse } from 'next/server'
import { apiError,requireUser } from '@/lib/api'
import { csrfToken } from '@/lib/security'
export const dynamic='force-dynamic'
export async function GET(){try{const user=await requireUser();return NextResponse.json({token:csrfToken(user.email)})}catch(error){return apiError(error)}}
