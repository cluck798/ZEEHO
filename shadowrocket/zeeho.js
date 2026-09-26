/*
#!name=极核 每日签到 积分任务
#!desc=极核打开我的插件自动捕获 user_id/Authorization/Cookie/User-Agent/app_secret，无需手动抓包；每日定时自动签到。仅供个人学习使用，请勿用于违规用途。
#!author=lucky
#!version=2.5.1
#!icon=https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/script/ZEEHO.png

[Script]
# 获取 Cookie
http-response ^https:\/\/tapi\.zeehoev\.com\/v1\.0\/mine\/cfmotoservermine\/setting script-path=https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/repo/zeeho.js, requires-body=true, timeout=60, tag=极核Cookie

# 脚本任务
cron "0 7 * * *" script-path=https://cdn.jsdelivr.net/gh/cluck798/ZEEHO@main/repo/zeeho.js, timeout=300, tag=极核

[MITM]
hostname = tapi.zeehoev.com

====================================
⚠️【免责声明】
------------------------------------------
1、此脚本仅用于学习研究，不保证其合法性、准确性、有效性，请根据情况自行判断，本人对此不承担任何保证责任。
2、由于此脚本仅用于学习研究，您必须在下载后 24 小时内将所有内容从您的计算机或手机或任何存储设备中完全删除，若违反规定引起任何事件本人对此均不负责。
3、请勿将此脚本用于任何商业或非法目的，若违反规定请自行对此负责。
4、此脚本涉及应用与本人无关，本人对因此引起的任何隐私泄漏或其他后果不承担任何责任。
5、本人对任何脚本引发的问题概不负责，包括但不限于由脚本错误引起的任何损失和损害。
6、如果任何单位或个人认为此脚本可能涉嫌侵犯其权利，应及时通知并提供身份证明，所有权证明，我们将在收到认证文件确认后删除此脚本。
7、所有直接或间接使用、查看此脚本的人均应该仔细阅读此声明。本人保留随时更改或补充此声明的权利。一旦您使用或复制了此脚本，即视为您已接受此免责声明。
 */


const $ = new Env("极核-ZEEHO");
const ckName = "zeeho_data";
//-------------------- 一般不动变量区域 -------------------------------------
const Notify = 1;//0为关闭通知,1为打开通知,默认为1
const notify = $.isNode() ? require('./sendNotify') : '';
let envSplitor = ["@"]; //多账号分隔符
var userCookie = ($.isNode() ? process.env[ckName] : $.getdata(ckName)) || '';
let userList = [];
let userIdx = 0;
let userCount = 0;

// 调试
$.is_debug = ($.isNode() ? process.env.IS_DEDUG : $.getdata('is_debug')) || 'false';
// 为通知准备的空数组（改为全局汇总）
$.notifyMsg = [];
// 统计成功/失败账号数
$.successCount = 0;
$.failCount = 0;

//---------------------- 自定义变量区域 -----------------------------------
//脚本入口函数main()
async function main() {
  try {
    $.log('\n================== 任务 ==================\n');
    for (let user of userList) {
    try {
      // 检查userId是否为空（面板里必须点「获取ID」按钮）
      if (!user.userId || String(user.userId) === 'undefined' || String(user.userId).trim() === '') {
        $.log(`⚠️ 账号「${user.userName || user.index}」userId为空，请在面板配置页点「获取ID」按钮自动获取`);
        $.notifyMsg.push(`❌账号「${user.userName || user.index}」userId为空，请在面板点「获取ID」`);
        $.failCount++;
        continue;
      }
      console.log(`🔷账号${user.index} >> Start work`)
      console.log(`随机延迟${user.getRandomTime()}ms`);
      // 签到（今日首次签到返回积分；今日已签到返回null）
      const signResult = await user.signin();
      let integralScore = 0;
      if (user.ckStatus) {
        await $.wait(user.getRandomTime());
        // 查看签到记录
        const {
          count = 0,
          prize = 0,
          prizes = 0
        } = (await user.getSignRecord()) || {};
        await $.wait(user.getRandomTime());

        if (prizes >= 30) {
          // 盲盒抽奖
          integralScore = await user.lottery();
          await $.wait(user.getRandomTime());
        }

        // 互动任务：发帖 / 点赞 / 分享 各 1 分，按实际完成结果计分
        let interactGain = 0;

        // 创建动态（每日首次发帖）
        let postId = await user.createArticle();
        if (postId) interactGain += 1;
        await $.wait(user.getRandomTime());
        // 获取本人动态（只会拿到自己的帖子，绝不会取他人帖）
        postId = postId || (await user.getArticles());
        if (postId) {
          await $.wait(user.getRandomTime());
          // 点赞
          if (await user.thumbsUp(postId)) interactGain += 1;
          await $.wait(user.getRandomTime());
          // 评论（评论不加分，但分享前必须有评论）
          await user.comment(postId);
          await $.wait(user.getRandomTime());
          // 分享动态
          if (await user.share(postId)) interactGain += 1;
          await $.wait(user.getRandomTime());
          // 删除动态（仅本人帖，删掉刚发的临时动态）
          await user.deletePost(postId);
          await $.wait(user.getRandomTime());
        } else {
          $.log(`⚠️ 未获取到本人动态ID，跳过点赞/评论/分享/删除（不操作他人帖子，签到照常统计）`);
        }
        // 查询当前积分（总分）
        const score = await user.getSignInfo();

        // ===== 积分统一在最后计算：签到 + 盲盒 + 互动任务 =====
        // 签到积分：首次签到用signin返回值，已签到场景用签到记录里的prize
        const signScore = (typeof signResult === 'number' && signResult > 0) ? signResult : (prize || 0);
        const blindScore = integralScore || 0;
        // 盲盒日志文本：≥10分显示获得积分，低于10分显示距盲盒剩余天数（避免显示"盲盒 +0"）
        const _bDay = count === 0 ? 0 : ((count - 1) % 30) + 1;
        const _bRemain = 30 - _bDay;
        const blindLogText = blindScore >= 10 ? `盲盒 +${blindScore}` : `距盲盒 ${_bRemain}天`;
        const gain = signScore + blindScore + interactGain;
        // 输出今日得分明细（所有任务完成后的准确总分）
        $.log(`✅ 今日获得: 签到${signScore} + 盲盒${blindScore} + 互动${interactGain} = 共${gain}分`);
        // 原积分（总分反推）
        const oldScore = typeof score === "number" ? score - gain : "未知";

        // 汇总到总通知
        $.notifyMsg.push(`「${user.userName}」积分: ${oldScore}+${gain}, 累签: ${count}天`);
        // 写入运行日志（面板读取此条显示今日准确得分）
        const _now = new Date();
        const _today = _now.getFullYear() + '-' + String(_now.getMonth()+1).padStart(2,'0') + '-' + String(_now.getDate()).padStart(2,'0');
        addSigninLog({
          time: _now.toLocaleString("zh-CN", { hour12: false }),
          date: _today,
          userName: user.userName,
          userId: user.userId,
          success: true,
          totalGain: gain,
          signinScore: signScore,
          blindBoxScore: blindScore,
          interactScore: interactGain,
          continueDays: count,
          error: null,
          steps: [`签到 +${signScore}`, blindLogText, `互动 +${interactGain}`, `连签 ${count}天`]
        });
        // 单账号独立 Bark：签到成功才推送（Key 留空则跳过）
        await barkNotify(user.barkKey, `极核签到成功 · ${user.userName}`, `今日获得 ${gain} 分（签到${signScore}/${blindLogText}/互动${interactGain}），连签${count}天`);
        $.successCount++;
      } else {
        // ck 失效
        $.notifyMsg.push(`❌账号「${user.userName || user.index}」执行失败: ck失效或请求异常`);
        const _n2 = new Date();
        const _d2 = _n2.getFullYear() + '-' + String(_n2.getMonth()+1).padStart(2,'0') + '-' + String(_n2.getDate()).padStart(2,'0');
        addSigninLog({
          time: _n2.toLocaleString("zh-CN", { hour12: false }),
          date: _d2,
          userName: user.userName || ('账号' + user.index),
          userId: user.userId,
          success: false,
          totalGain: 0,
          signinScore: 0, blindBoxScore: 0, interactScore: 0,
          continueDays: 0,
          error: "ck失效或请求异常",
          steps: ["执行失败: ck失效或请求异常"]
        });
        $.failCount++;
      }
    } catch (err) {
      $.log(`⚠️ 账号${user.index} 执行异常，已跳过继续处理后续账号: ${(err && err.message) || err}`);
      $.failCount++;
      $.notifyMsg.push(`❌账号「${user.userName || user.index}」执行异常: ${(err && err.message) || err}`);
      try {
        const _n4 = new Date();
        const _d4 = _n4.getFullYear() + "-" + String(_n4.getMonth()+1).padStart(2,"0") + "-" + String(_n4.getDate()).padStart(2,"0");
        addSigninLog({ time: _n4.toLocaleString("zh-CN", { hour12: false }), date: _d4, userName: user.userName || ("账号" + user.index), userId: user.userId, success: false, totalGain: 0, signinScore: 0, blindBoxScore: 0, interactScore: 0, continueDays: 0, error: "执行异常: " + ((err && err.message) || err), steps: ["执行异常，已跳过"] });
      } catch (e2) {}
    }
    }
  } catch (e) {
    $.log(`⛔️ main run error => ${e}`);
    throw new Error(`⛔️ main run error => ${e}`);
  }
}


