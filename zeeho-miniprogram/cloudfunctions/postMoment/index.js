// 发布动态云函数（微信小程序云开发）
// 与面板脚本 v2.15.6 的社区任务 1:1 复刻：发帖 → 点赞 → 评论 → 分享（+领分享积分）→ 删除（只删本次新发的帖）
// 写操作走「新协议」：appid 头 + 含 body 签名（md5(sha1(query+body+param+secret))）+ 官方客户端标识头；
// 分享/领分享积分仍走旧通道（实证不受收紧影响）。
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 极核官方签名密钥（2026-10 服务端轮换后的现行值）
const KEYS = {
  app: { appId: 'S7qPWPU1', appSecret: 'c5e0da7f4da28df805694ec3dd1fc6792e9df99d' },
  h5: { appId: 'AiTXmBrm', appSecret: '70c2c7458ab88ca9504ad0521f170075bc91f2f7' },
}
const TAPI = 'https://tapi.zeehoev.com'
const H5_BASE = 'https://h5.zeehoev.com'
const P = {
  post: `${TAPI}/v1.0/social/cfmotoserversocial/commonArticle`,
  like: `${TAPI}/v1.0/social/cfmotoserversocial/socialCommu/likeFavoriteInfo`,
  comment: `${TAPI}/v1.0/social/cfmotoserversocial/commentInfo`,
  mineArticles: (uid) => `${TAPI}/v1.0/social/cfmotoserversocial/community/mineArticleInfo?userId=${encodeURIComponent(uid)}&page=1&pageSize=10`,
  share: (id) => `${TAPI}/v1.0/social/cfmotoserversocial/article/share/${encodeURIComponent(id)}`,
  deleteArticle: (q) => `${TAPI}/v1.0/social/cfmotoserversocial/commonArticle/deleteArticle?${q}`,
  adjustByShare: `${TAPI}/v1.0/mine/cfmotoservermine/integral/adjustByShare`,
  baseInfo: `${H5_BASE}/cfmotoservermine/baseInfo?server_name=SMART`,
  totalIntegral: `${TAPI}/v1.0/mine/cfmotoservermine/integral/totalIntegral`,
}

function sha1(s) { return crypto.createHash('sha1').update(String(s), 'utf8').digest('hex') }
function md5(s) { return crypto.createHash('md5').update(String(s), 'utf8').digest('hex') }
function sign(str) { return md5(sha1(str)) }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function toQuery(p = {}) {
  return Object.keys(p).filter(k => p[k] !== undefined && p[k] !== null).sort()
    .map(k => `${k}=${p[k]}`).join('&')
}
function cleanToken(t) { return String(t || '').trim().replace(/^[bB]earer\s+/i, '').replace(/[\s"'`]+/g, '') }
function toDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function nowHHmm() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function errMsg(res) { return String((res && (res.message || res.msg || res.error)) || '未知错误') }
function isAuthErr(code, msg) {
  const t = `${code || ''} ${msg || ''}`
  if (/30121|30125|permit error/i.test(t)) return false // 密钥/风控问题，不代表 token 失效
  return /token|失效|登录|invalid|unauthorized|401/i.test(t)
}

// ============ 签名 ============

// 新协议签名（社交写操作）：md5(sha1(query + body + param + secret))
function socialSign(queryStr, bodyStr) {
  const ts = Date.now()
  const nonce = ts + crypto.randomBytes(8).toString('hex')
  const param = `appId=${KEYS.app.appId}&nonce=${nonce}&timestamp=${ts}`
  const s = sign(`${queryStr || ''}${bodyStr || ''}${param}${KEYS.app.appSecret}`)
  return {
    'cfmoto-x-param': param,
    'cfmoto-x-sign': s,
    'cfmoto-x-sign-type': '0',
    'timestamp': String(ts),
    'nonce': nonce,
    'signature': s,
  }
}

// App 通道签名（旧通道：query + body + param + secret；分享/回查/领分用）
function appTapiSign(params = {}, body = '') {
  const ts = Date.now()
  const nonce = crypto.randomBytes(8).toString('hex') + ts
  const param = `appId=${KEYS.app.appId}&nonce=${nonce}&timestamp=${ts}`
  const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : ''
  const s = sign(`${toQuery(params)}${bodyStr}${param}${KEYS.app.appSecret}`)
  return {
    'cfmoto-x-param': param,
    'cfmoto-x-sign': s,
    'cfmoto-x-sign-type': '0',
    'timestamp': String(ts),
    'nonce': nonce,
    'signature': s,
  }
}

// H5 通道签名（baseInfo 补齐 userId 用）
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

// ============ 请求 ============

function request(url, { method = 'GET', headers = {}, body, timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      timeout,
      headers: { ...headers, ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}) },
    }, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { resolve({ raw: data, error: /invalid/i.test(data) ? 'token已失效' : '非 JSON 响应' }) }
      })
    })
    req.on('timeout', () => { req.destroy(new Error('请求超时')) })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}
