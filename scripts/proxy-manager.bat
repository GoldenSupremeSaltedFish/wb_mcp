@echo off
echo 代理管理工具
echo =============

:menu
echo.
echo 请选择操作：
echo 1. 启用代理 (127.0.0.1:7897)
echo 2. 禁用代理
echo 3. 查看当前代理设置
echo 4. 测试代理连接
echo 5. 退出
echo.
set /p choice=请输入选择 (1-5): 

if "%choice%"=="1" goto enable_proxy
if "%choice%"=="2" goto disable_proxy
if "%choice%"=="3" goto show_proxy
if "%choice%"=="4" goto test_proxy
if "%choice%"=="5" goto exit
goto menu

:enable_proxy
echo 正在启用代理...
setx HTTP_PROXY http://127.0.0.1:7897
setx HTTPS_PROXY http://127.0.0.1:7897
set HTTP_PROXY=http://127.0.0.1:7897
set HTTPS_PROXY=http://127.0.0.1:7897
echo ✓ 代理已启用
goto menu

:disable_proxy
echo 正在禁用代理...
setx HTTP_PROXY ""
setx HTTPS_PROXY ""
set HTTP_PROXY=
set HTTPS_PROXY=
echo ✓ 代理已禁用
goto menu

:show_proxy
echo 当前代理设置：
echo HTTP_PROXY: %HTTP_PROXY%
echo HTTPS_PROXY: %HTTPS_PROXY%
goto menu

:test_proxy
echo 测试代理连接...
curl -I --proxy http://127.0.0.1:7897 https://www.google.com
if %errorlevel%==0 (
    echo ✓ 代理连接正常
) else (
    echo ✗ 代理连接失败
)
goto menu

:exit
echo 退出代理管理工具
pause
