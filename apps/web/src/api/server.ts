import { auth } from '@clerk/nextjs/server'
import { createApiClient } from './client'

export function getApiClient() {
  return createApiClient(async () => {
    const { getToken } = await auth()
    const token = await getToken()
    return token ?? ''
  })
}
