import React from 'react';
import Taro from '@tarojs/taro';
import { AppContextProvider } from '@/store/AppContext';
import './app.scss';

// 云开发初始化必须早于任何云 API 调用：
// 放在模块作用域（app.js 加载时执行），早于所有组件的 useEffect，
// 否则 store 里的账号读取会跑在 init 之前 → 读取失败 → 已保存账号不显示。
if (process.env.TARO_ENV === 'weapp') {
  Taro.cloud.init({ env: 'cloudbase-d0gemr0f16e9211f0', traceUser: true });
}

function App(props) {
  return (
    <AppContextProvider>
      {props.children}
    </AppContextProvider>
  );
}

export default App;
