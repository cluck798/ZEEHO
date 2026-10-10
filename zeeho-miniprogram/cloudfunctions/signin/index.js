// 自动签到云函数（微信小程序云开发）
// 账号在小程序前端添加，存云数据库 accounts 集合，本函数读取并执行签到
// v1.1（2026-10-11）：同步 v2.15.6 服务端接口迁移（H5 新 appId=AiTXmBrm + 签到/盲盒迁到 /H5/ 前缀，旧密钥/旧路径一律 430）；
//                    修复手机号登录（okhttp UA + Basic 凭据 + tokenInfo 解析）；签到后回写账号状态；补签改为真实「用补签卡补漏签日」；新增日志集合
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 极核官方签名密钥（2026-10 服务端轮换：H5 通道新 appId，旧 Sw5F9uJi 已失效）
const KEYS = {
  app: { appId: 'S7qPWPU1', appSecret: 'c5e0da7f4da28df805694ec3dd1fc6792e9df99d' },
  h5: { appId: 'AiTXmBrm', appSecret: '70c2c7458ab88ca9504ad0521f170075bc91f2f7' },
}
const H5_BASE = 'https://h5.zeehoev.com'
const TAPI = 'https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine'
const OKHTTP_UA = 'okhttp/4.9.2'
const BASIC_AUTH = 'bWNrOjEyMzQ1Ng==' // mck:123456（逆向自官方 App，loginByPhone 必须携带）
// v2.15.6：签到/盲盒接口迁到 /H5/ 前缀；补签卡接口（signInSupplement）未迁移
const P_SIGNIN = '/cfmotoservermine/H5/signin'
const P_SUPPLEMENT = '/cfmotoservermine/signInSupplement'

function sha1(s) { return crypto.createHash('sha1').update(String(s), 'utf8').digest('hex') }
function md5(s) { return crypto.createHash('md5').update(String(s), 'utf8').digest('hex') }
function sign(str) { return md5(sha1(str)) }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function toQuery(p = {}) {
  return Object.keys(p).filter(k => p[k] !== undefined && p[k] !== null).sort()
    .map(k => `${k}=${p[k]}`).join('&')
}

// H5 网关签名：md5(sha1(query + body + param + secret))（与面板脚本 getSign("h5") 一致）
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

// App 网关签名（GET 风格：URL 入签，body 不入签；发码/登录用）
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

// App 通道签名（URL 不入签：query + body + param + secret；tapi 业务接口用，与面板 getSign("app") 一致）
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
  if (/30125|permit error/i.test(t)) return false // 密钥/风控问题，不代表 token 失效
  return /token|失效|登录|invalid|unauthorized|401/i.test(t)
}

function baseHeaders(acc) {
  const h = {
    'Authorization': `Bearer ${cleanToken(acc.token)}`,
    'Content-Type': 'application/json;charset=UTF-8',
    'interfaceversion': '2',
  }
  if (acc.userId) h['user_id'] = String(acc.userId)
  return h
}

async function fetchBaseInfo(acc) {
  try {
    const params = { server_name: 'SMART' }
    const res = await httpGet(`${H5_BASE}/cfmotoservermine/baseInfo?server_name=SMART`, { ...baseHeaders(acc), ...h5Sign(params, '') })
    if (res && res.code === '10000' && res.data) {
      return { userId: String(res.data.id || ''), nickName: String(res.data.nickName || '') }
    }
  } catch (e) { /* 忽略：仅用于补齐信息 */ }
  return null
}

const fetchSignInfo = (acc, month) =>
  httpGet(`${H5_BASE}${P_SIGNIN}/info?month=${month}`, { ...baseHeaders(acc), ...h5Sign({ month }, '') })

// 从日历数据计算 今日状态 / 连签 / 当月漏签（与面板脚本口径一致：3/5=已签，0=盲盒日计已签，4=漏签）
function computeStats(list, today) {
  const todayIdx = list.findIndex(x => x.createDate === today)
  let cont = 0
  for (let i = todayIdx; i >= 0; i--) {
    const st = Number(list[i] && list[i].signStatue)
    if (st === 3 || st === 5 || (i === todayIdx && st === 0)) cont++
    else break
  }
  const todayEntry = list.find(x => x.createDate === today) || null
  return {
    cont,
    todayEntry,
    signed: !!todayEntry && [0, 3, 5].includes(Number(todayEntry.signStatue)),
    missed: list.filter(x => Number(x.signStatue) === 4 && x.createDate <= today).length,
  }
}

