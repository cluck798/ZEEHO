import { useMemo } from 'react'
import { useAppStore } from '@/store/AppContext'

export function useCurrentAccount() {
  const { accounts, currentAccountId } = useAppStore()
  return useMemo(
    () => accounts.find(a => a.id === currentAccountId) || accounts[0],
    [accounts, currentAccountId]
  )
}
