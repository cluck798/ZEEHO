import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import Card from '@/components/Card'
import { useAppStore } from '@/store/AppContext'
import { sendAuthCode, login } from '@/services/api'
import styles from './index.module.scss'

type LoginMode = 'token' | 'phone'

const isWeapp = process.env.TARO_ENV === 'weapp'

const AccountEdit: React.FC = () => {
  const router = Taro.useRouter()
  const editId = router.params.id
  const { accounts, addAccount, updateAccount } = useAppStore()

  const existing = editId ? accounts.find(a => a.id === editId) : undefined
  const isEdit = !!existing

  const [mode, setMode] = useState<LoginMode>('token')
  const [nickname, setNickname] = useState(existing?.nickname || '')
  const [token, setToken] = useState(existing?.token || '')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const startCountdown = () => {
    setCountdown(60)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendCode = async () => {
    if (sending || countdown > 0) return
    if (!/^1\d{10}$/.test(phone.trim())) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    setSending(true)
    try {
      await sendAuthCode(phone.trim())
      Taro.showToast({ title: '验证码已发送', icon: 'success' })
      startCountdown()
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '发送失败，请稍后重试', icon: 'none' })
    } finally {
      setSending(false)
    }
  }

  const saveAccount = async (data: { nickname: string; token: string; userId?: string }) => {
    if (!data.token) {
      Taro.showToast({ title: '未获取到有效 Token', icon: 'none' })
      return
    }
    if (isEdit && existing) {
      await updateAccount(existing.id, {
        nickname: data.nickname,
        token: data.token,
        userId: data.userId,
        status: 'normal',
      })
    } else {
      await addAccount({
        id: `${Date.now()}`,
        nickname: data.nickname,
        avatar: `https://picsum.photos/id/${Math.floor(Math.random() * 200)}/200/200`,
        token: data.token,
        userId: data.userId || '',
        status: 'normal',
        lastSignTime: '—',
        todaySigned: false,
        totalPoints: 0,
        continuousDays: 0,
        missedDays: 0,
      })
    }
    Taro.showToast({ title: isEdit ? '已保存' : '已添加', icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 600)
  }

  const handleSave = async () => {
    if (submitting || sending) return

    // Token 登录：直接粘贴 Token
    if (mode === 'token') {
      if (!nickname.trim()) {
        Taro.showToast({ title: '请输入昵称', icon: 'none' })
        return
      }
      if (!token.trim()) {
        Taro.showToast({ title: '请输入 Token', icon: 'none' })
        return
      }
      await saveAccount({ nickname: nickname.trim(), token: token.trim(), userId: existing?.userId })
      return
    }

    // 手机号登录：短信验证码换 Token
    if (!/^1\d{10}$/.test(phone.trim())) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!code.trim()) {
      Taro.showToast({ title: '请输入短信验证码', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const res = await login(phone.trim(), code.trim())
      const finalNick = nickname.trim() || res.nickName || `极友_${phone.trim().slice(-4)}`
      await saveAccount({ nickname: finalNick, token: String(res.token || ''), userId: res.id })
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '登录失败，请检查验证码', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className={styles.page}>
      <View className={styles.body}>
        <Text className={styles.tip}>选择登录方式，填写极核账号信息</Text>

        {/* 登录方式二选一 */}
        <View className={styles.modeSwitch}>
          <View
            className={classnames(styles.modeBtn, mode === 'token' && styles.modeBtnActive)}
            onClick={() => setMode('token')}
          >
            <Text className={classnames(styles.modeBtnText, mode === 'token' && styles.modeBtnTextActive)}>
              Token 登录
            </Text>
          </View>
          <View
            className={classnames(styles.modeBtn, mode === 'phone' && styles.modeBtnActive)}
            onClick={() => setMode('phone')}
          >
            <Text className={classnames(styles.modeBtnText, mode === 'phone' && styles.modeBtnTextActive)}>
              手机号登录
            </Text>
          </View>
        </View>

        <Card padding="md" className={styles.formCard}>
          <View className={styles.field}>
            <Text className={styles.label}>昵称{mode === 'phone' ? '（可选，留空自动获取）' : ''}</Text>
            <Input
              className={styles.input}
              value={nickname}
              placeholder="例如：极友_50a34ce6be"
              placeholderClass={styles.placeholder}
              onInput={e => setNickname(e.detail.value)}
            />
          </View>

          {mode === 'token' ? (
            <View className={styles.field}>
              <Text className={styles.label}>Token</Text>
              <Input
                className={styles.input}
                value={token}
                placeholder="粘贴已登录账号的 token"
                placeholderClass={styles.placeholder}
                onInput={e => setToken(e.detail.value)}
              />
            </View>
          ) : (
            <>
              <View className={styles.field}>
                <Text className={styles.label}>手机号</Text>
                <Input
                  className={styles.input}
                  value={phone}
                  type="number"
                  placeholder="用于登录的手机号"
                  placeholderClass={styles.placeholder}
                  onInput={e => setPhone(e.detail.value)}
                />
              </View>
              <View className={styles.field}>
                <Text className={styles.label}>短信验证码</Text>
                <View className={styles.codeRow}>
                  <Input
                    className={classnames(styles.input, styles.codeInput)}
                    value={code}
                    type="number"
                    maxlength={6}
                    placeholder="6 位验证码"
                    placeholderClass={styles.placeholder}
                    onInput={e => setCode(e.detail.value)}
                  />
                  <View
                    className={classnames(styles.codeBtn, (sending || countdown > 0) && styles.codeBtnDisabled)}
                    onClick={handleSendCode}
                  >
                    <Text className={styles.codeBtnText}>
                      {sending ? '发送中…' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </Card>

        <View className={styles.saveBtn} onClick={handleSave}>
          <Text className={styles.saveBtnText}>
            {submitting ? '登录中…' : isEdit ? '保存修改' : '保存账号'}
          </Text>
        </View>

        <Text className={styles.notice}>
          {isWeapp
            ? '手机号登录会调用极核官方接口换取 Token；Token 登录请先在其他端登录后粘贴 token'
            : '演示环境：保存仅写入本地，不会真实登录'}
        </Text>
      </View>
    </View>
  )
}

export default AccountEdit