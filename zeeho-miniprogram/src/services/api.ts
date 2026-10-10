import { callFunction } from '@/services/cloud'
import { LogItem } from '@/types'

export interface SignAllResult {
  success: number
  failed: number
  results: { account: string; status: 'success' | 'failed'; msg: string }[]
}

export interface PostMomentResult {
  momentId: string
  msg: string
  // 云端逐账号明细（可选，用于结果列表展示）
  results?: { account: string; status: 'success' | 'failed'; msg: string }[]
}

export interface LoginResult {
  token?: string
  id?: string
  nickName?: string
  phone?: string
}

// 一键执行全部账号签到
export function signAll(): Promise<SignAllResult> {
  console.log('[API] signAll 调用')
  return callFunction<SignAllResult>('signin', {}, 'signAll')
}

// 单个账号签到（账号页「签到」按钮）
export function signOne(accountId: string): Promise<SignAllResult> {
  console.log('[API] signOne 调用', accountId)
  return callFunction<SignAllResult>('signin', { action: 'signinOne', accountId }, 'signOne')
}

// 补签漏签天数
export function supplementSign(): Promise<SignAllResult> {
  console.log('[API] supplementSign 调用')
  return callFunction<SignAllResult>('signin', { action: 'supplement' }, 'supplementSign')
}

// 发送登录验证码
export function sendAuthCode(phone: string): Promise<any> {
  return callFunction<any>('signin', { action: 'authCode', account: { phone } }, 'authCode')
}

// 手机号 + 验证码登录，返回 token
export function login(phone: string, authCode: string): Promise<LoginResult> {
  return callFunction<LoginResult>('signin', { action: 'login', account: { phone, authCode } }, 'login')
}

// 发布动态
export function postMoment(content: string, accountIds: string[]): Promise<PostMomentResult> {
  console.log('[API] postMoment 调用, 账号数:', accountIds.length)
  return callFunction<PostMomentResult>('postMoment', { content, accountIds })
}

// 签到日志（云端 logs 集合，最近 50 条）
export function fetchLogs(): Promise<LogItem[]> {
  return callFunction<LogItem[]>('signin', { action: 'logs' }, 'logs')
}

// 清空签到日志
export function clearLogs(): Promise<null> {
  return callFunction<null>('signin', { action: 'clearLogs' }, 'clearLogs')
}
