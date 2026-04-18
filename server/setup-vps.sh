#!/usr/bin/env bash
# ============================================================
# DAS MATAS — Setup inicial do VPS (Hostinger) com Docker
# Execute como root: bash setup-vps.sh
# ============================================================
set -euo pipefail

DEPLOY_USER="deploy"

echo "=== 1. Atualizando sistema ==="
apt update && apt upgrade -y

echo "=== 2. Instalando dependências básicas ==="
apt install -y curl rsync ufw git

echo "=== 3. Instalando Docker ==="
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "Docker instalado."
else
  echo "Docker já está instalado."
fi

echo "=== 4. Instalando Docker Compose plugin ==="
if ! docker compose version &>/dev/null; then
  apt install -y docker-compose-plugin
  echo "Docker Compose plugin instalado."
else
  echo "Docker Compose já disponível."
fi

echo "=== 5. Criando usuário de deploy ==="
if ! id "$DEPLOY_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" $DEPLOY_USER
  usermod -aG docker $DEPLOY_USER
  mkdir -p /home/$DEPLOY_USER/.ssh
  chmod 700 /home/$DEPLOY_USER/.ssh
  touch /home/$DEPLOY_USER/.ssh/authorized_keys
  chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
  chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
  echo "Usuário '$DEPLOY_USER' criado e adicionado ao grupo docker."
  echo "IMPORTANTE: Adicione a chave SSH pública em:"
  echo "  /home/$DEPLOY_USER/.ssh/authorized_keys"
else
  usermod -aG docker $DEPLOY_USER 2>/dev/null || true
  echo "Usuário '$DEPLOY_USER' já existe."
fi

echo "=== 6. Criando estrutura de diretórios ==="
APP_DIR="/home/$DEPLOY_USER/dasmatas"
mkdir -p $APP_DIR/data/staging
mkdir -p $APP_DIR/data/production
mkdir -p $APP_DIR/nginx/conf.d
mkdir -p $APP_DIR/certbot/conf
mkdir -p $APP_DIR/certbot/www
chown -R $DEPLOY_USER:$DEPLOY_USER $APP_DIR

echo "=== 7. Configurando firewall ==="
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "============================================================"
echo "  SETUP CONCLUÍDO"
echo "============================================================"
echo ""
echo "Estrutura criada em $APP_DIR/:"
echo "  data/staging/      → arquivos do frontend staging"
echo "  data/production/   → arquivos do frontend produção"
echo "  nginx/conf.d/      → configs Nginx por site"
echo "  certbot/           → certificados SSL"
echo ""
echo "Próximos passos:"
echo "  1. Adicione a chave SSH pública do GitHub Actions em:"
echo "     /home/$DEPLOY_USER/.ssh/authorized_keys"
echo ""
echo "  2. Copie os arquivos do servidor:"
echo "     scp server/docker-compose.yml deploy@IP:~/dasmatas/"
echo "     scp server/nginx/nginx.conf deploy@IP:~/dasmatas/nginx/"
echo "     scp server/nginx/conf.d/*.conf deploy@IP:~/dasmatas/nginx/conf.d/"
echo ""
echo "  3. Configure o DNS (A records) para o IP deste VPS"
echo ""
echo "  4. Gere os certificados SSL:"
echo "     scp server/init-ssl.sh deploy@IP:~/dasmatas/"
echo "     ssh deploy@IP 'cd ~/dasmatas && bash init-ssl.sh'"
echo ""
echo "  5. Suba os containers:"
echo "     ssh deploy@IP 'cd ~/dasmatas && docker compose up -d'"
echo "============================================================"