// 总积分（展示用；失败不影响签到结果）
async function fetchTotalPoints(acc) {
  try {
    const url = `${TAPI}/integral/totalIntegral`
    const res = await httpGet(url, { ...baseHeaders(acc), ...appTapiSign() })
    if (res && res.code === '10000' && res.data) {
      const n = Number(res.data.integralTotal !== undefined ? res.data.integralTotal : res.data)
      return Number.isFinite(n) ? n : null
    }
  } catch (e) { /* 忽略 */ }
  return null
}

async function signinForAccount(acc) {
  const r = { account: acc.nickname || '未知', status: 'failed', msg: '', patch: {} }
  if (!cleanToken(acc.token)) { r.msg = '缺少 token'; return r }
  const acc2 = { ...acc, token: cleanToken(acc.token) }
  const today = toDateStr()
  const month = today.slice(0, 7)

  // 缺 userId 时用 baseInfo 补齐（签到请求带 user_id 头；顺手补昵称）
  if (!acc2.userId) {
    const bi = await fetchBaseInfo(acc2)
    if (bi && bi.userId) {
      acc2.userId = bi.userId
      r.patch.userId = bi.userId
      if (!acc2.nickname && bi.nickName) { acc2.nickname = bi.nickName; r.patch.nickname = bi.nickName; r.account = bi.nickName }
    }
  }

  // 1) 查询当月日历，判断今日是否已签
  let info = await fetchSignInfo(acc2, month)
  if (!info || info.code !== '10000') {
    const msg = errMsg(info)
    if (isAuthErr(info && info.code, msg)) {
      r.msg = 'Token 已失效，请重新登录或更新 Token'
      r.patch.status = 'expired'
    } else {
      r.msg = `查询失败：${msg}`
    }
    return r
  }
  let list = (info.data && info.data.nowSignDetailVos) || []
  let stat = computeStats(list, today)
  const steps = []

  // 2) 未签则执行签到（多账号易触发限流，退避重试 3 次）
  if (stat.signed) {
    steps.push('今日已签到')
  } else {
    let signRes = null, signMsg = '未知'
    for (let at = 1; at <= 3; at++) {
      signRes = await httpPost(`${H5_BASE}${P_SIGNIN}`, { ...baseHeaders(acc2), ...h5Sign({}, '') }, {})
      if (signRes && signRes.code === '10000') break
      signMsg = errMsg(signRes)
      if (/请稍|稍后|稍候|频繁|繁忙|重试/.test(signMsg) && at < 3) { await sleep((at + 1) * 2000); continue }
      break
    }
    // 无论成败都回查一次日历（可能出现接口报错但实际已签上）
    const info2 = await fetchSignInfo(acc2, month)
    if (info2 && info2.code === '10000') { info = info2; list = (info.data && info.data.nowSignDetailVos) || []; stat = computeStats(list, today) }
    const postOk = !!(signRes && signRes.code === '10000')
    if (stat.signed) {
      steps.push(postOk ? '签到成功' : '今日已签到')
    } else if (postOk) {
      // 签到接口已返回成功，日历回查有延迟/失败时按成功处理，避免误报
      steps.push('签到成功')
    } else {
      const authErr = isAuthErr(signRes && signRes.code, signMsg)
      r.msg = authErr ? 'Token 已失效，请重新登录或更新 Token' : `签到失败：${signMsg}`
      if (authErr) r.patch.status = 'expired'
      return r
    }
  }

  // 3) 签到得分（当日日历条目的 integralScore）
  const score = stat.todayEntry ? Number(stat.todayEntry.integralScore) || 0 : 0
  if (steps[0] === '签到成功' && score > 0) steps[0] = `签到成功 +${score}`

  // 4) 盲盒：签满 30 天可领取（supplementPrize 迁到 /H5/ 前缀）
  const signCount = Number((info.data && info.data.signCount) || 0)
  if (signCount >= 30) {
    try {
      const blind = await httpGet(`${H5_BASE}${P_SIGNIN}/supplementPrize?supplementDate=${today}`, { ...baseHeaders(acc2), ...h5Sign({ supplementDate: today }, '') })
      if (blind && blind.code === '10000' && blind.data) {
        const bs = Number(blind.data.integral || blind.data.integralScore || 0)
        if (bs > 0) steps.push(`盲盒 +${bs}`)
      }
    } catch (e) { /* 忽略盲盒异常 */ }
  }

  // 5) 状态回写（供小程序端展示 今日已签/连签/漏签/总积分）
  const totalPoints = await fetchTotalPoints(acc2)
  r.patch.todaySigned = true
  r.patch.lastSignTime = `${today.slice(5)} ${nowHHmm()}`
  r.patch.continuousDays = stat.cont
  r.patch.missedDays = stat.missed
  r.patch.status = 'normal'
  if (totalPoints !== null) r.patch.totalPoints = totalPoints

  r.status = 'success'
  r.msg = steps.join(' · ')
  return r
}

