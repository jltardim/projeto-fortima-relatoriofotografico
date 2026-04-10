# Relatorio de Fotos de Obras

## Problem Statement
Como podemos automatizar a coleta diaria de fotos de progresso de obras, enviando lembretes via WhatsApp (Chatwoot) e organizando as imagens recebidas automaticamente no Google Drive?

## Recommended Direction
MVP Cirurgico com polling direto no PostgreSQL do Chatwoot. Frontend proprio em Next.js para cadastro de obras, contatos e configuracao de notificacoes. Backend com cron jobs para envio de mensagens e polling de respostas. LLM leve (Claude Haiku) para extrair obra + fase do texto da mensagem. Upload automatico no Google Drive via Service Account.

O sistema atende uma construtora com 10-50 obras simultaneas, dezenas de mestres de obra. A relacao mestre-obra e N:N (um mestre pode estar em varias obras).

### Fluxo principal
1. Cron dispara no horario configurado
2. Envia mensagem template via API Chatwoot para cada contato ativo
3. Mestre responde com foto + texto identificando obra e fase
4. Polling detecta nova mensagem com anexo no PostgreSQL do Chatwoot
5. LLM extrai nome da obra e fase do texto
6. Sistema cria pasta no Drive se nao existir
7. Nomeia arquivo com sequencial + fase + obra + data
8. Upload na pasta correta
9. Se nao conseguir identificar obra/fase, responde ao mestre pedindo esclarecimento

### Estrutura do Google Drive
```
Obra Residencial Sul/
  Fundacao/
    001_fundacao_residencial-sul_2026-04-10.jpg
    002_fundacao_residencial-sul_2026-04-10.jpg
    003_fundacao_residencial-sul_2026-04-11.jpg
  Estrutura/
    001_estrutura_residencial-sul_2026-04-15.jpg
    002_estrutura_residencial-sul_2026-04-15.jpg
  Alvenaria/
    001_alvenaria_residencial-sul_2026-04-20.jpg
```

Nomenclatura: `{sequencial}_{fase}_{obra}_{data}.ext`
Numeracao sequencial por fase (consulta quantas fotos ja existem na pasta e incrementa).

### Modelo de dados (banco local)
```
obras: id, nome, endereco, created_at
fases: id, obra_id, nome, ordem
contatos: id, nome, telefone, chatwoot_contact_id
contato_obras: contato_id, obra_id (N:N)
notificacoes_config: id, mensagem_template, horario, dias_semana, ativo
fotos: id, obra_id, fase_id, contato_id, drive_file_id, drive_folder_id, nome_arquivo, mensagem_original, chatwoot_message_id, created_at
drive_config: id, folder_id_raiz, service_account_email, credentials_json
```

### Stack
- Frontend + Backend: Next.js 14 (App Router), TypeScript
- Banco local: PostgreSQL
- ORM: Prisma
- Cron jobs: node-cron ou BullMQ
- LLM: Claude API (Haiku) para extrair obra+fase de texto
- Google Drive: Service Account + googleapis
- UI: Tailwind + shadcn/ui

## Key Assumptions to Validate
- [ ] PostgreSQL do Chatwoot acessivel pela aplicacao (rede/credenciais)
- [ ] Schema de messages e attachments do Chatwoot estavel na versao em uso
- [ ] Claude Haiku consegue extrair obra+fase de mensagens informais de mestres de obra
- [ ] Construtora aceita compartilhar pasta do Drive com service account Google
- [ ] Mestres de obra enviam texto identificando obra+fase junto com a foto

## MVP Scope
- Cadastro de obras, fases, contatos (mestres)
- Vinculacao N:N contato - obra
- Configuracao de mensagem template e horario de envio
- Envio automatico de notificacoes via API Chatwoot
- Polling de respostas no PostgreSQL do Chatwoot
- Extracao de obra + fase via LLM (Claude Haiku)
- Criacao automatica de pastas no Drive
- Upload com nomenclatura padronizada (sequencial por fase)
- Resposta automatica ao mestre se nao identificar obra/fase
- Configuracao do Google Drive (service account) no frontend

## Not Doing (and Why)
- Dashboard de progresso/timeline — valor alto, mas escopo de V2. MVP foca em coletar
- Visao computacional nas fotos — desnecessario, texto e suficiente para identificar obra/fase
- Comparacao entre fotos — requer embeddings visuais, escopo de V2
- Relatorios automaticos — V2, quando ja tiver historico acumulado
- Multi-empresa — MVP serve uma construtora

## Open Questions
- Qual versao do Chatwoot esta rodando? (para mapear schema do banco)
- Chatwoot esta em Docker, bare metal, ou cloud?
- Existe restricao de rede entre a aplicacao e o PostgreSQL do Chatwoot?
