import { SignAllResult } from '@/services/api'

export default function mockSignAll(): SignAllResult {
  return {
    success: 3,
    failed: 1,
    results: [
      { account: '极友_50a34ce6be', status: 'success', msg: '签到成功，积分 +10' },
      { account: '极友_b396846370', status: 'success', msg: '签到成功，积分 +10' },
      { account: '极友_c7d8e9f0a1', status: 'success', msg: '今日已签到' },
      { account: '极友_d2e3f4a5b6', status: 'failed', msg: 'Token 已失效，请重新登录' },
    ],
  }
}
