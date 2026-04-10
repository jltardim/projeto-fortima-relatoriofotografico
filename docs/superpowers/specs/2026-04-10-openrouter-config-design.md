# Refatoração: OpenRouter + Configurações Protegidas

**Data:** 2026-04-10
**Status:** Aprovado

## Resumo

Migrar o extrator LLM de Anthropic SDK para OpenRouter (via OpenAI SDK), adicionar proteção por senha na página de configurações, permitir escolha de modelo, e documentar credenciais Google Drive.

## Mudanças

### 1. Extrator LLM — OpenRouter via OpenAI SDK

- Remover `@anthropic-ai/sdk`
- Instalar `openai`
- `src/lib/agent/extractor.ts`: usar OpenAI client com `baseURL: "https://openrouter.ai/api/v1"`
- API key e modelo lidos do banco (tabela `LlmConfig`)
- Prompt e lógica de confiança permanecem iguais

### 2. Schema Prisma — Nova tabela `LlmConfig`

```prisma
model LlmConfig {
  id               String @id @default(cuid())
  openrouterApiKey String @map("openrouter_api_key")
  openrouterModel  String @default("qwen/qwen3.6-plus") @map("openrouter_model")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  @@map("llm_config")
}
```

### 3. Schema Prisma — Senha de configurações

Adicionar campo `configPasswordHash` na tabela `users`:

```prisma
configPasswordHash String? @map("config_password_hash")
```

### 4. Página de Configurações — Proteção por senha

- Ao acessar `/configuracoes`, exibe tela de senha
- Senha verificada via API route (bcrypt compare)
- Estado guardado em sessionStorage (expira ao fechar aba)
- Aba "Segurança" permite definir/alterar a senha

### 5. Página de Configurações — Aba IA/OpenRouter

- Campo: API Key do OpenRouter (masked)
- Select: modelo com opções fixas + input customizado
  - `z-ai/glm-5.1`
  - `qwen/qwen3.6-plus`
  - `minimax/minimax-m2.7`
  - Customizado (input livre)

### 6. Página de Configurações — Ajuda Google Drive

- Aba Google Drive ganha accordion/seção com passo-a-passo:
  1. Criar projeto no Google Cloud Console
  2. Ativar Google Drive API
  3. Criar Service Account
  4. Baixar JSON de credenciais
  5. Compartilhar pasta do Drive com o email da service account

### 7. Limpeza

- Remover `@anthropic-ai/sdk` do package.json
- Remover `ANTHROPIC_API_KEY` do stack.yml
- Atualizar `schema.sql` com novas tabelas

## Modelos OpenRouter disponíveis

| Modelo | ID | Preço |
|---|---|---|
| GLM 5.1 | `z-ai/glm-5.1` | $1.40/$4.40 M tokens |
| Qwen 3.6 Plus | `qwen/qwen3.6-plus` | Gratuito |
| MiniMax M2.7 | `minimax/minimax-m2.7` | Pago |
