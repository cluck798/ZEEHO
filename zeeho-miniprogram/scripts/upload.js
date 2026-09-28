// 上传体验版脚本（npm run build:weapp 生成 dist 后运行）
// 用法：node scripts/upload.js [版本号]
// 需先在 .auth/ 下放置上传私钥 private.<appid>.key
const fs = require('fs')
const path = require('path')

const projectDir = path.resolve(__dirname, '..')
const appid = require(path.join(projectDir, 'project.config.json')).appid
const pkg = require(path.join(projectDir, 'package.json'))

async function main() {
  const ciPath = path.join(projectDir, 'node_modules', 'miniprogram-ci')
  if (!fs.existsSync(ciPath)) {
    console.error('未安装 miniprogram-ci，请先安装依赖')
    process.exit(1)
  }
  const ci = require(ciPath)

  const privateKeyPath = path.join(projectDir, '.auth', `private.${appid}.key`)
  if (!fs.existsSync(privateKeyPath)) {
    console.error(`缺少上传私钥：${privateKeyPath}`)
    console.error('请在微信公众平台「开发 → 开发设置 → 小程序代码上传」生成并下载私钥，放到该路径')
    process.exit(1)
  }

  const distPath = path.join(projectDir, 'dist')
  if (!fs.existsSync(path.join(distPath, 'app.json'))) {
    console.error('dist 未构建，请先运行 npm run build:weapp')
    process.exit(1)
  }

  const version = process.argv[2] || pkg.version || '0.0.1'
  const project = new ci.Project({
    appid,
    type: 'miniProgram',
    projectPath: distPath,
    privateKeyPath,
    ignores: ['node_modules/**/*'],
  })

  await ci.upload({
    project,
    version,
    desc: `自动上传体验版 v${version}`,
    setting: { es6: true, minify: true },
    onProgressUpdate: console.log,
  })
  console.log(`✅ 体验版 v${version} 上传成功`)
}

main().catch(e => { console.error(e); process.exit(1) })