class UserInfo {
  constructor(user) {
    //默认属性
    this.index = ++userIdx;
    // 清洗token：去掉Bearer前缀，再统一加上Bearer（面板手动添加的是纯UUID，自动捕获的带Bearer）
    const rawToken = user.token || user;
    this.token = "Bearer " + String(rawToken || "").replace(/^[bB]earer\s+/i, "").trim();
    this.userId = String(user.userId || "").trim();
    this.userName = user.userName || `账号${this.index}`;
    this.userAgent = user.userAgent || "ZEEHO/5.0 (iPhone; iOS 17.0; Scale/3.00)";
    // 每账号独立 Bark Key（面板配置页保存，经 zeeho_data 同步过来）
    this.barkKey = cleanBarkKey(user.barkKey);
    this.ckStatus = true;
    //请求封装
    this.baseUrl = ``;
    this.host = "";
    this.headers = {
      "Content-Type": "application/json;charset=UTF-8",
      "Accept-Language": "zh-CN",
      "Authorization": this.token,
      "User-Agent": this.userAgent,
      "user_id": this.userId,
      "interfaceversion": "2"
    }
    this.getRandomTime = () => randomInt(1e3, 3e3);
    this.fetch = async (o) => {
      try {
        if (typeof o === 'string') o = { url: o };
        if (o?.url?.startsWith("/")) o.url = this.host + o.url
        const res = await Request({ ...o, headers: o.headers || this.headers, url: o.url || this.baseUrl })
        debug(res, o?.url?.replace(/\/+$/, '').substring(o?.url?.lastIndexOf('/') + 1));
        if (res?.code == 40001) throw new Error(res?.message || `用户需要去登录`);
        return res;
      } catch (e) {
        this.ckStatus = false;
        $.log(`⛔️ 请求发起失败！${e}`);
      }
    }
  }
  //签到 (2026-08-28 HAR 适配：POST 返回用户资料而非 signInStatus，需二次查 info 确认今日是否已签)
  async signin() {
    try {
      const today = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
      const month = today.slice(0, 7);
      const infoOpts = {
        url: "https://h5.zeehoev.com/cfmotoservermine/signin/info",
        type: "get",
        headers: Object.assign({}, this.headers, getSign('h5', { month })),
        params: { month },
        dataType: "json"
      };
      // 1) 先查今日是否已签
      let infoRes = await this.fetch(infoOpts);
      let todayEntry = null;
      if (infoRes?.code == '10000') {
        todayEntry = (infoRes?.data?.nowSignDetailVos || []).find(x => x.createDate === today);
      }
      if (todayEntry && (todayEntry.signStatue === 3 || todayEntry.signStatue === 5)) {
        $.log(`✅ 签到任务: 今日已签到`);
        return null;
      }
      // 2) 执行签到（无参、空body，与HAR一致）
      const opts = {
        url: "https://h5.zeehoev.com/cfmotoservermine/signin",
        type: "post",
        headers: Object.assign({}, this.headers, getSign('h5', {})),
        dataType: "json"
      }
      // 2.1) 执行签到；多账号连签易触发“请稍后/操作频繁”限流，按退避最多重试3次
      let res = null, lastMsg = '';
      for (let attempt = 1; attempt <= 3; attempt++) {
        res = await this.fetch(opts);
        if (res?.code == '10000' && res?.message == '操作成功') break;
        lastMsg = res?.message || '未知响应';
        if (/请稍|稍后|稍候|频繁|繁忙|重试/.test(lastMsg) && attempt < 3) {
          const waitMs = (attempt + 1) * 2000;  // 依次等待 4s、6s
          $.log(`⏳ 签到被限流（${lastMsg}），${waitMs / 1000}秒后第${attempt + 1}次重试`);
          await $.wait(waitMs);
          continue;
        }
        break;
      }
      if (res?.code == '10000' && res?.message == '操作成功') {
        // 3) 再查一次 info，取今日积分
        let infoRes2 = await this.fetch(infoOpts);
        const te = (infoRes2?.data?.nowSignDetailVos || []).find(x => x.createDate === today);
        const point = te?.integralScore ? Number(te.integralScore) : 0;
        // 签到动作已成功；回查瞬时可能为0(服务端延迟)，此时不显示"+0积分"，统一显示今日已签到，得分以后续签到记录回查(prize)为准
        $.log(point > 0 ? `✅ 签到任务: 签到成功 +${point}积分` : `✅ 签到任务: 今日已签到`);
        return point;
      } else {
        // 重试后仍未返回操作成功：回查今日是否其实已签上（首次POST可能已生效）
        try {
          const chk = await this.fetch(infoOpts);
          const ce = (chk?.data?.nowSignDetailVos || []).find(x => x.createDate === today);
          if (ce && (ce.signStatue === 3 || ce.signStatue === 5)) {
            $.log(`✅ 签到任务: 今日已签到`);
            return null;
          }
        } catch(e) {}
        $.log(`⛔️ 签到任务: ${lastMsg}`);
        return null;
      }
    } catch (e) {
      this.ckStatus = false;
      $.log(`⛔️ 签到失败! ${e}`);
    }
  }
    // 查询签到记录（跨月：当月+上月合并计算实际连签天数，避免每月1号归零）
  async getSignRecord() {
  try {
    const now = new Date();
    const pad2 = n => String(n).padStart(2, '0');
    const today = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
    // 当月和上月
    const curMonth = now.getFullYear() + '-' + (now.getMonth() + 1);
    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastDate.getFullYear() + '-' + (lastDate.getMonth() + 1);

    // 并行请求当月+上月签到记录
    const buildOpts = (month) => ({
      url: "https://h5.zeehoev.com/cfmotoservermine/signin/info",
      type: "get",
      headers: Object.assign({}, this.headers, getSign('h5', { month })),
      params: { month },
      dataType: "json"
    });
    const [curRes, lastRes] = await Promise.all([
      this.fetch(buildOpts(curMonth)),
      this.fetch(buildOpts(lastMonth))
    ]);

    if (curRes?.code == '10000' && curRes?.message == '操作成功') {
      const curList = curRes?.data?.nowSignDetailVos || [];
      const lastList = (lastRes?.code == '10000') ? (lastRes?.data?.nowSignDetailVos || []) : [];
      // 合并上月+当月记录，保证日期顺序连续
      const list = [...lastList, ...curList];

      // 从今天开始往前统计实际连续签到天数（跨月不归零）
      const todayIndex = list.findIndex(item => item.createDate === today);
      let count = 0;
      if (todayIndex >= 0) {
        for (let i = todayIndex; i >= 0; i--) {
          const status = list[i]?.signStatue;
          // 3=已签到 5=补签
          if (status == 3 || status == 5) {
            count++;
          } else {
            break;
          }
        }
      }

      // 今日积分（优先取今日记录的 integralScore）
      const todayEntry = todayIndex >= 0 ? list[todayIndex] : null;
      const prize = todayEntry?.integralScore ? Number(todayEntry.integralScore) : (curRes?.data?.integral || 0);
      // 连签奖励累计次数（仅用于盲盒判断，不在日志显示）
      const prizes = curRes?.data?.signCount || 0;
      $.log(`✅ 连续签到${count}天`);
      return {
        count,
        prize,
        prizes
      };
    }
    return null;
  } catch (e) {
    this.ckStatus = false;
    $.log(`⛔️ 查询签到记录失败! ${e}`);
  }
}
    // 开启盲盒


