import { PostMomentResult } from '@/services/api'

export default function mockPostMoment(data?: { content: string; accountIds: string[] }): PostMomentResult {
  console.log('[Mock] postMoment:', data?.content?.slice(0, 20))
  return {
    momentId: `mock_${Date.now()}`,
    msg: '发布成功',
  }
}
