const { weiboTools } = require('./dist/tools/weibo-tools');

async function testRealData() {
  console.log('开始测试真实数据获取...');
  
  try {
    // 测试搜索功能
    console.log('\n1. 测试搜索微博功能:');
    const searchResult = await weiboTools.executeTool('search_posts', {
      keyword: '测试',
      limit: 3
    });
    
    console.log('搜索结果:', JSON.stringify(searchResult, null, 2));
    
    // 测试热搜功能
    console.log('\n2. 测试获取热搜功能:');
    const hotTopicsResult = await weiboTools.executeTool('get_hot_topics', {
      limit: 5
    });
    
    console.log('热搜结果:', JSON.stringify(hotTopicsResult, null, 2));
    
    // 测试任务调度器
    console.log('\n3. 测试任务调度器:');
    const schedulerResult = await weiboTools.executeTool('task_scheduler', {
      action: 'status'
    });
    
    console.log('调度器状态:', JSON.stringify(schedulerResult, null, 2));
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testRealData();
