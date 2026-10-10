import React, { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import NavBar from '@/components/NavBar'
import AccountCard from '@/components/AccountCard'
import EmptyState from '@/components/EmptyState'
import { useAppStore } from '@/store/AppContext'
import { signOne } from '@/services/api'
import { Account } from '@/types'
import styles from './index.module.scss'

const Accounts: React.FC = () => {
  const { accounts, removeAccount, reloadAccounts } = useAppStore()
  const [signingId, setSigningId] = useState('')

  const handleAdd = () => {
    Taro.navigateTo({ url: '/pages/accountEdit/index' })
  }

  const handleEdit = (acc: Account) => {
    Taro.navigateTo({ url: `/pages/accountEdit/index?id=${acc.id}` })
  }

  const handleSign = async (acc: Account) => {
    if (acc.todaySigned) {
      Taro.showToast({ title: '今日已签到', icon: 'none' })
      return
    }
    if (signingId) return
    setSigningId(acc.id)
    try {
      const res = await signOne(acc.id)
      const one = res.results[0]
      Taro.showToast({ title: one?.msg || (res.success ? '签到成功' : '签到失败'), icon: 'none' })
      await reloadAccounts()
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '签到失败，请稍后重试', icon: 'none' })
    } finally {
      setSigningId('')
    }
  }

  const handleDelete = (acc: Account) => {
    Taro.showModal({
      title: '删除账号',
      content: `确定删除「${acc.nickname}」吗？`,
      confirmColor: '#EF4444',
      success: res => {
        if (res.confirm) {
          removeAccount(acc.id)
          Taro.showToast({ title: '已删除', icon: 'none' })
        }
      },
    })
  }

  return (
    <View className={styles.page}>
      <NavBar
        title="账号管理"
        subtitle={`共 ${accounts.length} 个账号`}
        rightSlot={
          <View className={styles.addBtn} onClick={handleAdd}>
            <Text className={styles.addBtnText}>＋ 添加</Text>
          </View>
        }
      />

      <View className={styles.body}>
        {accounts.length === 0 ? (
          <EmptyState icon="👤" title="还没有账号" desc="点击右上角「添加」接入第一个签到账号" />
        ) : (
          accounts.map(acc => (
            <AccountCard
              key={acc.id}
              account={acc}
              onSign={handleSign}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </View>
    </View>
  )
}

export default Accounts