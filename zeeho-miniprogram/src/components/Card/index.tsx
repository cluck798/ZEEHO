import React from 'react'
import { View } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({ children, className, padding = 'md', onClick }) => {
  return (
    <View
      className={classnames(styles.card, styles[`padding${padding.toUpperCase()}`], className)}
      onClick={onClick}
    >
      {children}
    </View>
  )
}

export default Card
