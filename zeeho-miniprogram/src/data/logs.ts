import { LogItem } from '@/types'

export const mockLogs: LogItem[] = [
  { id: '1', time: '08:00:12', account: '极友_50a34ce6be', action: '每日签到', status: 'success', detail: '签到成功，积分 +10' },
  { id: '2', time: '08:00:15', account: '极友_b396846370', action: '每日签到', status: 'success', detail: '签到成功，积分 +10' },
  { id: '3', time: '08:00:18', account: '极友_c7d8e9f0a1', action: '每日签到', status: 'success', detail: '签到成功，积分 +10' },
  { id: '4', time: '08:00:21', account: '极友_d2e3f4a5b6', action: '每日签到', status: 'failed', detail: 'Token 已失效，请重新登录' },
  { id: '5', time: '08:00:25', account: '极友_50a34ce6be', action: '分享动态', status: 'success', detail: '分享成功，积分 +5' },
  { id: '6', time: '08:00:28', account: '极友_b396846370', action: '分享动态', status: 'success', detail: '分享成功，积分 +5' },
]

// H5 演示模式下 callFunction 的回退数据源
export default function mockLogsFn(): LogItem[] {
  return mockLogs
}
