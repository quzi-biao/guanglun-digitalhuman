#!/bin/bash

# 使用 mkcert 生成本地可信的 SSL 证书

echo "检查 mkcert 是否已安装..."

if ! command -v mkcert &> /dev/null
then
    echo "mkcert 未安装，正在安装..."
    brew install mkcert
    brew install nss # 用于 Firefox
fi

echo "安装本地 CA..."
mkcert -install

echo "生成 SSL 证书..."
mkdir -p ssl

# 获取本机 IP
LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)

# 生成证书（包含 localhost 和本机 IP）
mkcert -key-file ssl/key.pem -cert-file ssl/cert.pem localhost 127.0.0.1 ::1 $LOCAL_IP

echo "✓ 可信 SSL 证书已生成到 ssl/ 目录"
echo "  - ssl/key.pem (私钥)"
echo "  - ssl/cert.pem (证书)"
echo ""
echo "本机 IP: $LOCAL_IP"
echo "可以通过以下地址访问："
echo "  - https://localhost:3000"
echo "  - https://$LOCAL_IP:3000"
echo ""
echo "手机端访问 https://$LOCAL_IP:3000 不会有证书警告"
