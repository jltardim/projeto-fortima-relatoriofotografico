#!/bin/bash
set -e

echo "========================================="
echo " Deploy - Relatorio de Fotos de Obras"
echo "========================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Verificar se Docker esta instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker nao encontrado. Instale primeiro.${NC}"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Docker Compose nao encontrado. Instale primeiro.${NC}"
    exit 1
fi

echo -e "${GREEN}Docker OK${NC}"

# 2. Verificar .env.production
if [ ! -f .env.production ]; then
    echo -e "${RED}.env.production nao encontrado!${NC}"
    echo "Copie e preencha: cp .env.production.example .env.production"
    exit 1
fi

# Verificar se tem valores TROCAR
if grep -q "TROCAR" .env.production; then
    echo -e "${YELLOW}ATENCAO: .env.production ainda tem valores para TROCAR${NC}"
    grep "TROCAR" .env.production
    echo ""
    read -p "Continuar mesmo assim? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# 3. Descobrir rede do Chatwoot
echo ""
echo -e "${YELLOW}Procurando rede Docker do Chatwoot...${NC}"
CHATWOOT_NETWORK=$(docker network ls --format '{{.Name}}' | grep -i chatwoot | head -1)

if [ -n "$CHATWOOT_NETWORK" ]; then
    echo -e "${GREEN}Rede do Chatwoot encontrada: $CHATWOOT_NETWORK${NC}"
    echo ""
    echo "Para conectar na rede do Chatwoot, descomente as linhas de 'networks'"
    echo "no docker-compose.yml e use: $CHATWOOT_NETWORK"
else
    echo -e "${YELLOW}Nenhuma rede do Chatwoot encontrada.${NC}"
    echo "Se o Chatwoot roda em Docker, descubra a rede com: docker network ls"
fi

# 4. Descobrir host do banco Chatwoot
echo ""
echo -e "${YELLOW}Procurando container PostgreSQL do Chatwoot...${NC}"
CW_PG_CONTAINER=$(docker ps --format '{{.Names}}' | grep -iE 'chatwoot.*postgres|postgres.*chatwoot' | head -1)

if [ -n "$CW_PG_CONTAINER" ]; then
    CW_PG_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$CW_PG_CONTAINER")
    echo -e "${GREEN}Container PostgreSQL do Chatwoot: $CW_PG_CONTAINER (IP: $CW_PG_IP)${NC}"
    echo "Use este IP como CHATWOOT_DB_HOST no .env.production"
    echo "Ou, se conectar na mesma rede Docker, use o nome do container: $CW_PG_CONTAINER"
else
    echo -e "${YELLOW}Container PostgreSQL do Chatwoot nao encontrado automaticamente.${NC}"
    echo "Descubra com: docker ps | grep postgres"
fi

# 5. Build e start
echo ""
echo -e "${YELLOW}Construindo e iniciando...${NC}"
docker compose --env-file .env.production up -d --build

# 6. Aguardar o banco ficar pronto
echo ""
echo -e "${YELLOW}Aguardando banco de dados...${NC}"
sleep 5

# 7. Rodar migrations
echo -e "${YELLOW}Aplicando schema no banco...${NC}"
docker compose exec app npx prisma db push --accept-data-loss 2>/dev/null || \
docker compose --env-file .env.production exec app npx prisma db push 2>/dev/null || \
echo -e "${YELLOW}Migration via exec falhou. Rodando via docker run...${NC}" && \
docker compose --env-file .env.production run --rm app npx prisma db push

# 8. Rodar seed
echo -e "${YELLOW}Criando usuario admin...${NC}"
docker compose --env-file .env.production run --rm app npx tsx prisma/seed.ts 2>/dev/null || \
echo -e "${YELLOW}Seed pode ter falhado - verifique se o admin ja existe${NC}"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN} Deploy concluido!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Aplicacao rodando em: http://localhost:3000"
echo "Login: admin@fortima.com / admin123"
echo ""
echo "Proximos passos:"
echo "  1. Configure Nginx como proxy reverso (veja deploy/nginx.conf)"
echo "  2. Instale SSL com Certbot: sudo certbot --nginx -d SEU_DOMINIO"
echo "  3. Acesse /configuracoes e configure Chatwoot + Google Drive"
echo ""
echo "Comandos uteis:"
echo "  docker compose --env-file .env.production logs -f app   # Ver logs"
echo "  docker compose --env-file .env.production restart app   # Reiniciar"
echo "  docker compose --env-file .env.production down          # Parar tudo"
