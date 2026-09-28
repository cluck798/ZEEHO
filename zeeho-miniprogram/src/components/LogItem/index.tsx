import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import { LogItem as LogItemType } from '@/types'
import styles from './index.module.scss'

interface LogItemProps {
  log: LogItemType
}

const LogItem: React.FC<LogItemProps> = ({ log }) => {
  const statusColor = {
    success: styles.statusSuccess,
    failed: styles.statusFailed,
    running: styles.statusRunning,
  }[log.status]

  return (
    <View className={styles.logItem}>
      <View className={classnames(styles.statusDot, statusColor)} />
      <View className={styles.logContent}>
        <View className={styles.logHeader}>
          <Text className={styles.logAccount}>{log.account}</Text>
          <Text className={styles.logTime}>{log.time}</Text>
        </View>
        <Text className={styles.logAction}>{log.action}</Text>
        <Text className={styles.logDetail}>{log.detail}</Text>
      </View>
    </View>
  )
}

export default LogItem
