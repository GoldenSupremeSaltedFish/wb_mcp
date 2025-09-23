const axios = require('axios');

async function testMCP() {
    try {
        console.log('🚀 测试MCP服务...');
        
        // 启动MCP服务（不依赖Electron）
        const { mcpServer } = require('./dist/mcpserver/server');
        const { weiboTools } = require('./dist/tools/weibo-tools');
        
        console.log('✅ MCP服务启动成功');
        
        // 测试工具列表
        console.log('\n📋 获取工具列表...');
        const tools = mcpServer.listTools();
        console.log('可用工具:', tools.map(t => t.name));
        
        // 测试搜索功能（使用模拟数据）
        console.log('\n🔍 测试搜索功能...');
        const searchResult = await weiboTools.executeTool('search_posts', {
            keyword: '测试',
            limit: 5
        });
        
        console.log('搜索结果:', JSON.stringify(searchResult, null, 2));
        
        // 测试热搜功能
        console.log('\n🔥 测试热搜功能...');
        const hotTopicsResult = await weiboTools.executeTool('get_hot_topics', {
            limit: 10
        });
        
        console.log('热搜结果:', JSON.stringify(hotTopicsResult, null, 2));
        
        console.log('\n✅ MCP服务测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

testMCP();
