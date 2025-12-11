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
    echo "该 Key 用于 AI 对话、TTS 语音合成和 ASR 语音识别功能"
    exit 1
fi

# 检查 NLS Appkey
if [ -z "$VITE_NLS_APPKEY" ]; then
    echo -e "${YELLOW}警告: VITE_NLS_APPKEY 未配置${NC}"
    echo "语音识别功能需要配置 NLS Appkey"
fi

# 检查 HTTPS 配置
if [ "$USE_HTTPS" = "true" ]; then
    echo -e "${YELLOW}检查 HTTPS 配置...${NC}"
    if [ ! -d "ssl" ] || [ ! -f "ssl/key.pem" ] || [ ! -f "ssl/cert.pem" ]; then
        echo -e "${RED}错误: HTTPS 已启用但 SSL 证书不存在${NC}"
        echo "请运行以下命令生成证书:"
        echo "  chmod +x generate-ssl-cert.sh && ./generate-ssl-cert.sh"
        echo "或者在 .env 中设置 USE_HTTPS=false"
        exit 1
    fi
    echo -e "${GREEN}✓ SSL 证书已找到${NC}"
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

# 根据 HTTPS 配置检查后端
if [ "$USE_HTTPS" = "true" ]; then
    backend_health=$(docker-compose exec -T backend wget --no-check-certificate -q -O - https://localhost:3001/health 2>/dev/null || echo "failed")
else
    backend_health=$(docker-compose exec -T backend wget -q -O - http://localhost:3001/health 2>/dev/null || echo "failed")
fi

# 前端始终检查 HTTP（Nginx 同时监听两个端口）
frontend_health=$(docker-compose exec -T frontend curl -f http://localhost/health 2>/dev/null || echo "failed")

if [[ $backend_health == *"ok"* ]]; then
    echo -e "${GREEN}✓ 后端服务健康${NC}"
else
    echo -e "${RED}✗ 后端服务异常${NC}"
    echo -e "${YELLOW}  提示: 检查容器日志 docker-compose logs backend${NC}"
fi

if [[ $frontend_health == *"healthy"* ]]; then
    echo -e "${GREEN}✓ 前端服务健康${NC}"
else
    echo -e "${RED}✗ 前端服务异常${NC}"
    echo -e "${YELLOW}  提示: 检查容器日志 docker-compose logs frontend${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}部署完成！${NC}"
echo "=========================================="

# 根据 HTTPS 配置显示访问地址
if [ "$USE_HTTPS" = "true" ]; then
    echo "前端访问地址: https://localhost"
    echo "后端 API 地址: https://localhost:8089"
    echo ""
    echo -e "${YELLOW}注意: 使用自签名证书时，浏览器会显示安全警告${NC}"
    echo "请点击'高级' -> '继续访问'以使用应用"
    echo ""
    echo "手机访问: 使用本机 IP 地址"
    echo "  1. 查看本机 IP: ifconfig | grep 'inet '"
    echo "  2. 访问: https://YOUR_IP"
else
    echo "前端访问地址: http://localhost"
    echo "后端 API 地址: http://localhost:8089"
    echo ""
    echo -e "${YELLOW}注意: 语音输入功能需要 HTTPS${NC}"
    echo "如需使用语音输入，请:"
    echo "  1. 运行: ./generate-ssl-cert.sh"
    echo "  2. 在 .env 中设置 USE_HTTPS=true"
    echo "  3. 重新部署: ./deploy.sh"
fi

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
