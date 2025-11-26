const http = require('http');

// 测试get_status
function testGetStatus() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      name: 'get_status',
      arguments: {}
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/tools/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log('\n✅ 测试 get_status:');
        console.log(JSON.stringify(JSON.parse(body), null, 2));
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`问题: ${e.message}`);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

// 测试post_weibo
function testPostWeibo() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      name: 'post_weibo',
      arguments: {
        content: 'Test call chain tracking'
      }
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/tools/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log('\n✅ 测试 post_weibo:');
        try {
          const parsed = JSON.parse(body);
          console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('响应内容:', body);
          console.log('解析错误:', e.message);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`问题: ${e.message}`);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

// 运行测试
async function runTests() {
  console.log('🔍 开始测试工具→浏览器的通信链路...\n');
  
  try {
    await testGetStatus();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testPostWeibo();
    
    console.log('\n✅ 测试完成！请查看日志文件 logs/wb_mcp.log 中的调用链追踪信息');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

runTests();

