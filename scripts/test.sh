#!/bin/bash

echo "========================================"
echo "微博 MCP 集成测试"
echo "========================================"

echo ""
echo "1. 清理之前的测试结果..."
rm -rf coverage test-results

echo ""
echo "2. 运行集成测试..."
pnpm test -- --coverage --testResultsProcessor=jest-junit

echo ""
echo "3. 生成测试报告..."
if [ -f "coverage/lcov-report/index.html" ]; then
    echo "覆盖率报告已生成: coverage/lcov-report/index.html"
    if command -v open >/dev/null 2>&1; then
        open coverage/lcov-report/index.html
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open coverage/lcov-report/index.html
    fi
fi

if [ -f "test-results/junit.xml" ]; then
    echo "JUnit报告已生成: test-results/junit.xml"
fi

echo ""
echo "4. 测试完成！"
echo "查看详细结果:"
echo "- 覆盖率报告: coverage/lcov-report/index.html"
echo "- 测试结果: test-results/junit.xml"
echo "- 控制台输出: 见上方"