const httpGet = (url, headers) => request(url, { headers })
const httpPost = (url, headers, body) => request(url, { method: 'POST', headers, body })
const httpPut = (url, headers) => request(url, { method: 'PUT', headers })
const httpDelete = (url, headers) => request(url, { method: 'DELETE', headers })

// 旧通道基础头（分享/回查/领分）
function baseHeaders(acc) {
  const h = {
    'Authorization': `Bearer ${cleanToken(acc.token)}`,
    'Content-Type': 'application/json;charset=UTF-8',
    'interfaceversion': '2',
  }
  if (acc.userId) h['user_id'] = String(acc.userId)
  return h
}

// 每次请求随机设备指纹（与面板脚本一致：固定指纹被风控标记后会持续 31001）
const DEVICE_MODELS = [
  ['iPhone 13', '1170*2532'], ['iPhone 13 Pro', '1170*2532'], ['iPhone 14', '1170*2532'],
  ['iPhone 14 Pro', '1179*2556'], ['iPhone 15', '1179*2556'], ['iPhone 15 Pro', '1179*2556'],
]
const IOS_VERSIONS = ['16.1.1', '16.6.1', '17.2.1', '17.4.1', '17.5.1', '18.1.1']
function randomDeviceUA() {
  const m = DEVICE_MODELS[Math.floor(Math.random() * DEVICE_MODELS.length)]
  const v = IOS_VERSIONS[Math.floor(Math.random() * IOS_VERSIONS.length)]
  const uuid = crypto.randomUUID().toUpperCase()
  const net = Math.random() < 0.7 ? 'WWAN' : 'WIFI'
  return `MOBILE|iOS|${v}|ZEEHO_APP|3.0.5|iPhone|${m[0]}|${m[1]}|${uuid}|${net}|iOS`
}

// 新协议头（社交写操作：appid 头 + 官方客户端标识 + cookie user_id + 含 body 签名）
function socialHeaders(acc, queryStr, bodyStr) {
  const ua = randomDeviceUA()
  return {
    'content-type': 'application/json',
    'appid': KEYS.app.appId,
    'authorization': `Bearer ${cleanToken(acc.token)}`,
    'accept': '*/*',
    'accept-language': 'zh-CN',
    'user-agent': ua,
    'interfaceversion': '2',
    'x-app-info': ua,
    'cookie': `user_id=${acc.userId}`,
    ...socialSign(queryStr, bodyStr),
  }
}

// ============ 业务辅助 ============

// 从发帖响应里递归提取动态 ID（官方字段名各版本不一）
function getPostIdFromData(data) {
  if (!data) return null
  if (typeof data === 'string' || typeof data === 'number') return String(data)
  if (Array.isArray(data)) return getPostIdFromData(data[0])
  const direct = data.uuid || data.tuuid || data.postId || data.postid || data.articleId || data.articleID || data.id || data.dataId || data.tid
  if (direct) return String(direct)
  for (const key of ['records', 'list', 'rows', 'data', 'result']) {
    const pid = getPostIdFromData(data[key])
    if (pid) return pid
  }
  return null
}

