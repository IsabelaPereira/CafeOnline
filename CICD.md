# CI/CD — Das Matas (VPS Hostinger + Docker)

## Arquitetura

```
┌──────────────────────────────────────────────────────────────────────┐
│  VPS Hostinger (Ubuntu)                                              │
│                                                                      │
│  Docker Compose                                                      │
│  ├── nginx (container)                                               │
│  │   ├── www.dasmatas.com.br      → /var/www/production/ (volume)    │
│  │   ├── staging.dasmatas.com.br  → /var/www/staging/    (volume)    │
│  │   └── n8n.dasmatas.com.br      → proxy → n8n:5678                │
│  │                                                                   │
│  ├── n8n (container)                                                 │
│  │   └── porta 5678 (interna)                                        │
│  │                                                                   │
│  ├── certbot (container)                                             │
│  │   └── renovação automática SSL a cada 12h                         │
│  │                                                                   │
│  └── Volumes                                                         │
│      ├── data/staging/      ← rsync do GitHub Actions (develop)      │
│      ├── data/production/   ← rsync do GitHub Actions (main)         │
│      ├── certbot/conf/      ← certificados Let's Encrypt             │
│      └── n8n_data           ← dados persistentes do n8n              │
│                                                                      │
│  Portas expostas: 80, 443                                            │
└──────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────┐  ┌────────────────────────────────┐
│  Supabase Cloud — STAGING      │  │  Supabase Cloud — PRODUCTION   │
│  (projeto atual)               │  │  (projeto novo)                │
│  ├── PostgreSQL                │  │  ├── PostgreSQL                │
│  ├── Auth                      │  │  ├── Auth                      │
│  ├── Edge Functions            │  │  ├── Edge Functions            │
│  └── Storage                   │  │  └── Storage                   │
└────────────────────────────────┘  └────────────────────────────────┘
```

## Fluxo CI/CD

```
feature/*  ──PR──▸  develop  ──push──▸  GitHub Actions:
                                        ├── lint + typecheck + build
                                        ├── migrations (Supabase staging)
                                        ├── deploy Edge Functions (staging)
                                        └── rsync dist/ → VPS ~/dasmatas/data/staging/

develop  ──PR──▸  main  ──push──▸  GitHub Actions (⚠️ aprovação manual):
                                    ├── lint + typecheck + build
                                    ├── migrations (Supabase production)
                                    ├── deploy Edge Functions (production)
                                    └── rsync dist/ → VPS ~/dasmatas/data/production/
```

| Branch    | Ambiente   | URL                        | Deploy        |
|-----------|------------|----------------------------|---------------|
| `develop` | Staging    | `staging.dasmatas.com.br`  | Automático    |
| `main`    | Production | `www.dasmatas.com.br`      | Com aprovação |

---

## Passo a Passo Completo

### 1. Criar branch `develop`

```bash
git checkout main
git checkout -b develop
git push -u origin develop
```

### 2. Configurar o VPS

#### 2.1. Acessar o VPS

```bash
ssh root@SEU-IP
```

#### 2.2. Executar o setup

```bash
# Do seu computador:
scp server/setup-vps.sh root@SEU-IP:/tmp/

# No VPS:
bash /tmp/setup-vps.sh
```

O script instala: Docker, Docker Compose, rsync, UFW. Cria o usuário `deploy` e a estrutura `~/dasmatas/`.

#### 2.3. Gerar chave SSH para deploys

**No seu computador:**

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/dasmatas_deploy
```

**Copiar para o VPS:**

```bash
ssh-copy-id -i ~/.ssh/dasmatas_deploy.pub deploy@SEU-IP
```

**Testar:**

```bash
ssh -i ~/.ssh/dasmatas_deploy deploy@SEU-IP
```

#### 2.4. Copiar arquivos Docker e Nginx para o VPS

```bash
# Docker Compose
scp server/docker-compose.yml deploy@SEU-IP:~/dasmatas/

