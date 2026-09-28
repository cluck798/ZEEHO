export default function mockAuthCode(data?: { phone?: string }): any {
  console.log('[Mock] sendAuthCode:', data?.phone ? `${data.phone.slice(0, 3)}****` : '')
  return { code: '10000', message: '验证码已发送（演示）' }
}