// 缺 userId 时用 H5 baseInfo 补齐（新协议 cookie 需要 user_id）
async function fetchBaseInfo(acc) {
  try {
    const res = await httpGet(P.baseInfo, { ...baseHeaders(acc), ...h5Sign({ server_name: 'SMART' }, '') })
    if (res && res.code === '10000' && res.data) {
      return { userId: String(res.data.id || ''), nickName: String(res.data.nickName || '') }
    }
  } catch (e) { /* 忽略 */ }
  return null
}

async function fetchTotalPoints(acc) {
  try {
    const res = await httpGet(P.totalIntegral, { ...baseHeaders(acc), ...appTapiSign() })
    if (res && res.code === '10000' && res.data) {
      const n = Number(res.data.integralTotal !== undefined ? res.data.integralTotal : res.data)
      return Number.isFinite(n) ? n : null
    }
  } catch (e) { /* 忽略 */ }
  return null
}

// 单账号：发帖 → 点赞 → 评论 → 分享(+领分) → 删除（只删本次新发的帖）
async function publishForAccount(acc, content) {
  const r = { account: acc.nickname || acc.nickName || '未知', status: 'failed', msg: '', steps: [], postId: null, patch: {} }
  if (!cleanToken(acc.token)) { r.msg = '缺少 token'; return r }
  const a = { ...acc, token: cleanToken(acc.token) }

  if (!a.userId) {
    const bi = await fetchBaseInfo(a)
    if (bi && bi.userId) {
      a.userId = bi.userId
      r.patch.userId = bi.userId
      if (!a.nickname && bi.nickName) { r.patch.nickname = bi.nickName; r.account = bi.nickName }
    }
  }
  if (!a.userId) { r.msg = '无法获取用户 ID（Token 可能已失效）'; return r }

  let postedNow = false
  let postId = null

  // 1) 发帖（body 字段顺序须与官方一致：postSubInfo → topicid → postcontent）
  try {
    const postBody = JSON.stringify({ postSubInfo: { topicList: [] }, topicid: '', postcontent: content })
    const postRes = await httpPost(P.post, socialHeaders(a, '', postBody), postBody)
    if (postRes && postRes.code === '10000') {
      postId = getPostIdFromData(postRes.data)
      postedNow = true
      r.steps.push('发帖✓')
    } else {
      const msg = errMsg(postRes)
      if (isAuthErr(postRes && postRes.code, msg)) { r.msg = 'Token 已失效，请重新登录或更新 Token'; r.patch.status = 'expired'; return r }
      r.steps.push(`发帖✗(${msg})`)
    }
  } catch (e) { r.steps.push(`发帖异常(${e.message || e})`) }

  // 2) 发帖失败时回查本人最新动态作为兜底（但不删除，避免误删旧帖）
  if (!postId) {
    try {
      const listRes = await httpGet(P.mineArticles(a.userId), { ...baseHeaders(a), ...appTapiSign() })
      const rawList = Array.isArray(listRes && listRes.data) ? listRes.data : ((listRes && listRes.data && (listRes.data.records || listRes.data.list)) || [])
      const list = Array.isArray(rawList) ? rawList : []
      const mine = list.find(it => String(it.userId || it.createBy || it.uid || '') === String(a.userId))
      postId = getPostIdFromData(mine || list[0] || (listRes && listRes.data))
    } catch (e) { /* 忽略 */ }
  }
  if (!postId) { r.msg = r.steps.join(' ') || '发帖失败'; return r }

  // 3) 点赞
  try {
    const likeBody = JSON.stringify({ postId: String(postId), kindFlag: '0' })
    const likeRes = await httpPost(P.like, socialHeaders(a, '', likeBody), likeBody)
    r.steps.push(likeRes && likeRes.code === '10000' ? '点赞✓' : `点赞✗(${errMsg(likeRes)})`)
  } catch (e) { r.steps.push(`点赞异常(${e.message || e})`) }

  // 4) 评论
  try {
    const cmtBody = JSON.stringify({ postid: String(postId), userId: String(a.userId), comments: '今日已签到', sendTos: '[\n\n]' })
    const cmtRes = await httpPost(P.comment, socialHeaders(a, '', cmtBody), cmtBody)
    r.steps.push(cmtRes && cmtRes.code === '10000' ? '评论✓' : `评论✗(${errMsg(cmtRes)})`)
  } catch (e) { r.steps.push(`评论异常(${e.message || e})`) }

  // 5) 分享（旧通道 PUT）+ 领分享积分
  try {
    const shareRes = await httpPut(P.share(postId), { ...baseHeaders(a), ...appTapiSign() })
    r.steps.push(shareRes && shareRes.code === '10000' ? '分享✓' : `分享✗(${errMsg(shareRes)})`)
    await httpGet(P.adjustByShare, { ...baseHeaders(a), ...appTapiSign() })
  } catch (e) { r.steps.push(`分享异常(${e.message || e})`) }

  // 6) 删除（只删本次新发的帖）
  if (postedNow) {
    try {
      const delQuery = `articleId=${postId}&postType=1`
      const delRes = await httpDelete(P.deleteArticle(delQuery), socialHeaders(a, delQuery, ''))
      r.steps.push(delRes && delRes.code === '10000' ? '已删除' : `删除✗(${errMsg(delRes)})`)
    } catch (e) { r.steps.push(`删除异常(${e.message || e})`) }
  }

  const points = await fetchTotalPoints(a)
  if (points !== null) r.steps.push(`总积分 ${points}`)
  r.postId = String(postId)
  r.status = postedNow || r.steps.some(s => s.includes('✓')) ? 'success' : 'failed'
  r.msg = r.steps.join(' · ')
  return r
}

