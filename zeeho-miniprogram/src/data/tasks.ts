import { TaskItem } from '@/types'

export const mockTasks: TaskItem[] = [
  { id: '1', name: '每日签到', desc: '登录小程序自动签到', icon: 'check', points: 10, completed: true },
  { id: '2', name: '分享动态', desc: '分享一条动态到社区', icon: 'share', points: 5, completed: true },
  { id: '3', name: '发布动态', desc: '发布一条原创动态', icon: 'post', points: 8, completed: false },
  { id: '4', name: '点赞动态', desc: '点赞他人动态', icon: 'like', points: 3, completed: false },
  { id: '5', name: '评论动态', desc: '评论他人动态', icon: 'comment', points: 3, completed: false },
]
