const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

console.log('Starting Electron app test...');

let mainWindow;

function createWindow() {
    console.log('Creating main window...');
    
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // 加载一个简单的HTML页面
    mainWindow.loadURL('data:text/html,<h1>Electron App Test</h1><p>Electron is working!</p>');
    
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    console.log('Main window created successfully');
}

// 测试Electron模块
app.whenReady().then(() => {
    console.log('Electron app is ready');
    console.log('app:', typeof app, app);
    console.log('ipcMain:', typeof ipcMain, ipcMain);
    console.log('BrowserWindow:', typeof BrowserWindow, BrowserWindow);
    
    createWindow();
    
    // 测试我们的MCP服务
    setTimeout(async () => {
        try {
            console.log('\nTesting MCP service in Electron context...');
            
            // 现在在Electron上下文中，应该可以正常导入我们的模块
            const { mcpServer } = require('./dist/mcpserver/server');
            const { weiboTools } = require('./dist/tools/weibo-tools');
            
            console.log('✅ MCP modules loaded successfully');
            
            // 测试工具列表
            const tools = mcpServer.listTools();
            console.log('Available tools:', tools.map(t => t.name));
            
            // 测试搜索功能
            const searchResult = await weiboTools.executeTool('search_posts', {
                keyword: '测试',
                limit: 5
            });
            
            console.log('Search result:', JSON.stringify(searchResult, null, 2));
            
        } catch (error) {
            console.error('❌ MCP service test failed:', error.message);
            console.error('Error details:', error);
        }
    }, 2000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
