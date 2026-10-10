import React, { useState } from 'react'
import { View } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import NavBar from '@/components/NavBar'
import Card from '@/components/Card'
import LogItemComponent from '@/components/LogItem'
import EmptyState from '@/components/EmptyState'
import { fetchLogs } from '@/services/api'
import { mockLogs } from '@/data/logs'
import { LogItem } from '@/types'
import styles from './index.module.scss'

const isWeapp = process.env.TARO_ENV === 'weapp'

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogItem[]>(isWeapp ? [] : mockLogs)
  const [loading, setLoading] = useState(isWeapp)

  const load = () => {
    if (!isWeapp) return
    fetchLogs()
      .then(list => setLogs(list || []))
      .catch(() => { /* 读取失败保持上次数据 */ })
      .finally(() => setLoading(false))
  }

  // 每次切到日志 tab 都刷新（签到/补签后能看到最新记录）
  useDidShow(load)

  return (
    <View className={styles.page}>
      <NavBar title="签到日志" subtitle={loading ? '加载中…' : `共 ${logs.length} 条记录`} />

      <View className={styles.body}>
        {logs.length === 0 && !loading ? (
          <EmptyState icon="📋" title="暂无日志" desc="执行签到后这里会展示记录" />
        ) : (
          <Card padding="md" className={styles.listCard}>
            {logs.map(log => (
              <LogItemComponent key={log.id} log={log} />
            ))}
          </Card>
        )}
      </View>
    </View>
  )
}

export default Logs