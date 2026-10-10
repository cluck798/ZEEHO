import React, { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { AppContextProvider } from '@/store/AppContext';
import './app.scss';

function App(props) {
  useEffect(() => {
    // 微信小程序下初始化云开发环境（H5 预览走 mock，不初始化）
    if (process.env.TARO_ENV === 'weapp') {
      Taro.cloud.init({ env: 'cloudbase-d0gemr0f16e9211f0', traceUser: true });
    }
    console.log('[App] launched');
  }, []);

  return (
    <AppContextProvider>
      {props.children}
    </AppContextProvider>
  );
}

export default App;
