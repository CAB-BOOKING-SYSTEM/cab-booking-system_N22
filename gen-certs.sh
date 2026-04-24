#!/bin/bash

# 1. Tạo thư mục chứa chứng chỉ
mkdir -p shared-certs
cd shared-certs

echo "🚀 Đang tạo Internal Root CA (Cục quản lý chứng minh thư)..."
# Tạo Private Key cho CA
openssl genrsa -out ca-root.key 2048
# Tạo file Chứng chỉ CA (Có giá trị 10 năm)
openssl req -x509 -new -nodes -key ca-root.key -sha256 -days 3650 -out ca-root.pem -subj "/C=VN/ST=HCM/L=HCM/O=SmileCorp/CN=SmileEdu-Internal-CA"

echo "✅ Đã tạo xong CA!"

# Hàm tạo chứng chỉ cho từng service
generate_cert() {
  SERVICE_NAME=$1
  echo "----------------------------------------"
  echo "🔐 Đang tạo Certificate cho: $SERVICE_NAME"
  
  # 1. Tạo Private Key cho Service
  openssl genrsa -out ${SERVICE_NAME}-key.pem 2048
  
  # 2. Tạo Certificate Signing Request (CSR)
  openssl req -new -key ${SERVICE_NAME}-key.pem -out ${SERVICE_NAME}.csr -subj "/C=VN/ST=HCM/L=HCM/O=SmileCorp/CN=${SERVICE_NAME}"
  
  # 3. Tạo file cấu hình SAN (Bắt buộc phải có để Node.js không báo lỗi Hostname trong Docker)
  cat > ${SERVICE_NAME}.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names
[alt_names]
DNS.1 = ${SERVICE_NAME}
DNS.2 = localhost
EOF

  # 4. Dùng CA Root để ký xác nhận cho Service Cert (Có giá trị 1 năm)
  openssl x509 -req -in ${SERVICE_NAME}.csr -CA ca-root.pem -CAkey ca-root.key -CAcreateserial -out ${SERVICE_NAME}-cert.pem -days 365 -sha256 -extfile ${SERVICE_NAME}.ext
  
  # 5. Dọn dẹp file rác
  rm ${SERVICE_NAME}.csr ${SERVICE_NAME}.ext
  echo "✅ Hoàn tất cho $SERVICE_NAME"
}

# Gọi hàm để tạo cho các service của bạn
# QUAN TRỌNG: Tên ở đây phải khớp 100% với tên service trong docker-compose.yml
# Cấp chứng chỉ cho Gateway
generate_cert "gateway"
generate_cert "auth-service"
generate_cert "user-service"
generate_cert "ride-service"
generate_cert "driver-service"
generate_cert "booking-service"
generate_cert "matching-service"
generate_cert "pricing-service"
generate_cert "payment-service"
generate_cert "review-service"
generate_cert "notification-service"
# Xóa file tracking của openssl
rm -f ca-root.srl

echo "----------------------------------------"
echo "🎉 XONG! Toàn bộ chứng chỉ đã được lưu trong thư mục ./shared-certs"