# Nginx
scp server/nginx/nginx.conf deploy@SEU-IP:~/dasmatas/nginx/
scp server/nginx/conf.d/*.conf deploy@SEU-IP:~/dasmatas/nginx/conf.d/

# Script de SSL
scp server/init-ssl.sh deploy@SEU-IP:~/dasmatas/
```

#### 2.5. Configurar DNS

No painel do domínio, crie registros A:

| Tipo | Nome    | Valor           |
|------|---------|-----------------|
| A    | @       | `IP-DO-VPS`     |
| A    | www     | `IP-DO-VPS`     |
| A    | staging | `IP-DO-VPS`     |
| A    | n8n     | `IP-DO-VPS`     |

Aguarde propagação (minutos a horas).

#### 2.6. Gerar certificados SSL

```bash
ssh deploy@SEU-IP
cd ~/dasmatas
bash init-ssl.sh
```

O script:
1. Sobe Nginx temporário (HTTP only)
2. Gera certificados para os 3 subdomínios via Certbot
3. Restaura configs com SSL
4. Sobe todos os containers

#### 2.7. Verificar

```bash
# No VPS:
docker compose ps    # Todos os containers devem estar "Up"
docker compose logs  # Verificar se não há erros
```

### 3. Criar projeto Supabase de PRODUÇÃO

O projeto atual vira **staging**. Crie outro para produção:

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Nomeie como `dasmatas-production`
3. Mesma região
4. Senha forte para o banco

Anote:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`
- **Project Ref** → `SUPABASE_PROJECT_REF`
- **DB Password** → `SUPABASE_DB_PASSWORD`

#### 3.1. Aplicar migrations na produção

```bash
supabase link --project-ref <REF-PRODUCTION>
supabase db push
supabase link --project-ref <REF-STAGING>   # voltar ao staging
```

#### 3.2. Secrets das Edge Functions

```bash
# Produção (chaves LIVE)
supabase secrets set STRIPE_SECRET_KEY=sk_live_... --project-ref <REF-PRODUCTION>
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref <REF-PRODUCTION>

# Staging (chaves TEST)
supabase secrets set STRIPE_SECRET_KEY=sk_test_... --project-ref <REF-STAGING>
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref <REF-STAGING>
```

### 4. Gerar Supabase Access Token

1. [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Crie um token → `SUPABASE_ACCESS_TOKEN`

### 5. Configurar GitHub Environments + Secrets

**Settings → Environments** no repositório.

#### Environment: `staging`

| Secret                   | Valor                                |
|--------------------------|--------------------------------------|
| `VITE_SUPABASE_URL`     | URL Supabase **staging**             |
| `VITE_SUPABASE_ANON_KEY`| Anon key **staging**                 |
| `SUPABASE_ACCESS_TOKEN`  | Token da conta                      |
| `SUPABASE_PROJECT_REF`  | Ref **staging**                      |
| `SUPABASE_DB_PASSWORD`  | Senha banco **staging**              |
| `VPS_HOST`              | IP do VPS                            |
| `VPS_SSH_PORT`          | `22`                                 |
| `VPS_USER`              | `deploy`                             |
| `VPS_SSH_KEY`           | Conteúdo de `~/.ssh/dasmatas_deploy` |

#### Environment: `production`

1. Marque **Required reviewers** → adicione aprovadores
2. Mesmos secrets, valores de **produção**:

| Secret                   | Valor                                |
|--------------------------|--------------------------------------|
| `VITE_SUPABASE_URL`     | URL Supabase **production**          |
| `VITE_SUPABASE_ANON_KEY`| Anon key **production**              |
| `SUPABASE_ACCESS_TOKEN`  | Mesmo token                         |
| `SUPABASE_PROJECT_REF`  | Ref **production**                   |
| `SUPABASE_DB_PASSWORD`  | Senha banco **production**           |
| `VPS_HOST`              | Mesmo IP                             |
| `VPS_SSH_PORT`          | `22`                                 |
| `VPS_USER`              | `deploy`                             |
| `VPS_SSH_KEY`           | Mesma chave                          |

> Para copiar a chave privada: `cat ~/.ssh/dasmatas_deploy` — cole **tudo** (incluindo BEGIN/END).

### 6. Proteção de branches

Em **Settings → Branches**:

**`main`:** Require PR + 1 approval + status checks
**`develop`:** Require PR + status checks

---

## Gerenciamento do Docker no VPS

```bash
ssh deploy@SEU-IP
cd ~/dasmatas

# Status dos containers
docker compose ps

# Logs em tempo real
docker compose logs -f

# Logs de um serviço específico
docker compose logs -f nginx
docker compose logs -f n8n

# Reiniciar tudo
docker compose restart

# Reiniciar só o nginx (após mudar config)
docker compose restart nginx

# Parar tudo
docker compose down

# Subir tudo
docker compose up -d

# Atualizar imagens
docker compose pull && docker compose up -d
```

## Habilitar/desabilitar o n8n

O n8n já está configurado e sobe junto com os outros containers. Se quiser desabilitá-lo temporariamente:

1. Edite `docker-compose.yml` no VPS
2. Descomente as linhas `profiles: ["n8n"]` no serviço n8n
3. `docker compose up -d` — o n8n não subirá mais
4. Para subir manualmente: `docker compose --profile n8n up -d`

---

## Arquivos do repositório

```
.github/workflows/
  deploy-staging.yml                # CI/CD develop → VPS staging
  deploy-production.yml             # CI/CD main → VPS production (aprovação)
server/
  docker-compose.yml                # Nginx + Certbot + n8n
  setup-vps.sh                      # Setup inicial do VPS (Docker, user, dirs)
  init-ssl.sh                       # Geração dos certificados SSL
  nginx/
    nginx.conf                      # Config principal do Nginx
    conf.d/
      production.conf               # www.dasmatas.com.br
      staging.conf                  # staging.dasmatas.com.br
      n8n.conf                      # n8n.dasmatas.com.br (reverse proxy)
scripts/
  deploy-functions.sh               # Deploy de Edge Functions
```

## Estrutura no VPS

```
/home/deploy/dasmatas/
  docker-compose.yml
  nginx/
    nginx.conf
    conf.d/
      production.conf
      staging.conf
      n8n.conf
  data/
    staging/          ← GitHub Actions rsync (develop)
    production/       ← GitHub Actions rsync (main)
  certbot/
    conf/             ← Certificados Let's Encrypt
    www/              ← Challenge files
```