// 补签：用补签卡补当月漏签日（sourceType=1 积分兑换需人工确认，这里只消费已有卡）
async function supplementForAccount(acc) {
  const r = { account: acc.nickname || '未知', status: 'failed', msg: '', patch: {} }
  if (!cleanToken(acc.token)) { r.msg = '缺少 token'; return r }
  const acc2 = { ...acc, token: cleanToken(acc.token) }
  const today = toDateStr()
  const month = today.slice(0, 7)

  // 补签卡数量（/count 已改 POST，body {}，签名按空 body 计算）
  const cntRes = await httpPost(`${H5_BASE}${P_SUPPLEMENT}/count`, { ...baseHeaders(acc2), ...h5Sign({}, '') }, {})
  if (!cntRes || cntRes.code !== '10000') { r.msg = `查询补签卡失败：${errMsg(cntRes)}`; return r }
  // 接口 data 为纯数字（如 3），兼容对象形态
  const d = cntRes.data
  const cards = Number(typeof d === 'number' ? d : (d && (d.count !== undefined ? d.count : d.total)) || 0) || 0
  if (cards <= 0) { r.msg = '补签卡不足（可在极核 App 用积分兑换补签卡）'; return r }

  const info = await fetchSignInfo(acc2, month)
  if (!info || info.code !== '10000') {
    const msg = errMsg(info)
    r.msg = isAuthErr(info && info.code, msg) ? 'Token 已失效，请重新登录或更新 Token' : `查询漏签失败：${msg}`
    if (isAuthErr(info && info.code, msg)) r.patch.status = 'expired'
    return r
  }
  const list = (info.data && info.data.nowSignDetailVos) || []
  const missedDays = list.filter(x => Number(x.signStatue) === 4 && x.createDate <= today).map(x => x.createDate)
  if (!missedDays.length) { r.status = 'success'; r.msg = '无漏签，无需补签'; return r }

  let used = 0, lastErr = ''
  for (const dstr of missedDays) {
    if (used >= cards) break
    const res = await httpGet(`${H5_BASE}${P_SUPPLEMENT}/consume?dateTime=${dstr}`, { ...baseHeaders(acc2), ...h5Sign({ dateTime: dstr }, '') })
    if (res && res.code === '10000') used++
    else lastErr = errMsg(res)
    await sleep(600) // 官方接口对连发请求敏感，稍微退避
  }
  if (!used) { r.msg = `补签失败：${lastErr || '未知错误'}`; return r }

  // 回写状态（重新拉取日历，漏签/连签数值以官方为准）
  const info2 = await fetchSignInfo(acc2, month)
  if (info2 && info2.code === '10000') {
    const st = computeStats((info2.data && info2.data.nowSignDetailVos) || [], today)
    r.patch.missedDays = st.missed
    r.patch.continuousDays = st.cont
  } else {
    r.patch.missedDays = Math.max(0, computeStats(list, today).missed - used)
  }
  const totalPoints = await fetchTotalPoints(acc2)
  if (totalPoints !== null) r.patch.totalPoints = totalPoints
  r.status = 'success'
  r.msg = `补签成功 ${used} 天`
  return r
}

