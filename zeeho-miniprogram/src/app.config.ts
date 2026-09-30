export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/accounts/index',
    'pages/logs/index',
    'pages/mine/index',
    'pages/accountEdit/index',
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#0A0F1E',
    navigationBarTitleText: 'ZEEHO助手',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#5F7199',
    selectedColor: '#38BDF8',
    backgroundColor: '#0D1428',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-selected.png',
      },
      {
        pagePath: 'pages/accounts/index',
        text: '账号',
        iconPath: 'assets/tabbar/accounts.png',
        selectedIconPath: 'assets/tabbar/accounts-selected.png',
      },
      {
        pagePath: 'pages/logs/index',
        text: '日志',
        iconPath: 'assets/tabbar/logs.png',
        selectedIconPath: 'assets/tabbar/logs-selected.png',
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tabbar/mine.png',
        selectedIconPath: 'assets/tabbar/mine-selected.png',
      },
    ],
  },
})
