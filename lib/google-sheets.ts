import 'server-only'
import { google } from 'googleapis'

function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta configurar ${name}`)
  return value
}

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
})

export const sheets = google.sheets({ version: 'v4', auth })
export const structureSpreadsheetId = () => env('GOOGLE_STRUCTURE_SPREADSHEET_ID')
export const recordsSpreadsheetId = () => env('GOOGLE_RECORDS_SPREADSHEET_ID')

export async function readValues(spreadsheetId: string, range: string) {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range, valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' })
  return response.data.values ?? []
}

export async function appendValues(spreadsheetId: string, range: string, values: unknown[][]) {
  return sheets.spreadsheets.values.append({ spreadsheetId, range, valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS', requestBody: { values } })
}
