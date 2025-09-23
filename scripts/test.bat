@echo off
echo ========================================
echo 微博 MCP 集成测试
echo ========================================

echo.
echo 1. 清理之前的测试结果...
if exist coverage rmdir /s /q coverage
if exist test-results rmdir /s /q test-results

echo.
echo 2. 运行集成测试...
pnpm test -- --coverage --testResultsProcessor=jest-junit

echo.
echo 3. 生成测试报告...
if exist coverage\lcov-report\index.html (
    echo 覆盖率报告已生成: coverage\lcov-report\index.html
    start coverage\lcov-report\index.html
)

if exist test-results\junit.xml (
    echo JUnit报告已生成: test-results\junit.xml
)

echo.
echo 4. 测试完成！
echo 查看详细结果:
echo - 覆盖率报告: coverage\lcov-report\index.html
echo - 测试结果: test-results\junit.xml
echo - 控制台输出: 见上方

pause
