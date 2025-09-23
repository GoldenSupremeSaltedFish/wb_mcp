#!/bin/bash

echo "微博 MCP 服务部署脚本"
echo "========================"

echo "1. 清理旧的构建文件..."
rm -rf dist
rm -rf dist-electron

echo "2. 安装依赖..."
pnpm install

echo "3. 编译 TypeScript..."
pnpm run build

echo "4. 运行测试..."
pnpm run test

echo "5. 构建 Electron 应用..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    pnpm run build:mac
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    pnpm run build:linux
else
    pnpm run build:win
fi

echo "6. 部署完成！"
echo "构建文件位于: dist-electron/"
echo "安装包位于: dist-electron/"

chmod +x scripts/deploy.sh
