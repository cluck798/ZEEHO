import { Moment } from '@/types'

export const mockMoments: Moment[] = [
  {
    id: '1',
    accountId: '1',
    accountName: '极友_50a34ce6be',
    content: '今天天气不错，适合骑行。',
    images: ['https://picsum.photos/id/1015/400/400'],
    likeCount: 12,
    commentCount: 3,
    createTime: '2小时前',
  },
  {
    id: '2',
    accountId: '2',
    accountName: '极友_b396846370',
    content: 'AE8 的加速真的太爽了！',
    images: ['https://picsum.photos/id/1016/400/400', 'https://picsum.photos/id/1018/400/400'],
    likeCount: 28,
    commentCount: 7,
    createTime: '5小时前',
  },
  {
    id: '3',
    accountId: '3',
    accountName: '极友_c7d8e9f0a1',
    content: '周末跑山，满电出发。',
    images: [],
    likeCount: 5,
    commentCount: 1,
    createTime: '昨天',
  },
]
