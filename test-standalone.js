const axios = require('axios');

async function testStandalone() {
    try {
        console.log('🚀 测试独立MCP服务...');
        
        // 直接测试Weibo API（不依赖Electron）
        const { weiboAPI } = require('./dist/api/weibo-api');
        
        console.log('✅ Weibo API加载成功');
        
        // 测试搜索功能
        console.log('\n🔍 测试搜索功能...');
        const searchResult = await weiboAPI.searchPosts('测试', 5);
        console.log('搜索结果:', JSON.stringify(searchResult, null, 2));
        
        // 测试热搜功能
        console.log('\n🔥 测试热搜功能...');
        const hotTopicsResult = await weiboAPI.getHotTopics(10);
        console.log('热搜结果:', JSON.stringify(hotTopicsResult, null, 2));
        
        // 测试评论功能
        console.log('\n💬 测试评论功能...');
        const commentsResult = await weiboAPI.getComments('test_post_id', 5);
        console.log('评论结果:', JSON.stringify(commentsResult, null, 2));
        
        console.log('\n✅ 独立测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

testStandalone();
