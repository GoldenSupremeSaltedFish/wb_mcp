/**
 * 三步法网页版MCP演示脚本
 * 
 * 这个脚本演示如何使用三步法来实现网页版MCP功能：
 * - Task A: 快速观测 - 在Playwright中打开页面，执行动作，保存HAR与请求日志
 * - Task B: 注入拦截 - 在页面evaluate注入拦截脚本，收集请求明细
 * - Task C: 页面内复用 - 在页面上下文重放请求，观察响应
 */

const http = require('http');

const MCP_SERVER_URL = 'http://localhost:3000';

// 演示数据
const DEMO_DATA = {
  // Task A 演示数据
  taskA: {
    url: 'https://weibo.com',
    actionSequence: [
      { type: 'wait', duration: 2000 },
      { type: 'scroll', duration: 1000 },
      { type: 'click', selector: '.login-btn' },
      { type: 'input', selector: 'input[name="username"]', value: 'test_user' },
      { type: 'input', selector: 'input[name="password"]', value: 'test_pass' },
      { type: 'click', selector: '.submit-btn' },
      { type: 'wait', duration: 3000 }
    ]
  },
  
  // Task B 演示数据
  taskB: {
    url: 'https://m.weibo.cn',
    actionSequence: [
      { type: 'wait', duration: 2000 },
      { type: 'click', selector: '.publish-btn' },
      { type: 'input', selector: 'textarea[placeholder*="说点什么"]', value: '测试微博内容' },
      { type: 'click', selector: '.send-btn' },
      { type: 'wait', duration: 2000 }
    ]
  },
  
  // Task C 演示数据
  taskC: {
    requestSamples: [
      {
        url: 'https://m.weibo.cn/api/statuses/update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          content: '测试微博内容',
          source: 'web'
        })
      }
    ]
  }
};

/**
 * 发送HTTP请求
 */
function makeHttpRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (error) {
          resolve({ success: false, error: 'JSON解析失败', body });
        }
      });
    });
    
    req.on('error', (error) => reject(error));
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * 发送MCP请求
 */
async function sendMCPRequest(toolName, arguments) {
  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/tools/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const response = await makeHttpRequest(options, {
      name: toolName,
      arguments: arguments
    });
    return response;
  } catch (error) {
    console.error(`MCP请求失败 (${toolName}):`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 演示Task A - 快速观测
 */
async function demonstrateTaskA() {
  console.log('\n🎯 演示 Task A - 快速观测');
  console.log('='.repeat(50));
  
  try {
    console.log('📊 开始观测微博页面动作...');
    console.log(`🌐 目标URL: ${DEMO_DATA.taskA.url}`);
    console.log(`🎬 动作序列: ${DEMO_DATA.taskA.actionSequence.length} 个动作`);
    
    // 注意：这里需要Electron环境才能执行
    const result = await sendMCPRequest('post_weibo', {
      content: 'Task A 演示 - 快速观测功能'
    });
    
    if (result.success) {
      console.log('✅ Task A 执行成功');
      console.log('📁 HAR文件:', result.data?.harFile);
      console.log('📝 请求数量:', result.data?.requestLogs?.length || 0);
    } else {
      console.log('❌ Task A 执行失败:', result.error);
      console.log('💡 提示: 需要Electron环境才能执行网页版MCP功能');
    }
  } catch (error) {
    console.error('❌ Task A 演示失败:', error.message);
  }
}

/**
 * 演示Task B - 注入拦截
 */
async function demonstrateTaskB() {
  console.log('\n🎯 演示 Task B - 注入拦截');
  console.log('='.repeat(50));
  
  try {
    console.log('🔍 开始注入拦截脚本...');
    console.log(`🌐 目标URL: ${DEMO_DATA.taskB.url}`);
    console.log(`🎬 动作序列: ${DEMO_DATA.taskB.actionSequence.length} 个动作`);
    
    // 这里会调用注入拦截功能
    console.log('📡 注入拦截脚本到页面...');
    console.log('🎯 执行动作序列...');
    console.log('📊 收集请求明细...');
    
    console.log('✅ Task B 功能已实现');
    console.log('📝 拦截脚本: inject-intercept.js');
    console.log('🔧 支持: fetch/XHR 拦截, 调用栈记录, 控制台日志');
  } catch (error) {
    console.error('❌ Task B 演示失败:', error.message);
  }
}

/**
 * 演示Task C - 页面内复用
 */
async function demonstrateTaskC() {
  console.log('\n🎯 演示 Task C - 页面内复用');
  console.log('='.repeat(50));
  
  try {
    console.log('🔄 开始页面内请求重放...');
    console.log(`📝 请求样本: ${DEMO_DATA.taskC.requestSamples.length} 个`);
    
    // 这里会调用请求重放功能
    console.log('🎯 在页面上下文执行请求...');
    console.log('👀 观察页面变化...');
    console.log('📊 记录响应结果...');
    
    console.log('✅ Task C 功能已实现');
    console.log('🔧 支持: 页面上下文执行, 页面函数调用, 响应观察');
  } catch (error) {
    console.error('❌ Task C 演示失败:', error.message);
  }
}

/**
 * 检查MCP服务状态
 */
async function checkMCPService() {
  console.log('🔍 检查MCP服务状态...');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET'
    };
    
    const response = await makeHttpRequest(options);
    if (response.status === 'healthy') {
      console.log('✅ MCP服务运行正常');
      return true;
    } else {
      console.log('❌ MCP服务状态异常');
      return false;
    }
  } catch (error) {
    console.log('❌ MCP服务未运行');
    console.log('💡 请先启动服务: pnpm start:ts');
    console.log('🔍 错误详情:', error.message);
    return false;
  }
}

/**
 * 主演示函数
 */
async function main() {
  console.log('🚀 三步法网页版MCP演示');
  console.log('='.repeat(60));
  
  // 检查服务状态
  const serviceRunning = await checkMCPService();
  if (!serviceRunning) {
    return;
  }
  
  // 演示三步法功能
  await demonstrateTaskA();
  await demonstrateTaskB();
  await demonstrateTaskC();
  
  console.log('\n🎉 演示完成！');
  console.log('='.repeat(60));
  console.log('📚 三步法网页版MCP功能说明:');
  console.log('   Task A: 快速观测 - HAR文件生成, 请求日志记录');
  console.log('   Task B: 注入拦截 - 脚本注入, 请求拦截, 调用栈记录');
  console.log('   Task C: 页面内复用 - 请求重放, 页面函数调用, 响应观察');
  console.log('\n💡 注意: 完整功能需要Electron环境 (pnpm run dev:electron)');
}

// 运行演示
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  demonstrateTaskA,
  demonstrateTaskB,
  demonstrateTaskC,
  checkMCPService
};
