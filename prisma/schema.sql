-- Schema SQL para o banco relatorio_fotos
-- Rodar via: docker exec -i <container_postgres> psql -U postgres -d relatorio_fotos < schema.sql
-- Ou copiar para o container e rodar: docker exec <container> psql -U postgres -d relatorio_fotos -f /tmp/schema.sql

-- Enum
CREATE TYPE "FotoStatus" AS ENUM ('PENDING', 'PROCESSING', 'UPLOADED', 'FAILED', 'NEEDS_INFO');

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Obras
CREATE TABLE obras (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fases
CREATE TABLE fases (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  obra_id TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE
);

-- Contatos
CREATE TABLE contatos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL UNIQUE,
  chatwoot_contact_id INTEGER,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Contato-Obra (many-to-many)
CREATE TABLE contato_obras (
  contato_id TEXT NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  obra_id TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  PRIMARY KEY (contato_id, obra_id)
);

-- Notificacoes Config
CREATE TABLE notificacoes_config (
  id TEXT PRIMARY KEY,
  mensagem_template TEXT NOT NULL,
  horario TEXT NOT NULL,
  dias_semana INTEGER[] NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fotos
CREATE TABLE fotos (
  id TEXT PRIMARY KEY,
  nome_arquivo TEXT NOT NULL,
  drive_file_id TEXT,
  drive_folder_id TEXT,
  mensagem_original TEXT,
  chatwoot_message_id INTEGER,
  status "FotoStatus" NOT NULL DEFAULT 'PENDING',
  obra_id TEXT REFERENCES obras(id),
  fase_id TEXT REFERENCES fases(id),
  contato_id TEXT REFERENCES contatos(id),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Drive Config
CREATE TABLE drive_config (
  id TEXT PRIMARY KEY,
  folder_id_raiz TEXT NOT NULL,
  service_account_email TEXT NOT NULL,
  credentials_json TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Chatwoot Config
CREATE TABLE chatwoot_config (
  id TEXT PRIMARY KEY,
  base_url TEXT NOT NULL,
  api_token TEXT NOT NULL,
  account_id INTEGER NOT NULL,
  inbox_id INTEGER NOT NULL,
  db_host TEXT NOT NULL,
  db_port INTEGER NOT NULL DEFAULT 5432,
  db_name TEXT NOT NULL,
  db_user TEXT NOT NULL,
  db_password TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Prisma migrations tracking (para Prisma nao reclamar)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  id VARCHAR(36) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMP WITH TIME ZONE,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
);

-- Usuario admin (senha: admin123)
INSERT INTO users (id, email, password, nome, created_at, updated_at) VALUES (
  'cladmin000000000000000000',
  'admin@fortima.com',
  '$2b$10$jY841K67KTu/3ac2KZixI.VN/q/dKG4UPcTAyfsIEpfIRCqvPXZrK',
  'Administrador',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
