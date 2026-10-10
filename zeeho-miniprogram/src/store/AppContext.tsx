import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import Taro from '@tarojs/taro'
import { Account, Settings } from '@/types'
import { mockAccounts } from '@/data/accounts'

const isWeapp = process.env.TARO_ENV === 'weapp'

// 云环境初始化兜底：任何云 API 调用前确保 init 已执行（重复调用 wx.cloud.init 是安全的）
function ensureCloudInit() {
  if (!isWeapp) return
  try {
    Taro.cloud.init({ env: 'cloudbase-d0gemr0f16e9211f0', traceUser: true })
  } catch (e) {
    console.error('[Cloud] init 失败', e)
  }
}

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

// 设置本地缓存 key（重进小程序不再回默认值）
const SETTINGS_KEY = 'zh_settings'

function loadLocalSettings(): Settings {
  if (!isWeapp) return defaultSettings
  try {
    const raw = Taro.getStorageSync(SETTINGS_KEY)
    if (raw && typeof raw === 'object') return { ...defaultSettings, ...raw }
  } catch (e) { /* ignore */ }
  return defaultSettings
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
  const [settings, setSettingsState] = useState<Settings>(loadLocalSettings())
  const [currentAccountId, setCurrentAccountId] = useState('')
  const [loading, setLoading] = useState(isWeapp)

  // weapp 下从云数据库读取账号（失败自动重试一次，避免初始化时序抖动导致列表空白）
  const loadAccounts = async () => {
    if (!isWeapp) return
    ensureCloudInit()
    const readOnce = async () => {
      const db = Taro.cloud.database()
      const res = await db.collection('accounts').get()
      return (res.data || []).map(mapRecord)
    }
    try {
      let list: Account[]
      try {
        list = await readOnce()
      } catch (e) {
        console.warn('[Cloud] 读取账号失败，800ms 后重试', e)
        await new Promise(r => setTimeout(r, 800))
        list = await readOnce()
      }
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
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 设置：本地缓存 + 云端（settings/global，定时签到任务读取它决定是否执行）双写
  const setSettings = (s: Settings) => {
    setSettingsState(s)
    try { Taro.setStorageSync(SETTINGS_KEY, s) } catch (e) { /* ignore */ }
    if (isWeapp) {
      ensureCloudInit()
      try {
        Taro.cloud.database().collection('settings').doc('global')
          .set({ data: { ...s, updatedAt: Date.now() } })
          .catch((e: any) => console.warn('[Cloud] 设置同步失败', e))
      } catch (e) { console.warn('[Cloud] 设置同步失败', e) }
    }
  }

  // 启动时从云端拉一次设置（重装/换设备也能恢复）
  const loadSettings = async () => {
    if (!isWeapp) return
    ensureCloudInit()
    try {
      const res = await Taro.cloud.database().collection('settings').doc('global').get()
      if (res && res.data) {
        const merged = { ...defaultSettings, ...res.data }
        setSettingsState(merged)
        try { Taro.setStorageSync(SETTINGS_KEY, merged) } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // 云端还没有设置文档：把本地值推上去（集合不存在时会失败，忽略；执行过签到后集合自动创建）
      const local = loadLocalSettings()
      try {
        Taro.cloud.database().collection('settings').doc('global')
          .set({ data: { ...local, updatedAt: Date.now() } })
          .catch(() => { /* ignore */ })
      } catch (e2) { /* ignore */ }
    }
  }

  const addAccount = async (acc: Account) => {
    // 同一 Token 视为同一账号：已存在则更新，避免重复添加
    const dup = acc.token ? accounts.find(a => a.token && a.token === acc.token) : undefined
    if (dup) {
      await updateAccount(dup.id, {
        nickname: acc.nickname || dup.nickname,
        token: acc.token,
        userId: acc.userId || dup.userId,
        status: 'normal',
      })
      return
    }
    if (isWeapp) {
      ensureCloudInit()
      const db = Taro.cloud.database()
      const res = await db.collection('accounts').add({ data: toRecord(acc) })
      setAccounts(prev => [...prev, { ...acc, id: res._id }])
    } else {
      setAccounts(prev => [...prev, acc])
    }
  }

  const updateAccount = async (id: string, patch: Partial<Account>) => {
    if (isWeapp && id) {
      ensureCloudInit()
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
      ensureCloudInit()
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