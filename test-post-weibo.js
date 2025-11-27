const http = require('http');

// 测试发布微博
function testPostWeibo() {
  return new Promise((resolve, reject) => {
    const payload = {
      name: 'post_weibo',
      arguments: {
        content: '测试MCP发布功能 - 登录成功后的第一次测试'
      }
    };
    
    // 确保使用UTF-8编码
    const data = JSON.stringify(payload);
    const buffer = Buffer.from(data, 'utf8');

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/tools/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': buffer.length,
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log('\n✅ 测试 post_weibo 结果:');
        try {
          const parsed = JSON.parse(body);
          console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('响应内容:', body);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`问题: ${e.message}`);
      reject(e);
    });

    // 使用Buffer写入，确保编码正确
    req.write(buffer);
    req.end();
  });
}

// 运行测试
async function runTest() {
  console.log('🔍 测试发布微博功能（登录成功后）...\n');
  
  try {
    await testPostWeibo();
    console.log('\n✅ 测试完成！请查看日志文件 logs/wb_mcp.log 了解详细信息');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

runTest();

