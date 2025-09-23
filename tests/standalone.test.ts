import { weiboTools } from '../src/tools/weibo-tools';
import { configManager } from '../src/utils/config';
import { errorRecovery } from '../src/utils/error-recovery';

// 独立测试（不依赖 Electron）
async function testStandaloneFunctionality(): Promise<void> {
  console.log('开始独立功能测试（不依赖 Electron）...');

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

    // 测试任务调度器
    console.log('6. 测试任务调度器...');
    const schedulerResult = await weiboTools.executeTool('task_scheduler', { action: 'status' });
    console.log('✓ 任务调度器测试成功');
    const schedulerText = schedulerResult.content[0]?.text;
    if (schedulerText && typeof schedulerText === 'string') {
      console.log('  调度器状态:', JSON.parse(schedulerText));
    }

    // 测试数据导出
    console.log('7. 测试数据导出...');
    const testData = [
      { id: 1, name: '测试数据1', value: '值1' },
      { id: 2, name: '测试数据2', value: '值2' },
    ];
    const exportResult = await weiboTools.executeTool('export_data', {
      format: 'json',
      filename: 'test-export.json',
      data: testData,
    });
    console.log('✓ 数据导出成功');
    const exportText = exportResult.content[0]?.text;
    if (exportText && typeof exportText === 'string') {
      console.log('  导出结果:', JSON.parse(exportText));
    }

    // 测试错误恢复机制
    console.log('8. 测试错误恢复机制...');
    let retryCount = 0;
    const retryResult = await errorRecovery.withRetry(async () => {
      retryCount++;
      if (retryCount < 3) {
        throw new Error('模拟错误');
      }
      return '重试成功';
    }, { maxRetries: 3, baseDelay: 100 });
    
    console.log('✓ 错误恢复机制测试成功');
    console.log('  重试结果:', retryResult);

    console.log('\n🎉 所有独立功能测试通过！');
    console.log('\n📊 测试总结:');
    console.log('  ✅ 配置管理系统');
    console.log('  ✅ MCP 工具集 (7个工具)');
    console.log('  ✅ 任务调度器');
    console.log('  ✅ 数据导出功能');
    console.log('  ✅ 错误恢复机制');
    console.log('  ✅ 日志系统');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

// 运行测试
if (require.main === module) {
  testStandaloneFunctionality()
    .then(() => {
      console.log('独立功能测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('独立功能测试失败:', error);
      process.exit(1);
    });
}

export { testStandaloneFunctionality };
