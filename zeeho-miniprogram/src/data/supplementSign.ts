import { SignAllResult } from '@/services/api'

export default function mockSupplementSign(): SignAllResult {
  return {
    success: 1,
    failed: 1,
    results: [
      { account: '极友_c7d8e9f0a1', status: 'success', msg: '补签成功，连签恢复 +1' },
      { account: '极友_d2e3f4a5b6', status: 'failed', msg: '补签卡不足，请先获取' },
    ],
  }
}