// ============ 日志 ============
async function writeLog(db, entry) {
  const data = { ...entry, time: `${toDateStr()} ${nowHHmm()}`, createTime: new Date() }
  try {
    await db.collection('logs').add({ data })
  } catch (e) {
    try { await db.createCollection('logs') } catch (e2) { /* 已存在或权限不足 */ }
    try { await db.collection('logs').add({ data }) } catch (e2) { /* 静默 */ }
  }
}
async function applyPatch(db, id, r) {
  if (!id || !r.patch || !Object.keys(r.patch).length) return
  try { await db.collection('accounts').doc(id).update({ data: r.patch }) } catch (e) { /* 静默 */ }
}

// ============ 入口 ============
// event: { content?: string, accountIds?: string[] }
// 返回：{ code: 0, data: { momentId, msg, results } }（code!=0 时前端抛 message）
exports.main = async (event = {}) => {
  const db = cloud.database()
  const content = String(event.content || '').trim() || 'lucky'
  const accountIds = Array.isArray(event.accountIds) ? event.accountIds.map(String).filter(Boolean) : []

  let accounts = []
  try {
    const { data } = await db.collection('accounts').where({ enabled: true }).get()
    accounts = data || []
  } catch (e) {
    return { code: -1, message: '读取账号失败：' + (e.message || e) }
  }
  if (accountIds.length) accounts = accounts.filter(a => accountIds.includes(String(a._id)))
  if (!accounts.length) return { code: -1, message: '没有可用的账号（请先在「账号」页添加并启用）' }

  const results = []
  for (const a of accounts) {
    const r = await publishForAccount(a, content)
    await applyPatch(db, a._id, r)
    await writeLog(db, { account: r.account, action: '发布动态', status: r.status, detail: r.msg })
    results.push({ account: r.account, status: r.status, msg: r.msg, postId: r.postId })
  }

  const success = results.filter(x => x.status === 'success').length
  if (success === 0) return { code: -1, message: results[0] ? results[0].msg : '发布失败' }

  const momentId = (results.find(x => x.postId) || {}).postId || ''
  const msg = results.map(x => `${x.account}：${x.msg}`).join('\n')
  return { code: 0, data: { momentId, msg, results } }
}