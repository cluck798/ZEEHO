import { SignAllResult } from '@/services/api'

// H5 演示模式：单账号签到回退
export default function mockSignOne(): SignAllResult {
  return {
    success: 1,
    failed: 0,
    results: [{ account: '极友_demo', status: 'success', msg: '签到成功 +5（演示）' }],
  }
}