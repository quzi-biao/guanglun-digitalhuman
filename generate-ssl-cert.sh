#!/bin/bash

# 使用 mkcert 生成本地可信的 SSL 证书

echo "检查 mkcert 是否已安装..."

if ! command -v mkcert &> /dev/null
then
    echo "mkcert 未安装，正在安装..."
    
    # 检测操作系统
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install mkcert
            brew install nss # 用于 Firefox
        else
            echo "错误: 未找到 Homebrew，请先安装 Homebrew"
            echo "访问: https://brew.sh"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            # Debian/Ubuntu
            sudo apt-get update
            sudo apt-get install -y libnss3-tools
            curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
            chmod +x mkcert-v*-linux-amd64
            sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            sudo yum install -y nss-tools
            curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
            chmod +x mkcert-v*-linux-amd64
            sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
        else
            echo "错误: 不支持的 Linux 发行版"
            exit 1
        fi
    else
        echo "错误: 不支持的操作系统"
        exit 1
    fi
    
    echo "✓ mkcert 安装完成"
fi

echo "安装本地 CA..."
mkcert -install

echo "生成 SSL 证书..."
mkdir -p ssl

# 获取本机 IP
LOCAL_IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1 2>/dev/null || echo "")

# 构建证书域名/IP 列表
CERT_HOSTS="localhost 127.0.0.1 ::1"
if [ ! -z "$LOCAL_IP" ]; then
    CERT_HOSTS="${CERT_HOSTS} ${LOCAL_IP}"
fi
if [ ! -z "$SERVER_HOST" ]; then
    CERT_HOSTS="${CERT_HOSTS} ${SERVER_HOST}"
fi

# 生成证书
mkcert -key-file ssl/key.pem -cert-file ssl/cert.pem $CERT_HOSTS

echo ""
echo "✓ 可信 SSL 证书已生成到 ssl/ 目录"
echo "  - ssl/key.pem (私钥)"
echo "  - ssl/cert.pem (证书)"
echo ""
echo "证书包含以下域名/IP:"
echo "  - localhost"
echo "  - 127.0.0.1"
if [ ! -z "$LOCAL_IP" ]; then
    echo "  - $LOCAL_IP (本机 IP)"
fi
if [ ! -z "$SERVER_HOST" ]; then
    echo "  - $SERVER_HOST (服务器地址)"
fi
echo ""
echo "✓ 本地浏览器不会显示证书警告"
echo ""
echo "手机访问需要安装 mkcert CA 证书:"
echo "  1. 查看 CA 证书位置: mkcert -CAROOT"
echo "  2. 将 rootCA.pem 传输到手机并安装"
