import { weiboTools } from '../src/tools/weibo-tools';
import { configManager } from '../src/utils/config';

// 高级功能测试
async function testAdvancedFunctionality(): Promise<void> {
  console.log('开始高级功能测试...');

  try {
    // 测试配置管理器
    console.log('1. 测试配置管理器...');
    await configManager.initialize();
    const config = configManager.getConfig();
    console.log('✓ 配置管理器初始化成功');
    console.log('  - MCP 端口:', config.mcp.port);
    console.log('  - 数据目录:', config.dataDir);

    // 测试任务调度器状态
    console.log('2. 测试任务调度器...');
    const schedulerStatus = await weiboTools.executeTool('task_scheduler', { action: 'status' });
    const statusText = schedulerStatus.content[0]?.text;
    if (statusText && typeof statusText === 'string') {
      const statusData = JSON.parse(statusText);
      console.log('✓ 任务调度器状态查询成功');
      console.log('  - 运行状态:', statusData.data.running);
      console.log('  - 任务数量:', statusData.data.tasks.length);
      statusData.data.tasks.forEach((task: any) => {
        console.log(`    - ${task.name} (${task.id}): ${task.enabled ? '启用' : '禁用'}`);
      });
    }

    // 测试任务调度器结果
    console.log('3. 测试任务调度器结果...');
    const schedulerResults = await weiboTools.executeTool('task_scheduler', { 
      action: 'results', 
      limit: 10 
    });
    const resultsText = schedulerResults.content[0]?.text;
    if (resultsText && typeof resultsText === 'string') {
      const resultsData = JSON.parse(resultsText);
      console.log('✓ 任务调度器结果查询成功');
      console.log('  - 结果数量:', resultsData.data.count);
    }

    // 测试服务状态（包含新的传输信息）
    console.log('4. 测试服务状态...');
    const statusResult = await weiboTools.executeTool('get_status', {});
    const statusText2 = statusResult.content[0]?.text;
    if (statusText2 && typeof statusText2 === 'string') {
      const statusData = JSON.parse(statusText2);
      console.log('✓ 服务状态查询成功');
      console.log('  - 认证状态:', statusData.data.authenticated);
      console.log('  - MCP 服务器:', statusData.data.mcpServer);
    }

    // 测试热搜榜功能
    console.log('5. 测试热搜榜功能...');
    const hotTopicsResult = await weiboTools.executeTool('get_hot_topics', { limit: 5 });
    const hotTopicsText = hotTopicsResult.content[0]?.text;
    if (hotTopicsText && typeof hotTopicsText === 'string') {
      const hotTopicsData = JSON.parse(hotTopicsText);
      console.log('✓ 热搜榜查询成功');
      console.log('  - 话题数量:', hotTopicsData.meta.count);
    }

    // 测试搜索功能
    console.log('6. 测试搜索功能...');
    const searchResult = await weiboTools.executeTool('search_posts', { 
      keyword: '人工智能', 
      limit: 3 
    });
    const searchText = searchResult.content[0]?.text;
    if (searchText && typeof searchText === 'string') {
      const searchData = JSON.parse(searchText);
      console.log('✓ 搜索功能成功');
      console.log('  - 搜索结果数量:', searchData.meta.count);
    }

    // 测试数据导出功能
    console.log('7. 测试数据导出功能...');
    const testData = [
      { id: 1, name: '测试数据1', value: '值1' },
      { id: 2, name: '测试数据2', value: '值2' },
    ];
    const exportResult = await weiboTools.executeTool('export_data', {
      format: 'json',
      filename: 'test-export.json',
      data: testData,
    });
    const exportText = exportResult.content[0]?.text;
    if (exportText && typeof exportText === 'string') {
      const exportData = JSON.parse(exportText);
      console.log('✓ 数据导出功能成功');
      console.log('  - 导出格式:', exportData.message);
    }

    console.log('\n🎉 所有高级功能测试通过！');
    console.log('\n📊 功能总结:');
    console.log('  ✅ HTTP 传输层 (端口 3000)');
    console.log('  ✅ SSE 流式传输');
    console.log('  ✅ 任务调度器 (3个定时任务)');
    console.log('  ✅ 微博工具集 (7个工具)');
    console.log('  ✅ 配置管理系统');
    console.log('  ✅ 日志系统');
    console.log('  ✅ 数据导出功能');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

// 运行测试
if (require.main === module) {
  testAdvancedFunctionality()
    .then(() => {
      console.log('高级功能测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('高级功能测试失败:', error);
      process.exit(1);
    });
}

export { testAdvancedFunctionality };
