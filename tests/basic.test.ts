import { weiboTools } from '../src/tools/weibo-tools';
import { configManager } from '../src/utils/config';

// 基础功能测试
async function testBasicFunctionality(): Promise<void> {
  console.log('开始基础功能测试...');

  try {
    // 测试配置管理器
    console.log('1. 测试配置管理器...');
    await configManager.initialize();
    const config = configManager.getConfig();
    console.log('✓ 配置管理器初始化成功');
    console.log('  - MCP 端口:', config.mcp.port);
    console.log('  - 数据目录:', config.dataDir);

    // 测试工具列表
    console.log('2. 测试工具列表...');
    const tools = weiboTools.getAvailableTools();
    console.log('✓ 可用工具数量:', tools.length);
    tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // 测试状态查询
    console.log('3. 测试状态查询...');
    const statusResult = await weiboTools.executeTool('get_status', {});
    console.log('✓ 状态查询成功');
    const statusText = statusResult.content[0]?.text;
    if (statusText && typeof statusText === 'string') {
      console.log('  状态结果:', JSON.parse(statusText));
    }

    // 测试热搜榜（模拟数据）
    console.log('4. 测试热搜榜...');
    const hotTopicsResult = await weiboTools.executeTool('get_hot_topics', { limit: 5 });
    console.log('✓ 热搜榜查询成功');
    const hotTopicsText = hotTopicsResult.content[0]?.text;
    if (hotTopicsText && typeof hotTopicsText === 'string') {
      console.log('  热搜结果:', JSON.parse(hotTopicsText));
    }

    // 测试搜索功能（模拟数据）
    console.log('5. 测试搜索功能...');
    const searchResult = await weiboTools.executeTool('search_posts', { 
      keyword: '测试', 
      limit: 3 
    });
    console.log('✓ 搜索功能成功');
    const searchText = searchResult.content[0]?.text;
    if (searchText && typeof searchText === 'string') {
      console.log('  搜索结果:', JSON.parse(searchText));
    }

    console.log('\n🎉 所有基础功能测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

// 运行测试
if (require.main === module) {
  testBasicFunctionality()
    .then(() => {
      console.log('测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}

export { testBasicFunctionality };
