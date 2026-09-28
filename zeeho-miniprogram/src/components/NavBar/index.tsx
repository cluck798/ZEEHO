import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface NavBarProps {
  title: string
  subtitle?: string
  rightSlot?: React.ReactNode
}

const NavBar: React.FC<NavBarProps> = ({ title, subtitle, rightSlot }) => {
  return (
    <View className={styles.navBar}>
      <View className={styles.navContent}>
        <View className={styles.navLeft}>
          <Text className={styles.navTitle}>{title}</Text>
          {subtitle && <Text className={styles.navSubtitle}>{subtitle}</Text>}
        </View>
        {rightSlot && <View className={styles.navRight}>{rightSlot}</View>}
      </View>
    </View>
  )
}

export default NavBar
