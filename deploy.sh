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
        echo -e "${YELLOW}SSL 证书不存在，正在自动生成...${NC}"
        
        # 检查是否有 mkcert
        if command -v mkcert &> /dev/null; then
            echo "使用 mkcert 生成可信证书..."
            chmod +x generate-trusted-cert.sh 2>/dev/null || true
            ./generate-trusted-cert.sh
        else
            echo "使用 openssl 生成自签名证书..."
            chmod +x generate-ssl-cert.sh 2>/dev/null || true
            ./generate-ssl-cert.sh
        fi
        
        # 再次检查证书是否生成成功
        if [ ! -f "ssl/key.pem" ] || [ ! -f "ssl/cert.pem" ]; then
            echo -e "${RED}错误: SSL 证书生成失败${NC}"
            echo "请手动运行以下命令生成证书:"
            echo "  ./generate-ssl-cert.sh"
            echo "或者在 .env 中设置 USE_HTTPS=false"
            exit 1
        fi
        
        echo -e "${GREEN}✓ SSL 证书已生成${NC}"
    else
        echo -e "${GREEN}✓ SSL 证书已找到${NC}"
    fi
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
    # 确定显示的主机地址
    if [ ! -z "$SERVER_HOST" ]; then
        DISPLAY_HOST="$SERVER_HOST"
        echo "前端访问地址: https://${DISPLAY_HOST}"
        echo "后端 API 地址: https://${DISPLAY_HOST}:8089"
    else
        DISPLAY_HOST="localhost"
        echo "前端访问地址: https://localhost"
        echo "后端 API 地址: https://localhost:8089"
    fi
    echo ""
    
    # 检查是否使用 mkcert 生成的证书
    if [ -f "ssl/cert.pem" ]; then
        cert_issuer=$(openssl x509 -in ssl/cert.pem -noout -issuer 2>/dev/null || echo "")
        if [[ $cert_issuer == *"mkcert"* ]]; then
            echo -e "${GREEN}✓ 使用 mkcert 本地信任证书${NC}"
            if [ -z "$SERVER_HOST" ]; then
                echo "  本地访问不会显示警告"
            else
                echo -e "${YELLOW}  注意: 远程访问需要在浏览器中接受证书${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ 使用自签名证书，浏览器会显示安全警告${NC}"
            echo "  解决方法："
            echo "  1. 点击'高级' -> '继续访问'"
            echo "  2. 或使用 mkcert 生成受信任证书: ./generate-trusted-cert.sh"
        fi
    fi
    
    # 如果没有配置 SERVER_HOST，显示本地 IP
    if [ -z "$SERVER_HOST" ]; then
        echo ""
        echo "手机访问:"
        # 自动获取本机 IP
        LOCAL_IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)
        if [ ! -z "$LOCAL_IP" ]; then
            echo "  访问地址: https://${LOCAL_IP}"
            echo -e "${YELLOW}  注意: 手机需要安装 mkcert CA 证书或接受证书警告${NC}"
        else
            echo "  1. 查看本机 IP: ifconfig | grep 'inet '"
            echo "  2. 访问: https://YOUR_IP"
        fi
    fi
else
    # 确定显示的主机地址
    if [ ! -z "$SERVER_HOST" ]; then
        echo "前端访问地址: http://${SERVER_HOST}"
        echo "后端 API 地址: http://${SERVER_HOST}:8089"
    else
        echo "前端访问地址: http://localhost"
        echo "后端 API 地址: http://localhost:8089"
    fi
    echo ""
    echo -e "${YELLOW}⚠ 语音输入功能需要 HTTPS${NC}"
    echo "  启用 HTTPS 步骤："
    echo "  1. 生成证书: ./generate-trusted-cert.sh"
    echo "  2. 配置 .env: USE_HTTPS=true"
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
