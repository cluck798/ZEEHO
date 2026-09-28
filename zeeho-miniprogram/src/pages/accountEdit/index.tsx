import React, { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import Card from '@/components/Card'
import { useAppStore } from '@/store/AppContext'
import styles from './index.module.scss'

type LoginMode = 'token' | 'phone'

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
  const [password, setPassword] = useState('')

  const handleSave = async () => {
    if (!nickname.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    if (mode === 'token' && !token.trim()) {
      Taro.showToast({ title: '请输入 Token', icon: 'none' })
      return
    }
    if (mode === 'phone' && (!phone.trim() || !password.trim())) {
      Taro.showToast({ title: '请输入手机号和密码', icon: 'none' })
      return
    }

    const finalToken = mode === 'token' ? token.trim() : `phone_***_${phone.trim().slice(-4)}`

    if (isEdit && existing) {
      await updateAccount(existing.id, { nickname: nickname.trim(), token: finalToken })
      Taro.showToast({ title: '已保存', icon: 'success' })
    } else {
      await addAccount({
        id: `${Date.now()}`,
        nickname: nickname.trim(),
        avatar: `https://picsum.photos/id/${Math.floor(Math.random() * 200)}/200/200`,
        token: finalToken,
        status: 'normal',
        lastSignTime: '—',
        todaySigned: false,
        totalPoints: 0,
        continuousDays: 0,
        missedDays: 0,
      })
      Taro.showToast({ title: '已添加', icon: 'success' })
    }

    setTimeout(() => Taro.navigateBack(), 600)
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
            <Text className={styles.label}>昵称</Text>
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
                <Text className={styles.label}>密码</Text>
                <Input
                  className={styles.input}
                  value={password}
                  password
                  placeholder="登录密码"
                  placeholderClass={styles.placeholder}
                  onInput={e => setPassword(e.detail.value)}
                />
              </View>
            </>
          )}
        </Card>

        <View className={styles.saveBtn} onClick={handleSave}>
          <Text className={styles.saveBtnText}>{isEdit ? '保存修改' : '保存账号'}</Text>
        </View>

        <Text className={styles.notice}>演示环境：保存仅写入本地，不会真实登录</Text>
      </View>
    </View>
  )
}

export default AccountEdit