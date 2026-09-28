import React from 'react'
import { View, Text, Image } from '@tarojs/components'
import classnames from 'classnames'
import { Account } from '@/types'
import Tag from '@/components/Tag'
import styles from './index.module.scss'

interface AccountCardProps {
  account: Account
  onSign?: (acc: Account) => void
  onEdit?: (acc: Account) => void
  onDelete?: (acc: Account) => void
}

const AccountCard: React.FC<AccountCardProps> = ({ account, onSign, onEdit, onDelete }) => {
  return (
    <View className={styles.accountCard}>
      <View className={styles.accountHeader}>
        <Image className={styles.accountAvatar} src={account.avatar} mode="aspectFill" />
        <View className={styles.accountMeta}>
          <View className={styles.accountNameRow}>
            <Text className={styles.accountName}>{account.nickname}</Text>
            <Tag
              text={account.status === 'normal' ? '正常' : '已过期'}
              type={account.status === 'normal' ? 'success' : 'error'}
              size="sm"
            />
          </View>
          <Text className={styles.accountToken}>{account.token}</Text>
        </View>
      </View>

      <View className={styles.accountStats}>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{account.totalPoints}</Text>
          <Text className={styles.statLabel}>总积分</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{account.continuousDays}</Text>
          <Text className={styles.statLabel}>连续签到</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{account.lastSignTime}</Text>
          <Text className={styles.statLabel}>上次签到</Text>
        </View>
      </View>

      <View className={styles.accountActions}>
        <View
          className={classnames(styles.actionBtn, styles.actionPrimary)}
          onClick={() => onSign?.(account)}
        >
          <Text className={styles.actionPrimaryText}>{account.todaySigned ? '已签到' : '签到'}</Text>
        </View>
        <View className={classnames(styles.actionBtn, styles.actionSecondary)} onClick={() => onEdit?.(account)}>
          <Text className={styles.actionSecondaryText}>编辑</Text>
        </View>
        <View className={classnames(styles.actionBtn, styles.actionDanger)} onClick={() => onDelete?.(account)}>
          <Text className={styles.actionDangerText}>删除</Text>
        </View>
      </View>
    </View>
  )
}

export default AccountCard
