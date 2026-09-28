import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface EmptyStateProps {
  icon?: string
  title: string
  desc?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon = '📭', title, desc }) => {
  return (
    <View className={styles.emptyState}>
      <Text className={styles.emptyIcon}>{icon}</Text>
      <Text className={styles.emptyTitle}>{title}</Text>
      {desc && <Text className={styles.emptyDesc}>{desc}</Text>}
    </View>
  )
}

export default EmptyState