  async lottery() {
    try {
      const date = new Date();
      const today = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');

      const params = {
        supplementDate: today
      }
      const opts = {
        url: "https://h5.zeehoev.com/cfmotoservermine/signin/supplementPrize",
        type: "get",
        headers: Object.assign({}, this.headers, getSign('h5', params)),
        params,
        dataType: "json"
      }
      let res = await this.fetch(opts);
      if (res?.code == '10000') {

        const integralScore = res?.data?.integral || res?.data?.integralScore || 0;
        const prizesName = res?.data?.prizesName || (integralScore + '积分');
        $.log(`✅ 盲盒抽奖获得: ${prizesName}`);
        return Number(integralScore);
      } else {
        $.log(`⚠️ 盲盒抽奖(今日可能无盲盒): ${res?.message}`);
        return 0;
      }
    } catch (e) {
      this.ckStatus = false;
      $.log(`⛔️ 盲盒抽奖发起失败! ${e}`);
      return 0;
    }
  }
  
  // 创建动态
  async createArticle() {
    try {
      const opts = {
        url: `https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commonArticle`,
        type: "post",
        dataType: "json",
        headers: Object.assign({}, this.headers, getSign('app')),
        body: {
          postcontent: "开心的一天"
        }
      }
      let res = await this.fetch(opts);
      if (res?.code == '10000') {
        const postId = getPostId(res?.data);
        $.log(`\u2705 \u521b\u5efa\u52a8\u6001: \u6210\u529f${postId ? ` ${postId}` : ''}`);
        return postId;
      } else {
        $.log(`\u26d4\ufe0f \u521b\u5efa\u52a8\u6001\u5931\u8d25: ${res?.message}`);
      }
    } catch (e) {
      this.ckStatus = false;
      $.log(`⛔️ 创建动态失败! ${e}`);
    }
  }
  // 获取动态列表
  async getArticles() {
    try {
      const opts = {
        url: `https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/community/mineArticleInfo`,
        type: "get",
        headers: Object.assign({}, this.headers, getSign('app')),
        dataType: "json",
        params: {
          userId: this.userId,
          page: 1,
          pageSize: 10
        }
      }
      let res = await this.fetch(opts);
      if (res?.code == '10000') {
        const rawList = Array.isArray(res?.data) ? res.data : (res?.data?.records || res?.data?.list || res?.data?.rows || []);
        const list = Array.isArray(rawList) ? rawList : [];
        // mineArticleInfo 只返回本人动态；优先按 userId 命中本人，避免列表异常时误取他人帖
        const mine = list.find(it => String(it.userId || it.createBy || it.uid || '') === String(this.userId));
        let postId = getPostId(mine || list?.[0] || res?.data);
        if (!postId) postId = await this.getCommunityArticle();  // 公共流兜底也只会返回本人帖子
        $.log(`\u2705 \u83b7\u53d6\u52a8\u6001: ${postId}`);
        return postId
      } else {
        $.log(`\u26d4\ufe0f \u83b7\u53d6\u52a8\u6001\u5931\u8d25: ${res?.message}`);
      }
    } catch (e) {
      this.ckStatus = false;
      $.log(`⛔️ 获取动态列表失败! ${e}`);
    }
  }
  async getCommunityArticle() {
    try {
      const opts = {
        url: `https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/community/qbTzInfoNewV2`,
        type: "get",
        headers: Object.assign({}, this.headers, getSign('app')),
        dataType: "json",
        params: {
          page: 1,
          pageSize: 20,
          postModule: 2,
          slidingType: 1
        }
      }
      const res = await this.fetch(opts);
      if (res?.code == '10000') {
        const list = Array.isArray(res?.data) ? res.data : [];
        const mine = list.find(item => String(item.userId || item.createBy || item.uid || '') === String(this.userId));
        // 只操作本人动态：公共流里找不到自己的帖子时返回 null，绝不能退回 list[0]（那是他人帖子，会导致“他人创建的帖子不可删除”）
        return mine ? getPostId(mine) : null;
      }
      return null;
    } catch (e) {
      $.log(`\u26d4\ufe0f \u83b7\u53d6\u793e\u533a\u52a8\u6001\u5931\u8d25: ${e}`);
      return null;
    }
  }

