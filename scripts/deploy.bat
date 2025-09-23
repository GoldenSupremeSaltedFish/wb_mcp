@echo off
echo 微博 MCP 服务部署脚本
echo ========================

echo 1. 清理旧的构建文件...
if exist dist rmdir /s /q dist
if exist dist-electron rmdir /s /q dist-electron

echo 2. 安装依赖...
pnpm install

echo 3. 编译 TypeScript...
pnpm run build

echo 4. 运行测试...
pnpm run test

echo 5. 构建 Electron 应用...
pnpm run build:win

echo 6. 部署完成！
echo 构建文件位于: dist-electron/
echo 安装包位于: dist-electron/win-unpacked/

pause
