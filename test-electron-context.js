// 测试Electron模块导入
console.log('Testing Electron module import...');

try {
    // 方法1: 直接require
    const electron1 = require('electron');
    console.log('Method 1 - Direct require:', typeof electron1, electron1);
    
    // 方法2: 解构导入
    const { app, ipcMain, BrowserWindow } = require('electron');
    console.log('Method 2 - Destructured import:');
    console.log('  app:', typeof app, app);
    console.log('  ipcMain:', typeof ipcMain, ipcMain);
    console.log('  BrowserWindow:', typeof BrowserWindow, BrowserWindow);
    
    // 方法3: 检查是否是字符串路径
    if (typeof electron1 === 'string') {
        console.log('Electron is a string path:', electron1);
        console.log('This means we need to run in Electron context');
    }
    
} catch (error) {
    console.error('Error importing Electron:', error.message);
}

// 测试在Electron上下文中运行
console.log('\nTesting Electron context...');
const { spawn } = require('child_process');
const electronPath = require('electron');

console.log('Electron path:', electronPath);

// 创建一个简单的Electron应用来测试模块
const electronApp = spawn(electronPath, ['--version']);
electronApp.stdout.on('data', (data) => {
    console.log('Electron version:', data.toString().trim());
});

electronApp.on('close', (code) => {
    console.log('Electron process exited with code:', code);
});