async function sendAuthCode(phone) {
  const url = `${TAPI}/authCode/${encodeURIComponent(phone)}`
  return httpGet(url, {
    'Content-Type': 'application/json;charset=UTF-8',
    'User-Agent': OKHTTP_UA,
    ...appSign(url),
  })
}

async function loginByPhone(phone, authCode) {
  const url = `${TAPI}/user/loginByPhone`
  const payload = { phone, authCode }
  // 注意：虽然是 POST，签名必须按 GET 风格（URL 入签、body 不入签），否则报「验证码有误或已过期」
  const headers = {
    'Content-Type': 'application/json;charset=UTF-8',
    'User-Agent': OKHTTP_UA,
    'Authorization': 'Basic ' + BASIC_AUTH,
    ...appSign(url),
  }
  const res = await httpPost(url, headers, payload)
  const accessToken = res && res.data && res.data.tokenInfo && String(res.data.tokenInfo.access_token || '')
  if (!res || res.code !== '10000' || !accessToken) {
    return { ok: false, message: errMsg(res) || '验证码有误或已过期' }
  }
  let userId = String((res.data && (res.data.id || res.data.userId)) || '')
  let nickName = String((res.data && (res.data.nickName || res.data.username)) || '')
  if (!userId) { // 登录响应未带用户信息时，用 token 走 H5 baseInfo 补齐
    const bi = await fetchBaseInfo({ token: accessToken })
    if (bi) { userId = bi.userId; nickName = nickName || bi.nickName }
  }
  return { ok: true, data: { token: accessToken, id: userId, nickName, phone } }
}

// 日志写入（logs 集合不存在时自动创建一次；失败静默，不影响签到）
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

// 发布动态任务（与签到一起执行）：调用 postMoment 云函数（发帖→点赞→评论→分享→删除），返回逐账号结果
async function runPostMoment(accountIds) {
  try {
    const res = await cloud.callFunction({ name: 'postMoment', data: { content: 'lucky', accountIds } })
    const r = res && res.result
    if (r && r.code === 0 && r.data) return { ok: true, results: r.data.results || [] }
    return { ok: false, msg: (r && r.message) || '发布动态失败' }
  } catch (e) {
    return { ok: false, msg: '发布动态调用失败：' + ((e && e.message) || e) }
  }
}

// ============ 入口（小程序端通过 wx.cloud.callFunction 调用） ============

// 定时触发器事件（微信定时触发器：{ Type: 'Timer', TriggerName, Time }）
function isTimerEvent(event) { return !!(event && event.Type === 'Timer') }

// 当前北京时间小时（云端时区按北京时间处理，这里显式换算更稳）
function bjHour() { return new Date(Date.now() + 8 * 3600 * 1000).getUTCHours() }

// 读取全局设置（settings/global，小程序「我的」页写入；不存在返回 null）
async function readGlobalSettings(db) {
  try {
    const res = await db.collection('settings').doc('global').get()
    return res && res.data ? res.data : null
  } catch (e) { return null }
}

