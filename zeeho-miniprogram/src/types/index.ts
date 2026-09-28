// 账号信息
export interface Account {
  id: string
  nickname: string
  avatar: string
  token: string
  status: 'normal' | 'expired'
  lastSignTime: string
  todaySigned: boolean
  totalPoints: number
  continuousDays: number
  missedDays: number
}

// 任务项
export interface TaskItem {
  id: string
  name: string
  desc: string
  icon: string
  points: number
  completed: boolean
}

// 签到记录
export interface SignRecord {
  id: string
  accountId: string
  accountName: string
  date: string
  time: string
  points: number
  status: 'success' | 'failed'
  msg: string
}

// 动态
export interface Moment {
  id: string
  accountId: string
  accountName: string
  content: string
  images: string[]
  likeCount: number
  commentCount: number
  createTime: string
}

// 日志
export interface LogItem {
  id: string
  time: string
  account: string
  action: string
  status: 'success' | 'failed' | 'running'
  detail: string
}

// 全局设置
export interface Settings {
  autoSign: boolean
  signTime: string
  autoLike: boolean
  autoComment: boolean
  msgNotify: boolean
}
