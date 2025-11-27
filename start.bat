@echo off
echo 启动微博 MCP 服务...
echo.

REM 检查是否安装了 pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到 pnpm，请先安装 pnpm
    echo 运行: npm install -g pnpm
    pause
    exit /b 1
)

REM 检查是否安装了依赖
if not exist "node_modules" (
    echo 正在安装依赖...
    pnpm install
    if %errorlevel% neq 0 (
        echo 错误: 依赖安装失败
        pause
        exit /b 1
    )
)

REM 检查配置文件
if not exist ".env" (
    echo 正在创建配置文件...
    copy env.example .env
    echo 请编辑 .env 文件配置微博认证信息
    echo.
)

REM 检查是否需要构建
if not exist "dist" (
    echo 正在构建项目...
    pnpm run build
    if %errorlevel% neq 0 (
        echo 错误: 构建失败
        pause
        exit /b 1
    )
)

REM 启动服务（使用Electron环境，才能显示浏览器窗口）
echo 启动 MCP 服务（Electron环境）...
echo 注意: 网页版MCP功能需要Electron环境才能使用浏览器功能
echo.
pnpm run start:electron

pause
