// 注入拦截脚本 - 用于在页面上下文中拦截和记录请求
(function() {
  'use strict';
  
  // 请求拦截器配置
  const interceptor = {
    requests: [],
    originalFetch: null,
    originalXHR: null,
    isActive: false
  };

  // 请求日志格式
  function createRequestLog(url, method, headers, body, source) {
    return {
      url: url,
      method: method,
      headers: headers,
      body: body,
      timestamp: Date.now(),
      source: source, // 'fetch' 或 'xhr'
      stack: new Error().stack, // 调用栈
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };
  }

  // 拦截fetch请求
  function interceptFetch() {
    if (interceptor.originalFetch) return;
    
    interceptor.originalFetch = window.fetch;
    window.fetch = function(...args) {
      const [url, options = {}] = args;
      const method = options.method || 'GET';
      const headers = options.headers || {};
      const body = options.body;
      
      // 记录请求
      const requestLog = createRequestLog(
        url.toString(),
        method,
        headers,
        body,
        'fetch'
      );
      
      interceptor.requests.push(requestLog);
      console.log('[INJECT-INTERCEPT] Fetch请求:', requestLog);
      
      // 执行原始fetch
      return interceptor.originalFetch.apply(this, args)
        .then(response => {
          console.log('[INJECT-INTERCEPT] Fetch响应:', {
            url: url.toString(),
            status: response.status,
            statusText: response.statusText
          });
          return response;
        })
        .catch(error => {
          console.log('[INJECT-INTERCEPT] Fetch错误:', {
            url: url.toString(),
            error: error.message
          });
          throw error;
        });
    };
  }

  // 拦截XMLHttpRequest
  function interceptXHR() {
    if (interceptor.originalXHR) return;
    
    interceptor.originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      const xhr = new interceptor.originalXHR();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      
      let requestLog = null;
      
      xhr.open = function(method, url, ...args) {
        requestLog = createRequestLog(
          url,
          method,
          {},
          null,
          'xhr'
        );
        
        interceptor.requests.push(requestLog);
        console.log('[INJECT-INTERCEPT] XHR请求:', requestLog);
        
        return originalOpen.apply(this, [method, url, ...args]);
      };
      
      xhr.send = function(data) {
        if (requestLog && data) {
          requestLog.body = data;
        }
        
        xhr.addEventListener('load', function() {
          console.log('[INJECT-INTERCEPT] XHR响应:', {
            url: requestLog?.url,
            status: xhr.status,
            statusText: xhr.statusText
          });
        });
        
        xhr.addEventListener('error', function() {
          console.log('[INJECT-INTERCEPT] XHR错误:', {
            url: requestLog?.url,
            error: 'Network error'
          });
        });
        
        return originalSend.apply(this, [data]);
      };
      
      return xhr;
    };
  }

  // 启动拦截器
  function startInterception() {
    if (interceptor.isActive) return;
    
    interceptFetch();
    interceptXHR();
    interceptor.isActive = true;
    
    console.log('[INJECT-INTERCEPT] 请求拦截器已启动');
  }

  // 停止拦截器
  function stopInterception() {
    if (!interceptor.isActive) return;
    
    if (interceptor.originalFetch) {
      window.fetch = interceptor.originalFetch;
    }
    
    if (interceptor.originalXHR) {
      window.XMLHttpRequest = interceptor.originalXHR;
    }
    
    interceptor.isActive = false;
    console.log('[INJECT-INTERCEPT] 请求拦截器已停止');
  }

  // 获取请求日志
  function getRequestLogs() {
    return interceptor.requests;
  }

  // 清空请求日志
  function clearRequestLogs() {
    interceptor.requests = [];
    console.log('[INJECT-INTERCEPT] 请求日志已清空');
  }

  // 导出到全局对象
  window.InjectInterceptor = {
    start: startInterception,
    stop: stopInterception,
    getLogs: getRequestLogs,
    clear: clearRequestLogs,
    isActive: () => interceptor.isActive
  };

  // 自动启动拦截器
  startInterception();
  
  console.log('[INJECT-INTERCEPT] 注入拦截脚本已加载');
})();
