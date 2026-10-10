import React from 'react'
import { View, Text, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import NavBar from '@/components/NavBar'
import Card from '@/components/Card'
import Toggle from '@/components/Toggle'
import { useAppStore } from '@/store/AppContext'
import { clearLogs } from '@/services/api'
import styles from './index.module.scss'

const isWeapp = process.env.TARO_ENV === 'weapp'

const Mine: React.FC = () => {
  const { settings, setSettings } = useAppStore()

  const update = (patch: Partial<typeof settings>) => setSettings({ ...settings, ...patch })

  const onTimeChange = (e: { detail: { value: string } }) => {
    update({ signTime: e.detail.value })
  }

  const clearLogHint = () => {
    if (!isWeapp) {
      Taro.showToast({ title: '演示环境，暂不清理', icon: 'none' })
      return
    }
    Taro.showModal({
      title: '清空日志',
      content: '确定清空云端签到日志吗？',
      success: async res => {
        if (!res.confirm) return
        try {
          await clearLogs()
          Taro.showToast({ title: '已清空', icon: 'success' })
        } catch (e) {
          Taro.showToast({ title: '清空失败，请稍后重试', icon: 'none' })
        }
      },
    })
  }

  return (
    <View className={styles.page}>
      <NavBar title="我的" subtitle="自动任务与通知设置" />

      <View className={styles.body}>
        <Text className={styles.sectionTitle}>自动任务</Text>
        <Card padding="md" className={styles.listCard}>
          <Toggle
            label="自动签到"
            desc="每天定时为所有账号完成签到"
            checked={settings.autoSign}
            onChange={v => update({ autoSign: v })}
          />
          <Toggle
            label="自动点赞"
            desc="签到后自动点赞社区动态"
            checked={settings.autoLike}
            onChange={v => update({ autoLike: v })}
          />
          <Toggle
            label="自动评论"
            desc="签到后自动评论社区动态"
            checked={settings.autoComment}
            onChange={v => update({ autoComment: v })}
          />
        </Card>

        <Text className={styles.sectionTitle}>签到时间</Text>
        <Card padding="md" className={styles.listCard}>
          <Picker mode="time" value={settings.signTime} onChange={onTimeChange}>
            <View className={styles.row}>
              <Text className={styles.rowLabel}>每日签到时间</Text>
              <Text className={styles.rowValue}>{settings.signTime}</Text>
            </View>
          </Picker>
        </Card>

        <Text className={styles.sectionTitle}>通知</Text>
        <Card padding="md" className={styles.listCard}>
          <Toggle
            label="消息通知"
            desc="签到结果通过订阅消息推送"
            checked={settings.msgNotify}
            onChange={v => update({ msgNotify: v })}
          />
        </Card>

        <Text className={styles.sectionTitle}>其他</Text>
        <Card padding="md" className={styles.listCard}>
          <View className={styles.row} onClick={clearLogHint}>
            <Text className={styles.rowLabel}>清空签到日志</Text>
          </View>
        </Card>

        <Text className={styles.version}>
          {isWeapp ? 'ZEEHO 助手 · v1.0.0' : 'ZEEHO 助手 · v1.0.0（演示模式）'}
        </Text>
      </View>
    </View>
  )
}

export default Mine