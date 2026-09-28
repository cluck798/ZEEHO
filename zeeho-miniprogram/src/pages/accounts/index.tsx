import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import NavBar from '@/components/NavBar'
import AccountCard from '@/components/AccountCard'
import EmptyState from '@/components/EmptyState'
import { useAppStore } from '@/store/AppContext'
import { Account } from '@/types'
import styles from './index.module.scss'

const Accounts: React.FC = () => {
  const { accounts, removeAccount, updateAccount } = useAppStore()

  const handleAdd = () => {
    Taro.navigateTo({ url: '/pages/accountEdit/index' })
  }

  const handleEdit = (acc: Account) => {
    Taro.navigateTo({ url: `/pages/accountEdit/index?id=${acc.id}` })
  }

  const handleSign = (acc: Account) => {
    if (acc.todaySigned) {
      Taro.showToast({ title: '今日已签到', icon: 'none' })
      return
    }
    updateAccount(acc.id, { todaySigned: true, lastSignTime: '刚刚' })
    Taro.showToast({ title: '签到成功（演示）', icon: 'success' })
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