  // 点赞动态
  async thumbsUp(postId) {
    try {
      const opts = {
        url: `https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/socialCommu/likeFavoriteInfo`,
        type: "post",
        headers: Object.assign({}, this.headers, getSign('app')),
        dataType: "json",
        body: {
          postId: String(postId),
          kindFlag:"0"
        }
      }
      const res = await this.fetch(opts);
      const ok = res?.code == '10000';
      if (ok) {
        $.log(`\u2705 \u70b9\u8d5e\u52a8\u6001: ${postId}`)
      } else {
        $.log(`\u26d4\ufe0f \u70b9\u8d5e\u52a8\u6001\u5931\u8d25: ${res?.message}`);
      }
      return ok; // 用于统计互动任务积分（已完成/重复则不计分）
    } catch (e) {
      this.ckStatus = false;
      $.log(`⛔️ 点赞动态失败! ${e}`);
      return false;
    }
  }
  // ????
  async share(postId) {
    try {
      const opts = {
        url: `https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/article/share/${postId}`,
        type: "put",
        headers: Object.assign({}, this.headers, getSign('app')),
        dataType: "json"
      }
      let res = await this.fetch(opts);
      const ok = res?.code == '10000';
      if (ok) {
        $.log(`\u2705 \u5206\u4eab\u52a8\u6001: ${postId}`)
      } else {
        $.log(`\u26d4\ufe0f \u5206\u4eab\u52a8\u6001\u5931\u8d25: ${res?.message}`);
      }
      await this.adjustByShare();
      return ok; // 用于统计互动任务积分（已完成/重复则不计分）
    } catch (e) {
      this.ckStatus = false;
      $.log(`\u26d4\ufe0f \u5206\u4eab\u52a8\u6001\u5931\u8d25: ${e}`);
      return false;
    }
  }
  // ????
  async adjustByShare() {
    try {
      const opts = {
        url: `https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/integral/adjustByShare`,
        type: "get",
        headers: Object.assign({}, this.headers, getSign('app')),
        dataType: "json"
      }
      const res = await this.fetch(opts);
      if (res?.code == '10000') {
        $.log(`\u2705 \u5206\u4eab\u79ef\u5206: \u5df2\u89e6\u53d1`)
      } else {
        $.log(`\u26d4\ufe0f \u5206\u4eab\u79ef\u5206\u5931\u8d25: ${res?.message}`);
      }
    } catch (e) {
      this.ckStatus = false;
      $.log(`\u26d4\ufe0f \u5206\u4eab\u79ef\u5206\u5931\u8d25: ${e}`);
    }
  }
  // ????
  async comment(postId) {
    try {
      const opts = {
        url: `https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commentInfo`,
        type: "post",
        headers: Object.assign({}, this.headers, getSign('app')),
        dataType: "json",
        body: {
          postid: String(postId),
          userId: String(this.userId),
          comments: "\u5389\u5bb3",
          sendTos: "[\n\n]"
        }
      }
      const res = await this.fetch(opts);
      if (res?.code == '10000') {
        $.log(`\u2705 \u8bc4\u8bba\u52a8\u6001: ${postId}`)
      } else {
        $.log(`\u26d4\ufe0f \u8bc4\u8bba\u52a8\u6001\u5931\u8d25: ${res?.message}`);
      }
    } catch (e) {
      this.ckStatus = false;
      $.log(`\u26d4\ufe0f \u8bc4\u8bba\u52a8\u6001\u5931\u8d25: ${e}`);
    }
  }
  // 删除动态
  async deletePost(postId) {
    try {
      const opts = {
        url: `https://tapi.zeehoev.com/v1.0/social/cfmotoserversocial/commonArticle/deleteArticle?articleId=${postId}&postType=1`,
        type: "delete",
        headers: Object.assign({}, this.headers, getSign('app')),
        dataType: "json"
      }
      const res = await this.fetch(opts);
      if (res?.code == '10000') {
        $.log(`\u2705 \u5220\u9664\u52a8\u6001: ${postId}`)
      } else {
        $.log(`\u26d4\ufe0f \u5220\u9664\u52a8\u6001\u5931\u8d25: ${res?.message}`)
      }
    } catch (e) {
      this.ckStatus = false;
      $.log(`\u26d4\ufe0f \u5220\u9664\u52a8\u6001\u5931\u8d25: ${e}`);
    }
  }
  
