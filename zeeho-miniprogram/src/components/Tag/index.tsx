import React from 'react'
import { Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface TagProps {
  text: string
  type?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

const Tag: React.FC<TagProps> = ({ text, type = 'primary', size = 'md' }) => {
  return (
    <Text className={classnames(styles.tag, styles[type], styles[size])}>
      {text}
    </Text>
  )
}

export default Tag
