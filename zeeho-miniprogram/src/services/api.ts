import { callFunction } from '@/services/cloud'

export interface SignAllResult {
  success: number
  failed: number
  results: { account: string; status: 'success' | 'failed'; msg: string }[]
}

export interface PostMomentResult {
  momentId: string
  msg: string
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