  // 查询用户信息
  async getSignInfo() {
    try {
      const opts = {
        url: `https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/setting/${this.userId}`,
        type: "get",
        headers: Object.assign({}, this.headers, getSign('app')),
        dataType: "json"
      }
      let res = await this.fetch(opts);
      if (res?.code == '10000' && res?.message == '操作成功') {
        const score = res?.data?.score
        return score
      }
      return null
    } catch (e) {
      this.ckStatus = false;
      $.log(`⛔️ 查询用户信息失败! ${e}`);
    }
  }
}
function getPostId(data) {
  if (!data) return null;
  if (typeof data === 'string' || typeof data === 'number') return String(data);
  if (Array.isArray(data)) return getPostId(data[0]);
  const direct = data.uuid || data.tuuid || data.postId || data.postid || data.articleId || data.articleID || data.id || data.dataId || data.tid;
  if (direct) return String(direct);
  for (const key of ['records', 'list', 'rows', 'data', 'result']) {
    const value = data[key];
    const postId = getPostId(value);
    if (postId) return postId;
  }
  return null;
}
async function getCookie() {
  if ($request && $request.method === 'OPTIONS') return;

  const header = ObjectKeys2LowerCase($request.headers);
  const token = header['authorization'];
  const userAgent = header['user-agent'];
  const body = $.toObj($response.body);
  if (!(body?.data)) {
    $.msg($.name, `❌获取Cookie失败!`, "")
    return;
  }

  const { id, nickName } = body?.data;
  const newData = {
    "userId": id,
    "token": token,
    "userName": nickName,
    "userAgent": userAgent
  }

  userCookie = userCookie ? JSON.parse(userCookie) : [];
  const index = userCookie.findIndex(e => e.userId == newData.userId);

  userCookie[index] ? userCookie[index] = newData : userCookie.push(newData);

  $.setjson(userCookie, ckName);
  $.msg($.name, `🎉${newData.userName}更新token成功!`, ``);
}
function getSign(type, params = {}, body = '') {
  const appConfig = {
    // 2026-08-28 HAR 确认：H5 端 appId/appSecret 已轮换（旧 azRnLvxl/76d9... 会被拒绝 → 430/permit error）
    appId: type === "h5" ? "Sw5F9uJi" : "S7qPWPU1",
    appSecret: type === "h5" ? "46870a8f678a09109468f5b0168818b91c292845" : "c5e0da7f4da28df805694ec3dd1fc6792e9df99d"
  }
  const query = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null).sort().map(key => `${key}=${params[key]}`).join('&')
  const timestamp = new Date().getTime()
  const nonce = getUuid()
  const param = `appId=${appConfig.appId}&nonce=${nonce}&timestamp=${timestamp}`
  const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : ''
  const signature = type === "h5" ? `${query}${param}${appConfig.appSecret}` : `${bodyStr}${param}${appConfig.appSecret}`
  const sign = md5(sha1(signature), 32).toString()
  return {
    'cfmoto-x-param': param,
    'cfmoto-x-sign': sign,
    'cfmoto-x-sign-type': '0',
    'timestamp': String(timestamp),
    'nonce': nonce,
    'signature': sign
  }
}
//-------------------------- 辅助函数区域 -----------------------------------
//请求二次封装
async function Request(o) {
  if (typeof o === 'string') o = { url: o };
  try {
    if (!o?.url) throw new Error('[发送请求] 缺少 url 参数');
    let { url: u, type, headers = {}, body: b, params, dataType = 'form', resultType = 'data' } = o;
    const method = type ? type?.toLowerCase() : ('body' in o ? 'post' : 'get');
    const query = params ? $.queryStr(params) : '';
    const urlQuery = u.includes('?') ? u.split('?').slice(1).join('?') : '';
    const signQuery = [urlQuery, query].filter(Boolean).join('&');
    const url = u.concat(query ? (u.includes('?') ? '&' : '?') + query : '');
    const timeout = o.timeout ? ($.isSurge() ? o.timeout / 1e3 : o.timeout) : 15000;

    if (dataType === 'json') headers['Content-Type'] = 'application/json;charset=UTF-8';
    // 正确处理body：无body时为空字符串，POST空body需要Content-Length:0
    const hasBody = b !== undefined && b !== null;
    const body = hasBody ? (dataType == 'form' ? $.queryStr(b) : $.toStr(b)) : '';
    // POST/PUT/DELETE 无body时设置 Content-Length: 0
    if (method !== 'get' && !hasBody) headers['Content-Length'] = '0';
    if (hasBody && body) headers['Content-Length'] = String(body.length);

    // App端签名重算：POST有body用body，GET/DELETE用query
    if (headers['cfmoto-x-param'] && headers['cfmoto-x-param'].includes('appId=S7qPWPU1')) {
      const signPayload = (hasBody && body) ? body : signQuery;
      if (signPayload) {
        const signature = `${signPayload}${headers['cfmoto-x-param']}c5e0da7f4da28df805694ec3dd1fc6792e9df99d`;
        const sign = md5(sha1(signature), 32).toString();
        headers['cfmoto-x-sign'] = sign;
        headers['signature'] = sign;
      }
    }

    // Env类$.http只有get/post入口，post方法会读取request.method转发给$httpClient
    const httpEntry = method === 'get' ? 'get' : 'post';
    const request = { ...o, url, method: method, headers, params: undefined, timeout: timeout };
    if (method !== 'get') request.body = body;

    const runOnce = () => Promise.race([
      new Promise((_, e) => setTimeout(() => e(new Error('请求超时')), timeout)),
      $.http[httpEntry](request)
        .then(response => {
          if (resultType == 'data') return $.toObj(response.body) || response.body;
          return $.toObj(response) || response;
        })
        .catch(err => {
          $.log(`❌请求发起失败！原因为：${err}`);
          throw err;
        })
    ]);
    try {
      return await runOnce();
    } catch (err) {
      // 网络错误或超时：GET 请求间隔 2 秒重试一次，抗瞬时抖动（POST 不重试，避免重复提交）
      const msg = (err && err.message) || String(err);
      if (method !== 'get' || !/超时|timeout|ECONNRESET|ETIMEDOUT|网络|socket/i.test(msg)) {
        $.log(`❌请求发起失败！原因为：${err}`);
        return null;
      }
      $.log(`⚠️ 请求超时(${msg})，2秒后重试一次`);
      await $.wait(2000);
      try {
        return await runOnce();
      } catch (err2) {
        $.log(`❌请求发起失败！原因为：${err2}`);
        return null;
      }
    }
  } catch (e) {
    $.log(`❌请求发起失败！原因为：${e}`);
    return null;
  }
};
// ========== 单账号 Bark 推送（签到成功通知） ==========
// 官方完整链接 https://api.day.app/xxx 只保留 xxx；纯Key原样；自建服务器完整地址保留
function cleanBarkKey(k) {
  let s = String(k || "").trim().replace(/\/+$/, "");
  s = s.replace(/^https?:\/\/api\.day\.app\//i, "");
  return s.trim();
}
async function barkNotify(barkKey, title, body) {
  try {
    const k = cleanBarkKey(barkKey);
    if (!k) return;
    let base = "https://api.day.app", key = k;
    const m = k.match(/^(https?:\/\/[^/]+)\/(.+)$/i);
    if (m) { base = m[1]; key = m[2]; }
    key = key.replace(/^\/+/, "");
    const u = base + "/" + encodeURIComponent(key) + "/" + encodeURIComponent(title) + "/" + encodeURIComponent(body) + "?group=ZEEHO&sound=birdsong";
    await $.http.get({ url: u, timeout: 8000 });
    $.log(`🔔Bark通知已推送: ${title}`);
  } catch (e) {
    $.log(`⚠️Bark推送失败: ${e}`);
  }
}
// ========== 运行日志（供面板读取今日得分） ==========
function addSigninLog(entry) {
  try {
    const raw = $.getdata("zeeho_logs");
    let logs = [];
    if (raw) {
      try { logs = JSON.parse(raw); } catch(e) { logs = []; }
    }
    if (!Array.isArray(logs)) logs = [];
    logs.unshift(entry);
    if (logs.length > 50) logs.length = 50;
    $.setdata(JSON.stringify(logs), "zeeho_logs");
  } catch(e) {}
}
//生成随机数
function randomInt(n, r) {
  return Math.round(Math.random() * (r - n) + n)
};
//控制台打印
function DoubleLog(data) {
  if (data && $.isNode()) {
    console.log(`${data}`);
    $.notifyMsg.push(`${data}`)
  } else if (data) {
    console.log(`${data}`);
    $.notifyMsg.push(`${data}`)
  }
};
//调试
function debug(t, l = 'debug') {
  if ($.is_debug === 'true') {
    $.log(`\n-----------${l}------------\n`);
    $.log(typeof t == "string" ? t : $.toStr(t) || `debug error => t=${t}`);
    $.log(`\n-----------${l}------------\n`)
  }
};
//汇总通知（summary=汇总标题, detail=每账号明细）
async function SendMsg(summary, detail) {
  if (!summary && !detail) return;
  // Notify=0 关闭通知时只打印
  if (!(0 < Notify)) {
    console.log([summary, detail].filter(Boolean).join('\n'));
    return;
  }

  if ($.isNode()) {
    // Node 环境：整合成一条文本推送
    const text = [summary, detail].filter(Boolean).join("\n");
    await notify.sendNotify($.name, text);
  } else {
    // Surge / QuanX / Loon / Shadowrocket
    $.msg($.name, summary || "", detail || "");
  }
};
//将请求头转换为小写
function ObjectKeys2LowerCase(obj) { return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v])) }
//---------------------- 主程序执行入口 -----------------------------------
!(async () => {
  if (typeof $request != "undefined") {
    await getCookie();
  } else {
    const e = envSplitor.find(o => userCookie.includes(o)) || envSplitor[0];
    userCookie = $.toObj(userCookie) || userCookie.split(e);

    userList.push(...userCookie.map(n => new UserInfo(n)).filter(Boolean));

    userCount = userList.length;
    console.log(`共找到${userCount}个账号`);
    if (userList.length > 0) await main();
  }
})()
  .catch(e => $.notifyMsg.push(e.message || e))
  .finally(async () => {
    // 构建总通知
    const total = userList.length;
    const success = $.successCount || 0;
    const fail = $.failCount || total - success;

    const summary = `共${total}个账号, 成功${success}个, 失败${fail}个`;
    const body = $.notifyMsg.length ? $.notifyMsg.join("\n") : "";

    // 抓包模式($request)无正文时不推送，避免空汇总通知
    if (body || typeof $request === "undefined") await SendMsg(summary, body);

    $.done({ ok: 1 });
  });
