$certsDir = "shared-certs"
if (!(Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir
}
Set-Location $certsDir

Write-Host "Creating Internal Root CA..."
if (!(Test-Path "ca-root.key")) {
    openssl genrsa -out ca-root.key 2048
}
openssl req -x509 -new -nodes -key ca-root.key -sha256 -days 3650 -out ca-root.pem -subj "/C=VN/ST=HCM/L=HCM/O=SmileCorp/CN=SmileEdu-Internal-CA"

$services = @("gateway", "auth-service", "user-service", "ride-service", "driver-service", "booking-service", "matching-service", "pricing-service", "payment-service", "review-service", "notification-service")

foreach ($service in $services) {
    Write-Host "----------------------------------------"
    Write-Host "Creating Certificate for: $service"
    
    $keyFile = "$service-key.pem"
    if (!(Test-Path $keyFile)) {
        openssl genrsa -out $keyFile 2048
    }
    
    $csrFile = "$service.csr"
    openssl req -new -key $keyFile -out $csrFile -subj "/C=VN/ST=HCM/L=HCM/O=SmileCorp/CN=$service"
    
    $extFile = "$service.ext"
    $sanConfig = "authorityKeyIdentifier=keyid,issuer`nbasicConstraints=CA:FALSE`nkeyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment`nsubjectAltName = @alt_names`n[alt_names]`nDNS.1 = $service`nDNS.2 = localhost"
    $sanConfig | Out-File -FilePath $extFile -Encoding ascii
    
    $certFile = "$service-cert.pem"
    openssl x509 -req -in $csrFile -CA ca-root.pem -CAkey ca-root.key -CAcreateserial -out $certFile -days 365 -sha256 -extfile $extFile
    
    Remove-Item $csrFile
    Remove-Item $extFile
}

if (Test-Path "ca-root.srl") {
    Remove-Item "ca-root.srl"
}

Write-Host "----------------------------------------"
Write-Host "DONE! Certificates generated in $certsDir"
