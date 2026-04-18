#!/usr/bin/env bash
# ============================================================
# DAS MATAS — Gerar certificados SSL com Certbot + Docker
# Execute no VPS: cd ~/dasmatas && bash init-ssl.sh
# ============================================================
set -euo pipefail

DOMAIN="dasmatas.com.br"
EMAIL="contato@dasmatas.com.br"

echo "=== Gerando certificados SSL ==="
echo ""
echo "ATENÇÃO: O DNS deve estar apontando para este servidor antes de continuar."
echo "Domínios que serão certificados:"
echo "  - $DOMAIN"
echo "  - www.$DOMAIN"
echo "  - staging.$DOMAIN"
echo "  - n8n.$DOMAIN"
echo ""
read -p "O DNS já está configurado? (s/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "Configure o DNS primeiro e rode este script novamente."
  exit 1
fi

# 1. Criar configs temporárias sem SSL para o challenge funcionar
echo "=== Criando config Nginx temporária (HTTP only) ==="
cat > nginx/conf.d/temp-certbot.conf << 'NGINX'
server {
    listen 80;
    server_name dasmatas.com.br www.dasmatas.com.br staging.dasmatas.com.br n8n.dasmatas.com.br;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'SSL em configuracao...';
        add_header Content-Type text/plain;
    }
}
NGINX

# Temporariamente renomear configs SSL que referenciam certs que ainda não existem
for f in nginx/conf.d/production.conf nginx/conf.d/staging.conf nginx/conf.d/n8n.conf; do
  if [ -f "$f" ]; then
    mv "$f" "${f}.disabled"
  fi
done

# 2. Subir Nginx temporário
echo "=== Subindo Nginx temporário ==="
docker compose up -d nginx

# Aguardar Nginx estar pronto
sleep 3

# 3. Gerar certificados
echo "=== Gerando certificado para $DOMAIN e www.$DOMAIN ==="
docker compose run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email $EMAIL --agree-tos --no-eff-email \
  -d $DOMAIN -d www.$DOMAIN

echo "=== Gerando certificado para staging.$DOMAIN ==="
docker compose run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email $EMAIL --agree-tos --no-eff-email \
  -d staging.$DOMAIN

echo "=== Gerando certificado para n8n.$DOMAIN ==="
docker compose run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email $EMAIL --agree-tos --no-eff-email \
  -d n8n.$DOMAIN

# 4. Restaurar configs reais
echo "=== Restaurando configurações Nginx ==="
rm -f nginx/conf.d/temp-certbot.conf

for f in nginx/conf.d/production.conf.disabled nginx/conf.d/staging.conf.disabled nginx/conf.d/n8n.conf.disabled; do
  if [ -f "$f" ]; then
    mv "$f" "${f%.disabled}"
  fi
done

# 5. Reiniciar com configs SSL
echo "=== Reiniciando com SSL ==="
docker compose down
docker compose up -d

echo ""
echo "============================================================"
echo "  SSL CONFIGURADO COM SUCESSO"
echo "============================================================"
echo ""
echo "Sites ativos:"
echo "  https://www.$DOMAIN        (produção)"
echo "  https://staging.$DOMAIN    (staging)"
echo "  https://n8n.$DOMAIN        (n8n)"
echo ""
echo "Renovação automática: o container certbot renova a cada 12h."
echo "============================================================"
