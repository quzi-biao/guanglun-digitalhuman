#!/bin/bash

# 数智人对话系统 Docker 部署脚本

set -e

echo "=========================================="
echo "数智人对话系统 Docker 部署"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${RED}错误: .env 文件不存在${NC}"
    echo "请先复制 .env.example 为 .env 并配置 API Keys"
    echo "运行: cp .env.example .env"
    exit 1
fi

# 检查必要的环境变量
source .env
if [ -z "$VITE_DASHSCOPE_API_KEY" ] || [ "$VITE_DASHSCOPE_API_KEY" = "your-dashscope-api-key-here" ]; then
    echo -e "${RED}错误: VITE_DASHSCOPE_API_KEY 未配置${NC}"
    echo "请在 .env 文件中配置阿里云 DashScope API Key"
    exit 1
fi

if [ -z "$VITE_OPENROUTER_API_KEY" ] || [ "$VITE_OPENROUTER_API_KEY" = "your-openrouter-api-key-here" ]; then
    echo -e "${YELLOW}警告: VITE_OPENROUTER_API_KEY 未配置${NC}"
    echo "AI 对话功能将无法使用"
fi

# 停止并删除旧容器
echo -e "${YELLOW}停止旧容器...${NC}"
docker-compose down

# 构建镜像
echo -e "${YELLOW}构建 Docker 镜像...${NC}"
docker-compose build --no-cache

# 启动服务
echo -e "${YELLOW}启动服务...${NC}"
docker-compose up -d

# 等待服务启动
echo -e "${YELLOW}等待服务启动...${NC}"
sleep 5

# 检查服务状态
echo -e "${YELLOW}检查服务状态...${NC}"
docker-compose ps

# 健康检查
echo -e "${YELLOW}执行健康检查...${NC}"
backend_health=$(docker-compose exec -T backend wget -q -O - http://localhost:3001/health 2>/dev/null || echo "failed")
frontend_health=$(docker-compose exec -T frontend wget -q -O - http://localhost/health 2>/dev/null || echo "failed")

if [[ $backend_health == *"ok"* ]]; then
    echo -e "${GREEN}✓ 后端服务健康${NC}"
else
    echo -e "${RED}✗ 后端服务异常${NC}"
fi

if [[ $frontend_health == *"healthy"* ]]; then
    echo -e "${GREEN}✓ 前端服务健康${NC}"
else
    echo -e "${RED}✗ 前端服务异常${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}部署完成！${NC}"
echo "=========================================="
echo "前端访问地址: http://localhost"
echo "后端 API 地址: http://localhost:8089"
echo ""
echo "查看日志:"
echo "  docker-compose logs -f"
echo ""
echo "停止服务:"
echo "  docker-compose down"
echo ""
echo "重启服务:"
echo "  docker-compose restart"
echo "=========================================="
