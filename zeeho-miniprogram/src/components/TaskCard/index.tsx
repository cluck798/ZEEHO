import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import { TaskItem } from '@/types'
import styles from './index.module.scss'

interface TaskCardProps {
  task: TaskItem
  onAction?: (task: TaskItem) => void
}

const iconMap: Record<string, string> = {
  check: '✓',
  share: '↗',
  post: '✎',
  like: '♥',
  comment: '💬',
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onAction }) => {
  return (
    <View className={styles.taskCard} onClick={() => onAction?.(task)}>
      <View className={classnames(styles.taskIcon, task.completed && styles.taskIconDone)}>
        <Text className={styles.taskIconText}>{iconMap[task.icon] || '·'}</Text>
      </View>
      <View className={styles.taskInfo}>
        <Text className={styles.taskName}>{task.name}</Text>
        <Text className={styles.taskDesc}>{task.desc}</Text>
      </View>
      <View className={styles.taskRight}>
        <Text className={styles.taskPoints}>+{task.points}</Text>
        <View className={classnames(styles.taskBtn, task.completed && styles.taskBtnDone)}>
          <Text className={styles.taskBtnText}>{task.completed ? '已完成' : '去完成'}</Text>
        </View>
      </View>
    </View>
  )
}

export default TaskCard
