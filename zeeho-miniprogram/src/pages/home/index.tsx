import React, { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')
import NavBar from '@/components/NavBar'
import Card from '@/components/Card'
import { useAppStore } from '@/store/AppContext'
import { signAll, supplementSign, SignAllResult } from '@/services/api'
import styles from './index.module.scss'

const Home: React.FC = () => {
  const { accounts, reloadAccounts } = useAppStore()
  const [signing, setSigning] = useState(false)
  const [result, setResult] = useState<SignAllResult | null>(null)
  const [supplementing, setSupplementing] = useState(false)
  const [suppResult, setSuppResult] = useState<SignAllResult | null>(null)

  const signedCount = accounts.filter(a => a.todaySigned).length
  const pendingCount = accounts.filter(a => a.status === 'expired' || !a.todaySigned).length
  const missedTotal = accounts.reduce((s, a) => s + a.missedDays, 0)
  const missedAccounts = accounts.filter(a => a.missedDays > 0).length

  const handleSignAll = async () => {
    if (signing) return
    setSigning(true)
    setResult(null)
    try {
      const res = await signAll()
      setResult(res)
      await reloadAccounts()
      Taro.showToast({ title: `成功 ${res.success} · 失败 ${res.failed}`, icon: 'none' })
    } catch (e) {
      Taro.showToast({ title: '签到失败，请稍后重试', icon: 'none' })
    } finally {
      setSigning(false)
    }
  }

  const handleSupplement = async () => {
    if (supplementing || missedTotal === 0) return
    setSupplementing(true)
    setSuppResult(null)
    try {
      const res = await supplementSign()
      setSuppResult(res)
      await reloadAccounts()
      Taro.showToast({ title: `补签成功 ${res.success} · 失败 ${res.failed}`, icon: 'none' })
    } catch (e) {
      Taro.showToast({ title: '补签失败，请稍后重试', icon: 'none' })
    } finally {
      setSupplementing(false)
    }
  }

  return (
    <View className={styles.page}>
      <NavBar title="ZEEHO 助手" subtitle={dayjs().format('YYYY年MM月DD日 dddd')} />

      <View className={styles.body}>
        {/* 统计卡 */}
        <Card padding="md" className={styles.statCard}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{signedCount}</Text>
            <Text className={styles.statLabel}>今日已签</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{accounts.length}</Text>
            <Text className={styles.statLabel}>总账号</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{pendingCount}</Text>
            <Text className={styles.statLabel}>待处理</Text>
          </View>
        </Card>

        {/* 一键签到 */}
        <View className={styles.signBtn} onClick={handleSignAll}>
          <Text className={styles.signBtnText}>{signing ? '签到中…' : '一键签到全部账号'}</Text>
        </View>

        {/* 补签 */}
        {missedTotal > 0 && (
          <View className={styles.suppCard}>
            <View className={styles.suppHeader}>
              <View className={styles.suppInfo}>
                <Text className={styles.suppTitle}>待补签</Text>
                <Text className={styles.suppDesc}>{missedAccounts} 个账号共漏签 {missedTotal} 天</Text>
              </View>
              <View className={styles.suppBtn} onClick={handleSupplement}>
                <Text className={styles.suppBtnText}>{supplementing ? '补签中…' : '一键补签'}</Text>
              </View>
            </View>
            {suppResult && (
              <View className={styles.suppResult}>
                {suppResult.results.map((r, i) => (
                  <View key={i} className={styles.resultRow}>
                    <Text className={styles.resultName}>{r.account}</Text>
                    <Text className={r.status === 'success' ? styles.resultOk : styles.resultFail}>{r.msg}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 最近执行结果 */}
        {result && (
          <>
            <Text className={styles.sectionTitle}>执行结果</Text>
            <Card padding="md" className={styles.listCard}>
              {result.results.map((r, i) => (
                <View key={i} className={styles.resultRow}>
                  <Text className={styles.resultName}>{r.account}</Text>
                  <Text className={r.status === 'success' ? styles.resultOk : styles.resultFail}>{r.msg}</Text>
                </View>
              ))}
            </Card>
          </>
        )}
      </View>
    </View>
  )
}

export default Home