const http = require('http');

// 测试检查页面元素
function checkPageElements() {
  return new Promise((resolve, reject) => {
    const payload = {
      name: 'post_weibo',
      arguments: {
        content: 'test'
      }
    };
    
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
        try {
          const parsed = JSON.parse(body);
          console.log('\n📋 测试结果:');
          console.log(JSON.stringify(parsed, null, 2));
          
          // 提取错误信息
          if (parsed.data && parsed.data.content) {
            const content = parsed.data.content[0];
            if (content.text) {
              const errorInfo = JSON.parse(content.text);
              if (errorInfo.error) {
                console.log('\n❌ 错误信息:', errorInfo.error);
              }
            }
          }
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

    req.write(buffer);
    req.end();
  });
}

console.log('🔍 测试发布功能并检查页面元素...\n');
checkPageElements();

