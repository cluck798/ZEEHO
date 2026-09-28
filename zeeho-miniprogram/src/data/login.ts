import { LoginResult } from '@/services/api'

export default function mockLogin(data?: { phone?: string; authCode?: string }): LoginResult {
  console.log('[Mock] login:', data?.phone, 'code:', data?.authCode)
  return {
    token: `token_***_demo_${Date.now().toString(36)}`,
    id: 'demo_user',
    nickName: '极友_demo',
    phone: data?.phone,
  }
}