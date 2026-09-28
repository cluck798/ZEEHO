import React from 'react'
import { View } from '@tarojs/components'
import NavBar from '@/components/NavBar'
import Card from '@/components/Card'
import LogItem from '@/components/LogItem'
import EmptyState from '@/components/EmptyState'
import { mockLogs } from '@/data/logs'
import styles from './index.module.scss'

const Logs: React.FC = () => {
  return (
    <View className={styles.page}>
      <NavBar title="签到日志" subtitle={`共 ${mockLogs.length} 条记录`} />

      <View className={styles.body}>
        {mockLogs.length === 0 ? (
          <EmptyState icon="📋" title="暂无日志" desc="执行签到后这里会展示记录" />
        ) : (
          <Card padding="md" className={styles.listCard}>
            {mockLogs.map(log => (
              <LogItem key={log.id} log={log} />
            ))}
          </Card>
        )}
      </View>
    </View>
  )
}

export default Logs