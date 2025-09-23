const axios = require('axios');

async function testSimpleAPI() {
    try {
        console.log('🚀 测试简单API调用...');
        
        // 直接使用axios测试网络连接
        console.log('\n🌐 测试网络连接...');
        const response = await axios.get('https://httpbin.org/get', {
            timeout: 5000
        });
        console.log('✅ 网络连接正常');
        
        // 测试微博API（不依赖我们的代码）
        console.log('\n📱 测试微博API...');
        try {
            const weiboResponse = await axios.get('https://m.weibo.cn/api/container/getIndex?type=uid&value=2803301701', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            console.log('✅ 微博API连接成功');
            console.log('响应状态:', weiboResponse.status);
            console.log('数据大小:', JSON.stringify(weiboResponse.data).length, '字符');
        } catch (weiboError) {
            console.log('⚠️ 微博API连接失败:', weiboError.message);
        }
        
        console.log('\n✅ 简单API测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

testSimpleAPI();
