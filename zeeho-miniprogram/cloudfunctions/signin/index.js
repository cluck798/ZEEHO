// 自动签到云函数（微信小程序云开发）
// 账号在小程序前端添加，存云数据库 accounts 集合，本函数读取并执行签到
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 极核官方 App/H5 签名密钥
const KEYS = {
  app: { appId: 'S7qPWPU1', appSecret: 'c5e0da7f4da28df805694ec3dd1fc6792e9df99d' },
  h5: { appId: 'Sw5F9uJi', appSecret: '46870a8f678a09109468f5b0168818b91c292845' },
}
const H5_BASE = 'https://h5.zeehoev.com'
const TAPI_BASE = 'https://tapi.zeehoev.com'
const OFFICIAL_UA = 'MOBILE|iOS|16.1.1|ZEEHO_APP|3.0.5|iPhone|iPhone 14 Pro|1179*2556|DC0C4906-A4A8-4866-9432-B31E1E252D53|WWAN|iOS'

function sha1(s) { return crypto.createHash('sha1').update(String(s), 'utf8').digest('hex') }
function md5(s) { return crypto.createHash('md5').update(String(s), 'utf8').digest('hex') }
function sign(str) { return md5(sha1(str)) }

function toQuery(p = {}) {
  return Object.keys(p).filter(k => p[k] !== undefined && p[k] !== null).sort()
    .map(k => `${k}=${p[k]}`).join('&')
}

// H5 网关签名：md5(sha1(query + body + param + secret))
function h5Sign(params = {}, body = '') {
  const ts = Date.now()
  const nonce = crypto.randomUUID()
  const param = `appId=${KEYS.h5.appId}&nonce=${nonce}&timestamp=${ts}`
  const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : ''
  const s = sign(`${toQuery(params)}${bodyStr}${param}${KEYS.h5.appSecret}`)
  return {
    'cfmoto-x-param': param,
    'cfmoto-x-sign': s,
    'cfmoto-x-sign-type': '0',
    'timestamp': String(ts),
    'nonce': nonce,
    'signature': s,
  }
}

// App 网关签名（手机号登录/发码用）
function appSign(url, params = {}) {
  const ts = Date.now()
  const nonce = crypto.randomBytes(8).toString('hex') + ts
  const param = `appId=${KEYS.app.appId}&nonce=${nonce}&timestamp=${ts}`
  const query = toQuery(params)
  const u = new URL(url)
  const preSign = u.origin + u.pathname + (query ? '?' + query : '')
  const s = sign(`${preSign}${param}${KEYS.app.appSecret}`)
  return {
    'appId': KEYS.app.appId,
    'nonce': nonce,
    'timestamp': String(ts),
    'signature': s,
    'Cfmoto-X-Param': param,
    'Cfmoto-X-Sign': s,
    'Cfmoto-X-Sign-Type': '0',
  }
}

function request(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: { ...headers, ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}) },
    }, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { resolve({ raw: data, error: /invalid/i.test(data) ? 'token已失效' : '非 JSON 响应' }) }
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}
const httpGet = (url, headers) => request(url, { headers })
const httpPost = (url, headers, body) => request(url, { method: 'POST', headers, body })

function cleanToken(t) { return String(t || '').trim().replace(/^[bB]earer\s+/i, '').replace(/[\s"'`]+/g, '') }
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function signinForAccount(acc) {
  const r = { account: acc.nickname || '未知', status: 'failed', msg: '' }
  const token = cleanToken(acc.token)
  if (!token) { r.msg = '缺少 token'; return r }
  const baseHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json;charset=UTF-8',
    'interfaceversion': '2',
    'user_id': acc.userId || '',
  }
  const today = todayStr()
  const month = today.slice(0, 7)

  const info = await httpGet(`${H5_BASE}/cfmotoservermine/signin/info?month=${month}`, { ...baseHeaders, ...h5Sign({ month }, '') })
  const todayEntry = (info?.data?.nowSignDetailVos || []).find(x => x.createDate === today)
  const signed = todayEntry && [0, 3, 5].includes(todayEntry.signStatue)

  if (signed) { r.status = 'success'; r.msg = '今日已签到'; return r }

  let signRes = null
  for (let at = 1; at <= 3; at++) {
    signRes = await httpPost(`${H5_BASE}/cfmotoservermine/signin`, { ...baseHeaders, ...h5Sign({}, {}) }, {})
    if (signRes?.code === '10000') break
    const msg = signRes?.message || signRes?.error || '未知'
    if (/请稍|稍后|稍候|频繁|繁忙|重试/.test(msg) && at < 3) {
      await new Promise(res => setTimeout(res, (at + 1) * 2000))
      continue
    }
    r.msg = msg
    return r
  }
  r.status = signRes?.code === '10000' ? 'success' : 'failed'
  r.msg = r.status === 'success' ? '签到成功' : (signRes?.message || '签到失败')
  if (signRes?.data?.score) r.msg += `，积分 +${signRes.data.score}`
  return r
}

async function supplementForAccount(acc) {
  const r = { account: acc.nickname || '未知', status: 'failed', msg: '' }
  const token = cleanToken(acc.token)
  if (!token) { r.msg = '缺少 token'; return r }
  const baseHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json;charset=UTF-8',
    'interfaceversion': '2',
    'user_id': acc.userId || '',
  }
  const today = todayStr()
  const res = await httpGet(`${H5_BASE}/cfmotoservermine/signin/supplementPrize?supplementDate=${today}`, { ...baseHeaders, ...h5Sign({ supplementDate: today }, '') })
  r.status = res?.code === '10000' ? 'success' : 'failed'
  r.msg = r.status === 'success' ? '补签成功' : (res?.message || res?.error || '补签失败（可能补签卡不足）')
  return r
}

async function sendAuthCode(phone) {
  const url = `${TAPI_BASE}/v1.0/mine/cfmotoservermine/authCode/${encodeURIComponent(phone)}`
  return httpGet(url, { ...appSign(url, {}) })
}

async function loginByPhone(phone, authCode) {
  const url = `${TAPI_BASE}/v1.0/mine/cfmotoservermine/user/loginByPhone`
  const payload = { phone, authCode }
  const sig = appSign(url, {})
  return httpPost(url, {
    'Content-Type': 'application/json;charset=UTF-8',
    'interfaceversion': '2',
    'user-agent': OFFICIAL_UA,
    ...sig,
  }, payload)
}

// ============ 入口（小程序端通过 wx.cloud.callFunction 调用） ============
exports.main = async (event = {}) => {
  const { action, account } = event
  const db = cloud.database()

  if (action === 'login') {
    const { phone, authCode } = account || {}
    const r = await loginByPhone(phone, authCode)
    return { code: r?.data?.token ? 0 : -1, data: r?.data }
  }
  if (action === 'authCode') {
    const r = await sendAuthCode(account?.phone)
    return { code: r?.code === '10000' ? 0 : -1, data: r }
  }
  if (action === 'supplement') {
    const { data: accounts } = await db.collection('accounts').where({ enabled: true }).get()
    const results = []
    for (const a of accounts) results.push(await supplementForAccount(a))
    const success = results.filter(r => r.status === 'success').length
    return { code: 0, data: { success, failed: results.length - success, results } }
  }

  // 默认：全量签到（定时触发器调用）
  const { data: accounts } = await db.collection('accounts').where({ enabled: true }).get()
  const results = []
  for (const a of accounts) results.push(await signinForAccount(a))
  const success = results.filter(r => r.status === 'success').length
  return { code: 0, data: { success, failed: results.length - success, results } }
}