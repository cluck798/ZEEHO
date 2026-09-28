import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface ToggleProps {
  label: string
  desc?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

const Toggle: React.FC<ToggleProps> = ({ label, desc, checked, onChange }) => {
  return (
    <View className={styles.toggleRow}>
      <View className={styles.toggleInfo}>
        <Text className={styles.toggleLabel}>{label}</Text>
        {desc && <Text className={styles.toggleDesc}>{desc}</Text>}
      </View>
      <View
        className={classnames(styles.toggleTrack, checked && styles.toggleOn)}
        onClick={() => onChange(!checked)}
      >
        <View className={styles.toggleThumb} />
      </View>
    </View>
  )
}

export default Toggle
