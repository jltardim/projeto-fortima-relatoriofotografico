-- Migração: adicionar LlmConfig e configPasswordHash
-- Rodar no servidor que já tem o schema original

-- Nova coluna em users
ALTER TABLE users ADD COLUMN IF NOT EXISTS config_password_hash TEXT;

-- Nova tabela llm_config
CREATE TABLE IF NOT EXISTS llm_config (
  id TEXT PRIMARY KEY,
  openrouter_api_key TEXT NOT NULL,
  openrouter_model TEXT NOT NULL DEFAULT 'qwen/qwen3.6-plus',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
