-- CreateEnum
CREATE TYPE "FotoStatus" AS ENUM ('PENDING', 'PROCESSING', 'UPLOADED', 'FAILED', 'NEEDS_INFO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "config_password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fases" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "obra_id" TEXT NOT NULL,

    CONSTRAINT "fases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contatos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "chatwoot_contact_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contato_obras" (
    "contato_id" TEXT NOT NULL,
    "obra_id" TEXT NOT NULL,

    CONSTRAINT "contato_obras_pkey" PRIMARY KEY ("contato_id","obra_id")
);

-- CreateTable
CREATE TABLE "notificacoes_config" (
    "id" TEXT NOT NULL,
    "mensagem_template" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "dias_semana" INTEGER[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificacoes_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos" (
    "id" TEXT NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "drive_file_id" TEXT,
    "drive_folder_id" TEXT,
    "mensagem_original" TEXT,
    "chatwoot_message_id" INTEGER,
    "chatwoot_attachment_id" INTEGER,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "status" "FotoStatus" NOT NULL DEFAULT 'PENDING',
    "obra_id" TEXT,
    "fase_id" TEXT,
    "contato_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_config" (
    "id" TEXT NOT NULL,
    "folder_id_raiz" TEXT NOT NULL,
    "service_account_email" TEXT NOT NULL,
    "credentials_json" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drive_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_config" (
    "id" TEXT NOT NULL,
    "openrouter_api_key" TEXT NOT NULL,
    "openrouter_model" TEXT NOT NULL DEFAULT 'qwen/qwen3.6-plus',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatwoot_config" (
    "id" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "api_token" TEXT NOT NULL,
    "account_id" INTEGER NOT NULL,
    "inbox_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatwoot_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contatos_telefone_key" ON "contatos"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "fotos_chatwoot_attachment_id_key" ON "fotos"("chatwoot_attachment_id");

-- AddForeignKey
ALTER TABLE "fases" ADD CONSTRAINT "fases_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contato_obras" ADD CONSTRAINT "contato_obras_contato_id_fkey" FOREIGN KEY ("contato_id") REFERENCES "contatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contato_obras" ADD CONSTRAINT "contato_obras_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_fase_id_fkey" FOREIGN KEY ("fase_id") REFERENCES "fases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_contato_id_fkey" FOREIGN KEY ("contato_id") REFERENCES "contatos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