exports.main = async (event = {}) => {
  const { action } = event
  const db = cloud.database()

  if (action === 'login') {
    const { phone, authCode } = event.account || {}
    if (!/^1\d{10}$/.test(String(phone || ''))) return { code: -1, message: '手机号格式不正确' }
    if (!authCode) return { code: -1, message: '请填写短信验证码' }
    const r = await loginByPhone(String(phone), String(authCode))
    return r.ok ? { code: 0, data: r.data } : { code: -1, message: r.message }
  }

  if (action === 'authCode') {
    const phone = String((event.account && event.account.phone) || '')
    if (!/^1\d{10}$/.test(phone)) return { code: -1, message: '手机号格式不正确' }
    const r = await sendAuthCode(phone)
    return r && r.code === '10000'
      ? { code: 0, message: '验证码已发送，请查收短信' }
      : { code: -1, message: `发送失败：${errMsg(r)}` }
  }

  if (action === 'supplement') {
    const { data: accounts } = await db.collection('accounts').where({ enabled: true }).get()
    const results = []
    for (const a of accounts) {
      const r = await supplementForAccount(a)
      await applyPatch(db, a._id, r)
      await writeLog(db, { account: r.account, action: '补签', status: r.status, detail: r.msg })
      results.push({ account: r.account, status: r.status, msg: r.msg })
    }
    const success = results.filter(r => r.status === 'success').length
    return { code: 0, data: { success, failed: results.length - success, results } }
  }

  if (action === 'signinOne') {
    const accountId = String(event.accountId || '')
    if (!accountId) return { code: -1, message: '缺少账号 ID' }
    let acc = null
    try { acc = (await db.collection('accounts').doc(accountId).get()).data } catch (e) { /* 不存在 */ }
    if (!acc) return { code: -1, message: '账号不存在' }
    const r = await signinForAccount(acc)
    await applyPatch(db, accountId, r)
    await writeLog(db, { account: r.account, action: '签到', status: r.status, detail: r.msg })
    const results = [{ account: r.account, status: r.status, msg: r.msg }]
    // 发布动态任务：与签到一起执行
    const post = await runPostMoment([accountId])
    if (post.ok) {
      for (const pr of post.results) results.push({ account: pr.account, status: pr.status, msg: `动态 ${pr.msg}` })
    } else {
      results.push({ account: '发布动态', status: 'failed', msg: post.msg })
    }
    return { code: 0, data: { success: r.status === 'success' ? 1 : 0, failed: r.status === 'success' ? 0 : 1, results } }
  }

  if (action === 'logs') {
    try {
      const res = await db.collection('logs').orderBy('createTime', 'desc').limit(50).get()
      return { code: 0, data: (res.data || []).map(x => ({ id: x._id, time: x.time, account: x.account, action: x.action, status: x.status, detail: x.detail })) }
    } catch (e) {
      return { code: 0, data: [] } // 集合尚未创建（还没执行过签到）
    }
  }

  if (action === 'clearLogs') {
    try {
      const _ = db.command
      await db.collection('logs').where({ _id: _.exists(true) }).remove()
    } catch (e) { /* 集合不存在时忽略 */ }
    return { code: 0, data: null }
  }

  // 默认：全量签到（「一键签到」与定时触发器共用；签到完成后接着做发布动态任务）
  // 定时触发时遵循「我的」页设置：自动签到开关 + 每日签到时间（小时级）
  if (isTimerEvent(event)) {
    try { await db.createCollection('settings') } catch (e) { /* 已存在 */ }
    const st = await readGlobalSettings(db)
    if (st && st.autoSign === false) {
      return { code: 0, data: { success: 0, failed: 0, results: [], skipped: 'autoSign off' } }
    }
    const targetHour = Number(String((st && st.signTime) || '08:00').split(':')[0])
    if (Number.isFinite(targetHour) && bjHour() !== targetHour) {
      return { code: 0, data: { success: 0, failed: 0, results: [], skipped: 'not the time' } }
    }
  }
  const { data: accounts } = await db.collection('accounts').where({ enabled: true }).get()
  const results = []
  for (const a of accounts) {
    const r = await signinForAccount(a)
    await applyPatch(db, a._id, r)
    await writeLog(db, { account: r.account, action: '签到', status: r.status, detail: r.msg })
    results.push({ account: r.account, status: r.status, msg: r.msg })
  }
  const success = results.filter(r => r.status === 'success').length
  const failed = results.length - success
  // 发布动态任务：与自动签到一起执行（发帖→点赞→评论→分享→删除）
  const post = await runPostMoment(accounts.map(a => a._id))
  if (post.ok) {
    for (const pr of post.results) results.push({ account: pr.account, status: pr.status, msg: `动态 ${pr.msg}` })
  } else {
    results.push({ account: '发布动态', status: 'failed', msg: post.msg })
  }
  return { code: 0, data: { success, failed, results } }
}