/** ---------------------------------固定不动区域----------------------------------------- */
// prettier-ignore
function randomPattern(pattern,chars="abcdef0123456789"){let result="";for(let char of pattern){if(char==="x"){result+=chars.charAt(Math.floor(Math.random()*chars.length))}else if(char==="X"){result+=chars.charAt(Math.floor(Math.random()*chars.length)).toUpperCase()}else{result+=char}}return result}
function getUuid(){const uuid=[randomPattern("xxxxxxxx"),randomPattern("xxxx"),randomPattern("4xxx"),randomPattern("xxxx"),randomPattern("xxxxxxxxxxxx")];return uuid.join("-")}
function getRandomChars(n=16){const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';let result='';for(let i=0;i<n;i++){result+=chars.charAt(Math.floor(Math.random()*chars.length))}return result}
function md5(t,e){function n(t,e){return t<<e|t>>>32-e}function r(t,e){var n,r,o,i,a;return o=2147483648&t,i=2147483648&e,a=(1073741823&t)+(1073741823&e),(n=1073741824&t)&(r=1073741824&e)?2147483648^a^o^i:n|r?1073741824&a?3221225472^a^o^i:1073741824^a^o^i:a^o^i}function o(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t&e|~t&n}(e,o,i),a),c)),r(n(t,u),e)}function i(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t&n|e&~n}(e,o,i),a),c)),r(n(t,u),e)}function a(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return t^e^n}(e,o,i),a),c)),r(n(t,u),e)}function u(t,e,o,i,a,u,c){return t=r(t,r(r(function(t,e,n){return e^(t|~n)}(e,o,i),a),c)),r(n(t,u),e)}function c(t){var e,n="",r="";for(e=0;e<=3;e++)n+=(r="0"+(t>>>8*e&255).toString(16)).substr(r.length-2,2);return n}var s,l,f,p,d,h,v,y,g,m=Array();for(m=function(t){for(var e,n=t.length,r=n+8,o=16*((r-r%64)/64+1),i=Array(o-1),a=0,u=0;u<n;)a=u%4*8,i[e=(u-u%4)/4]=i[e]|t.charCodeAt(u)<<a,u++;return a=u%4*8,i[e=(u-u%4)/4]=i[e]|128<<a,i[o-2]=n<<3,i[o-1]=n>>>29,i}(t=function(t){t=t.replace(/\r\n/g,"\n");for(var e="",n=0;n<t.length;n++){var r=t.charCodeAt(n);r<128?e+=String.fromCharCode(r):r>127&&r<2048?(e+=String.fromCharCode(r>>6|192),e+=String.fromCharCode(63&r|128)):(e+=String.fromCharCode(r>>12|224),e+=String.fromCharCode(r>>6&63|128),e+=String.fromCharCode(63&r|128))}return e}(t)),h=1732584193,v=4023233417,y=2562383102,g=271733878,s=0;s<m.length;s+=16)l=h,f=v,p=y,d=g,h=o(h,v,y,g,m[s+0],7,3614090360),g=o(g,h,v,y,m[s+1],12,3905402710),y=o(y,g,h,v,m[s+2],17,606105819),v=o(v,y,g,h,m[s+3],22,3250441966),h=o(h,v,y,g,m[s+4],7,4118548399),g=o(g,h,v,y,m[s+5],12,1200080426),y=o(y,g,h,v,m[s+6],17,2821735955),v=o(v,y,g,h,m[s+7],22,4249261313),h=o(h,v,y,g,m[s+8],7,1770035416),g=o(g,h,v,y,m[s+9],12,2336552879),y=o(y,g,h,v,m[s+10],17,4294925233),v=o(v,y,g,h,m[s+11],22,2304563134),h=o(h,v,y,g,m[s+12],7,1804603682),g=o(g,h,v,y,m[s+13],12,4254626195),y=o(y,g,h,v,m[s+14],17,2792965006),h=i(h,v=o(v,y,g,h,m[s+15],22,1236535329),y,g,m[s+1],5,4129170786),g=i(g,h,v,y,m[s+6],9,3225465664),y=i(y,g,h,v,m[s+11],14,643717713),v=i(v,y,g,h,m[s+0],20,3921069994),h=i(h,v,y,g,m[s+5],5,3593408605),g=i(g,h,v,y,m[s+10],9,38016083),y=i(y,g,h,v,m[s+15],14,3634488961),v=i(v,y,g,h,m[s+4],20,3889429448),h=i(h,v,y,g,m[s+9],5,568446438),g=i(g,h,v,y,m[s+14],9,3275163606),y=i(y,g,h,v,m[s+3],14,4107603335),v=i(v,y,g,h,m[s+8],20,1163531501),h=i(h,v,y,g,m[s+13],5,2850285829),g=i(g,h,v,y,m[s+2],9,4243563512),y=i(y,g,h,v,m[s+7],14,1735328473),h=a(h,v=i(v,y,g,h,m[s+12],20,2368359562),y,g,m[s+5],4,4294588738),g=a(g,h,v,y,m[s+8],11,2272392833),y=a(y,g,h,v,m[s+11],16,1839030562),v=a(v,y,g,h,m[s+14],23,4259657740),h=a(h,v,y,g,m[s+1],4,2763975236),g=a(g,h,v,y,m[s+4],11,1272893353),y=a(y,g,h,v,m[s+7],16,4139469664),v=a(v,y,g,h,m[s+10],23,3200236656),h=a(h,v,y,g,m[s+13],4,681279174),g=a(g,h,v,y,m[s+0],11,3936430074),y=a(y,g,h,v,m[s+3],16,3572445317),v=a(v,y,g,h,m[s+6],23,76029189),h=a(h,v,y,g,m[s+9],4,3654602809),g=a(g,h,v,y,m[s+12],11,3873151461),y=a(y,g,h,v,m[s+15],16,530742520),h=u(h,v=a(v,y,g,h,m[s+2],23,3299628645),y,g,m[s+0],6,4096336452),g=u(g,h,v,y,m[s+7],10,1126891415),y=u(y,g,h,v,m[s+14],15,2878612391),v=u(v,y,g,h,m[s+5],21,4237533241),h=u(h,v,y,g,m[s+12],6,1700485571),g=u(g,h,v,y,m[s+3],10,2399980690),y=u(y,g,h,v,m[s+10],15,4293915773),v=u(v,y,g,h,m[s+1],21,2240044497),h=u(h,v,y,g,m[s+8],6,1873313359),g=u(g,h,v,y,m[s+15],10,4264355552),y=u(y,g,h,v,m[s+6],15,2734768916),v=u(v,y,g,h,m[s+13],21,1309151649),h=u(h,v,y,g,m[s+4],6,4149444226),g=u(g,h,v,y,m[s+11],10,3174756917),y=u(y,g,h,v,m[s+2],15,718787259),v=u(v,y,g,h,m[s+9],21,3951481745),h=r(h,l),v=r(v,f),y=r(y,p),g=r(g,d);return 32==e?(c(h)+c(v)+c(y)+c(g)).toLowerCase():(c(v)+c(y)).toLowerCase()}
function sha1(msg){function rotate_left(n,s){var t4=(n<<s)|(n>>>(32-s));return t4};function lsb_hex(val){var str='';var i;var vh;var vl;for(i=0;i<=6;i+=2){vh=(val>>>(i*4+4))&0x0f;vl=(val>>>(i*4))&0x0f;str+=vh.toString(16)+vl.toString(16)}return str};function cvt_hex(val){var str='';var i;var v;for(i=7;i>=0;i--){v=(val>>>(i*4))&0x0f;str+=v.toString(16)}return str};function Utf8Encode(string){string=string.replace(/\r\n/g,'\n');var utftext='';for(var n=0;n<string.length;n++){var c=string.charCodeAt(n);if(c<128){utftext+=String.fromCharCode(c)}else if((c>127)&&(c<2048)){utftext+=String.fromCharCode((c>>6)|192);utftext+=String.fromCharCode((c&63)|128)}else{utftext+=String.fromCharCode((c>>12)|224);utftext+=String.fromCharCode(((c>>6)&63)|128);utftext+=String.fromCharCode((c&63)|128)}}return utftext};var blockstart;var i,j;var W=new Array(80);var H0=0x67452301;var H1=0xEFCDAB89;var H2=0x98BADCFE;var H3=0x10325476;var H4=0xC3D2E1F0;var A,B,C,D,E;var temp;msg=Utf8Encode(msg);var msg_len=msg.length;var word_array=new Array();for(i=0;i<msg_len-3;i+=4){j=msg.charCodeAt(i)<<24|msg.charCodeAt(i+1)<<16|msg.charCodeAt(i+2)<<8|msg.charCodeAt(i+3);word_array.push(j)}switch(msg_len%4){case 0:i=0x080000000;break;case 1:i=msg.charCodeAt(msg_len-1)<<24|0x0800000;break;case 2:i=msg.charCodeAt(msg_len-2)<<24|msg.charCodeAt(msg_len-1)<<16|0x08000;break;case 3:i=msg.charCodeAt(msg_len-3)<<24|msg.charCodeAt(msg_len-2)<<16|msg.charCodeAt(msg_len-1)<<8|0x80;break}word_array.push(i);while((word_array.length%16)!=14)word_array.push(0);word_array.push(msg_len>>>29);word_array.push((msg_len<<3)&0x0ffffffff);for(blockstart=0;blockstart<word_array.length;blockstart+=16){for(i=0;i<16;i++)W[i]=word_array[blockstart+i];for(i=16;i<=79;i++)W[i]=rotate_left(W[i-3]^W[i-8]^W[i-14]^W[i-16],1);A=H0;B=H1;C=H2;D=H3;E=H4;for(i=0;i<=19;i++){temp=(rotate_left(A,5)+((B&C)|(~B&D))+E+W[i]+0x5A827999)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=20;i<=39;i++){temp=(rotate_left(A,5)+(B^C^D)+E+W[i]+0x6ED9EBA1)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=40;i<=59;i++){temp=(rotate_left(A,5)+((B&C)|(B&D)|(C&D))+E+W[i]+0x8F1BBCDC)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}for(i=60;i<=79;i++){temp=(rotate_left(A,5)+(B^C^D)+E+W[i]+0xCA62C1D6)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp}H0=(H0+A)&0x0ffffffff;H1=(H1+B)&0x0ffffffff;H2=(H2+C)&0x0ffffffff;H3=(H3+D)&0x0ffffffff;H4=(H4+E)&0x0ffffffff}var temp=cvt_hex(H0)+cvt_hex(H1)+cvt_hex(H2)+cvt_hex(H3)+cvt_hex(H4);return temp.toLowerCase()}
function Env(e,t){class s{constructor(e){this.env=e}send(e,t="GET"){e="string"==typeof e?{url:e}:e;let s=this.get;"POST"===t&&(s=this.post);const i=new Promise((t,i)=>{s.call(this,e,(e,s,o)=>{e?i(e):t(s)})});return e.timeout?((e,t=1e3)=>Promise.race([e,new Promise((e,s)=>{setTimeout(()=>{s(new Error("请求超时"))},t)})]))(i,e.timeout):i}get(e){return this.send.call(this.env,e)}post(e){return this.send.call(this.env,e,"POST")}}return new class{constructor(e,t){this.logLevels={debug:0,info:1,warn:2,error:3},this.logLevelPrefixs={debug:"[DEBUG] ",info:"[INFO] ",warn:"[WARN] ",error:"[ERROR] "},this.logLevel="info",this.name=e,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,t),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof Egern?"Egern":"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}isEgern(){return"Egern"===this.getEnv()}toObj(e,t=null){try{return JSON.parse(e)}catch{return t}}toStr(e,t=null,...s){try{return JSON.stringify(e,...s)}catch{return t}}getjson(e,t){let s=t;if(this.getdata(e))try{s=JSON.parse(this.getdata(e))}catch{}return s}setjson(e,t){try{return this.setdata(JSON.stringify(e),t)}catch{return!1}}getScript(e){return new Promise(t=>{this.get({url:e},(e,s,i)=>t(i))})}runScript(e,t){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=t&&t.timeout?t.timeout:o;const[r,a]=i.split("@"),n={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:e,mock_type:"cron",timeout:o},headers:{"X-Key":r,Accept:"*/*"},policy:"DIRECT",timeout:o};this.post(n,(e,t,i)=>s(i))}).catch(e=>this.logErr(e))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const e=this.path.resolve(this.dataFile),t=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(e),i=!s&&this.fs.existsSync(t);if(!s&&!i)return{};{const i=s?e:t;try{return JSON.parse(this.fs.readFileSync(i))}catch(e){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const e=this.path.resolve(this.dataFile),t=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(e),i=!s&&this.fs.existsSync(t),o=JSON.stringify(this.data);s?this.fs.writeFileSync(e,o):i?this.fs.writeFileSync(t,o):this.fs.writeFileSync(e,o)}}lodash_get(e,t,s=void 0){const i=t.replace(/\[(\d+)\]/g,".$1").split(".");let o=e;for(const e of i)if(o=Object(o)[e],void 0===o)return s;return o}lodash_set(e,t,s){return Object(e)!==e||(Array.isArray(t)||(t=t.toString().match(/[^.[\]]+/g)||[]),t.slice(0,-1).reduce((e,s,i)=>Object(e[s])===e[s]?e[s]:e[s]=(Math.abs(t[i+1])|0)===+t[i+1]?[]:{},e)[t[t.length-1]]=s),e}getdata(e){let t=this.getval(e);if(/^@/.test(e)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(e),o=s?this.getval(s):"";if(o)try{const e=JSON.parse(o);t=e?this.lodash_get(e,i,""):t}catch(e){t=""}}return t}setdata(e,t){let s=!1;if(/^@/.test(t)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(t),r=this.getval(i),a=i?"null"===r?null:r||"{}":"{}";try{const t=JSON.parse(a);this.lodash_set(t,o,e),s=this.setval(JSON.stringify(t),i)}catch(t){const r={};this.lodash_set(r,o,e),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(e,t);return s}getval(e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":return $persistentStore.read(e);case"Quantumult X":return $prefs.valueForKey(e);case"Node.js":return this.data=this.loaddata(),this.data[e];default:return this.data&&this.data[e]||null}}setval(e,t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":return $persistentStore.write(e,t);case"Quantumult X":return $prefs.setValueForKey(e,t);case"Node.js":return this.data=this.loaddata(),this.data[t]=e,this.writedata(),!0;default:return this.data&&this.data[t]||null}}initGotEnv(e){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,e&&(e.headers=e.headers?e.headers:{},e&&(e.headers=e.headers?e.headers:{},void 0===e.headers.cookie&&void 0===e.headers.Cookie&&void 0===e.cookieJar&&(e.cookieJar=this.ckjar)))}get(e,t=()=>{}){switch(e.headers&&(delete e.headers["Content-Type"],delete e.headers["Content-Length"],delete e.headers["content-type"],delete e.headers["content-length"]),e.params&&(e.url+="?"+this.queryStr(e.params)),void 0===e.followRedirect||e.followRedirect||((this.isSurge()||this.isLoon())&&(e["auto-redirect"]=!1),this.isQuanX()&&(e.opts?e.opts.redirection=!1:e.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":default:this.isSurge()&&this.isNeedRewrite&&(e.headers=e.headers||{},Object.assign(e.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(e,(e,s,i)=>{!e&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),t(e,s,i)});break;case"Quantumult X":this.isNeedRewrite&&(e.opts=e.opts||{},Object.assign(e.opts,{hints:!1})),$task.fetch(e).then(e=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=e;t(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)},e=>t(e&&e.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(e),this.got(e).on("redirect",(e,t)=>{try{if(e.headers["set-cookie"]){const s=e.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),t.cookieJar=this.ckjar}}catch(e){this.logErr(e)}}).then(e=>{const{statusCode:i,statusCode:o,headers:r,rawBody:a}=e,n=s.decode(a,this.encoding);t(null,{status:i,statusCode:o,headers:r,rawBody:a,body:n},n)},e=>{const{message:i,response:o}=e;t(i,o,o&&s.decode(o.rawBody,this.encoding))})}}post(e,t=()=>{}){const s=e.method?e.method.toLocaleLowerCase():"post";switch(e.body&&e.headers&&!e.headers["Content-Type"]&&!e.headers["content-type"]&&(e.headers["content-type"]="application/x-www-form-urlencoded"),e.headers&&(delete e.headers["Content-Length"],delete e.headers["content-length"]),void 0===e.followRedirect||e.followRedirect||((this.isSurge()||this.isLoon())&&(e["auto-redirect"]=!1),this.isQuanX()&&(e.opts?e.opts.redirection=!1:e.opts={redirection:!1})),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":default:this.isSurge()&&this.isNeedRewrite&&(e.headers=e.headers||{},Object.assign(e.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](e,(e,s,i)=>{!e&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),t(e,s,i)});break;case"Quantumult X":e.method=s,this.isNeedRewrite&&(e.opts=e.opts||{},Object.assign(e.opts,{hints:!1})),$task.fetch(e).then(e=>{const{statusCode:s,statusCode:i,headers:o,body:r,bodyBytes:a}=e;t(null,{status:s,statusCode:i,headers:o,body:r,bodyBytes:a},r,a)},e=>t(e&&e.error||"UndefinedError"));break;case"Node.js":let i=require("iconv-lite");this.initGotEnv(e);const{url:o,...r}=e;this.got[s](o,r).then(e=>{const{statusCode:s,statusCode:o,headers:r,rawBody:a}=e,n=i.decode(a,this.encoding);t(null,{status:s,statusCode:o,headers:r,rawBody:a,body:n},n)},e=>{const{message:s,response:o}=e;t(s,o,o&&i.decode(o.rawBody,this.encoding))})}}time(e,t=null){const s=t?new Date(t):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(e)&&(e=e.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let t in i)new RegExp("("+t+")").test(e)&&(e=e.replace(RegExp.$1,1==RegExp.$1.length?i[t]:("00"+i[t]).substr((""+i[t]).length)));return e}queryStr(e){let t="";for(const s in e){let i=e[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),t+=`${s}=${i}&`)}return t=t.substring(0,t.length-1),t}msg(t=e,s="",i="",o={}){const r=e=>{const{$open:t,$copy:s,$media:i,$mediaMime:o}=e;switch(typeof e){case void 0:return e;case"string":switch(this.getEnv()){case"Surge":case"Stash":case"Egern":default:return{url:e};case"Loon":case"Shadowrocket":return e;case"Quantumult X":return{"open-url":e};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":case"Egern":default:{const r={};let a=e.openUrl||e.url||e["open-url"]||t;a&&Object.assign(r,{action:"open-url",url:a});let n=e["update-pasteboard"]||e.updatePasteboard||s;n&&Object.assign(r,{action:"clipboard",text:n});let h=e.mediaUrl||e["media-url"]||i;if(h){let e,t;if(h.startsWith("http"));else if(h.startsWith("data:")){const[s]=h.split(";"),[,i]=h.split(",");e=i,t=s.replace("data:","")}else{e=h,t=(e=>{const t={JVBERi0:"application/pdf",R0lGODdh:"image/gif",R0lGODlh:"image/gif",iVBORw0KGgo:"image/png","/9j/":"image/jpg"};for(var s in t)if(0===e.indexOf(s))return t[s];return null})(h)}Object.assign(r,{"media-url":h,"media-base64":e,"media-base64-mime":o??t})}return Object.assign(r,{"auto-dismiss":e["auto-dismiss"],sound:e.sound}),r}case"Loon":{const s={};let o=e.openUrl||e.url||e["open-url"]||t;o&&Object.assign(s,{openUrl:o});let r=e.mediaUrl||e["media-url"]||i;return r&&Object.assign(s,{mediaUrl:r}),console.log(JSON.stringify(s)),s}case"Quantumult X":{const o={};let r=e["open-url"]||e.url||e.openUrl||t;r&&Object.assign(o,{"open-url":r});let a=e.mediaUrl||e["media-url"]||i;a&&Object.assign(o,{"media-url":a});let n=e["update-pasteboard"]||e.updatePasteboard||s;return n&&Object.assign(o,{"update-pasteboard":n}),console.log(JSON.stringify(o)),o}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":default:$notification.post(t,s,i,r(o));break;case"Quantumult X":$notify(t,s,i,r(o));case"Node.js":}if(!this.isMuteLog){let e=["","==============📣系统通知📣=============="];e.push(t),s&&e.push(s),i&&e.push(i),console.log(e.join("\n")),this.logs=this.logs.concat(e)}}debug(...e){this.logLevels[this.logLevel]<=this.logLevels.debug&&(e.length>0&&(this.logs=[...this.logs,...e]),console.log(`${this.logLevelPrefixs.debug}${e.map(e=>e??String(e)).join(this.logSeparator)}`))}info(...e){this.logLevels[this.logLevel]<=this.logLevels.info&&(e.length>0&&(this.logs=[...this.logs,...e]),console.log(`${this.logLevelPrefixs.info}${e.map(e=>e??String(e)).join(this.logSeparator)}`))}warn(...e){this.logLevels[this.logLevel]<=this.logLevels.warn&&(e.length>0&&(this.logs=[...this.logs,...e]),console.log(`${this.logLevelPrefixs.warn}${e.map(e=>e??String(e)).join(this.logSeparator)}`))}error(...e){this.logLevels[this.logLevel]<=this.logLevels.error&&(e.length>0&&(this.logs=[...this.logs,...e]),console.log(`${this.logLevelPrefixs.error}${e.map(e=>e??String(e)).join(this.logSeparator)}`))}log(...e){e.length>0&&(this.logs=[...this.logs,...e]),console.log(e.map(e=>e??String(e)).join(this.logSeparator))}logErr(e,t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t,e);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t,void 0!==e.message?e.message:e,e.stack)}}wait(e){return new Promise(t=>setTimeout(t,e))}done(e={}){const t=((new Date).getTime()-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${t} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Egern":case"Quantumult X":default:$done(e);break;case"Node.js":process.exit(0)}}}(e,t)}
