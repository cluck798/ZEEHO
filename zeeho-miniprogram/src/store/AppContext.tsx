import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import Taro from '@tarojs/taro'
import { Account, Settings } from '@/types'
import { mockAccounts } from '@/data/accounts'

const isWeapp = process.env.TARO_ENV === 'weapp'

interface AppState {
  accounts: Account[]
  settings: Settings
  currentAccountId: string
  loading: boolean
  setAccounts: (list: Account[]) => void
  setSettings: (s: Settings) => void
  setCurrentAccountId: (id: string) => void
  addAccount: (acc: Account) => Promise<void>
  updateAccount: (id: string, patch: Partial<Account>) => Promise<void>
  removeAccount: (id: string) => Promise<void>
  reloadAccounts: () => Promise<void>
}

const defaultSettings: Settings = {
  autoSign: true,
  signTime: '08:00',
  autoLike: false,
  autoComment: false,
  msgNotify: true,
}

const AppContext = createContext<AppState | null>(null)

// 云数据库记录 → Account
function mapRecord(r: any): Account {
  return {
    id: r._id,
    nickname: r.nickname || '',
    avatar: r.avatar || '',
    token: r.token || '',
    userId: r.userId || '',
    status: r.status || 'normal',
    lastSignTime: r.lastSignTime || '—',
    todaySigned: !!r.todaySigned,
    totalPoints: r.totalPoints || 0,
    continuousDays: r.continuousDays || 0,
    missedDays: r.missedDays || 0,
  }
}

// Account → 云数据库写入字段
function toRecord(acc: Account) {
  return {
    nickname: acc.nickname,
    avatar: acc.avatar,
    token: acc.token,
    userId: acc.userId || '',
    status: acc.status,
    lastSignTime: acc.lastSignTime,
    todaySigned: acc.todaySigned,
    totalPoints: acc.totalPoints,
    continuousDays: acc.continuousDays,
    missedDays: acc.missedDays,
    enabled: true,
  }
}

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(isWeapp ? [] : mockAccounts)
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [currentAccountId, setCurrentAccountId] = useState('')
  const [loading, setLoading] = useState(isWeapp)

  // weapp 下从云数据库读取账号
  const loadAccounts = async () => {
    if (!isWeapp) return
    try {
      const db = Taro.cloud.database()
      const res = await db.collection('accounts').get()
      const list = (res.data || []).map(mapRecord)
      setAccounts(list)
      setCurrentAccountId(prev => prev || list[0]?.id || '')
    } catch (err) {
      console.error('[Cloud] 读取账号失败', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addAccount = async (acc: Account) => {
    if (isWeapp) {
      const db = Taro.cloud.database()
      const res = await db.collection('accounts').add({ data: toRecord(acc) })
      setAccounts(prev => [...prev, { ...acc, id: res._id }])
    } else {
      setAccounts(prev => [...prev, acc])
    }
  }

  const updateAccount = async (id: string, patch: Partial<Account>) => {
    if (isWeapp && id) {
      const db = Taro.cloud.database()
      const data: Record<string, any> = {}
      if ('nickname' in patch) data.nickname = patch.nickname
      if ('avatar' in patch) data.avatar = patch.avatar
      if ('token' in patch) data.token = patch.token
      if (patch.userId !== undefined) data.userId = patch.userId
      if ('status' in patch) data.status = patch.status
      if ('lastSignTime' in patch) data.lastSignTime = patch.lastSignTime
      if ('todaySigned' in patch) data.todaySigned = patch.todaySigned
      if ('totalPoints' in patch) data.totalPoints = patch.totalPoints
      if ('continuousDays' in patch) data.continuousDays = patch.continuousDays
      if ('missedDays' in patch) data.missedDays = patch.missedDays
      try {
        await db.collection('accounts').doc(id).update({ data })
      } catch (e) {
        console.error('[Cloud] 更新失败', e)
      }
    }
    setAccounts(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)))
  }

  const removeAccount = async (id: string) => {
    if (isWeapp && id) {
      const db = Taro.cloud.database()
      try {
        await db.collection('accounts').doc(id).remove()
      } catch (e) {
        console.error('[Cloud] 删除失败', e)
      }
    }
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  return (
    <AppContext.Provider
      value={{
        accounts,
        settings,
        currentAccountId,
        loading,
        setAccounts,
        setSettings,
        setCurrentAccountId,
        addAccount,
        updateAccount,
        removeAccount,
        reloadAccounts: loadAccounts,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppStore() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore must be used within AppContextProvider')
  return ctx
}