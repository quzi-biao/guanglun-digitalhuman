#!/bin/bash

# 使用 openssl 生成自签名 SSL 证书

echo "生成自签名 SSL 证书..."
mkdir -p ssl

# 获取本机 IP
LOCAL_IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)

# 准备 SAN 配置
SAN="DNS:localhost,IP:127.0.0.1"
if [ ! -z "$LOCAL_IP" ]; then
    SAN="${SAN},IP:${LOCAL_IP}"
fi
if [ ! -z "$SERVER_HOST" ]; then
    # 判断是 IP 还是域名
    if [[ $SERVER_HOST =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        SAN="${SAN},IP:${SERVER_HOST}"
    else
        SAN="${SAN},DNS:${SERVER_HOST}"
    fi
fi

# 生成私钥
openssl genrsa -out ssl/key.pem 2048

# 生成证书签名请求（CSR）和自签名证书
openssl req -new -x509 -key ssl/key.pem -out ssl/cert.pem -days 365 \
    -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost" \
    -addext "subjectAltName=${SAN}"

echo "✓ 自签名 SSL 证书已生成到 ssl/ 目录"
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
echo -e "\033[1;33m注意: 这是自签名证书，浏览器会显示安全警告\033[0m"
echo "如需避免警告，请使用 mkcert 生成可信证书:"
echo "  ./generate-trusted-cert.sh"
