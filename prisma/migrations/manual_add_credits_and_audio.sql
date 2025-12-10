-- Migration manual: Adicionar modelos de créditos e áudio
-- Execute este script diretamente no seu banco de dados PostgreSQL

-- Criar enum TransactionType
DO $$ BEGIN
    CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'USAGE', 'REFUND', 'BONUS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela UserCredits
CREATE TABLE IF NOT EXISTS "UserCredits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredits_pkey" PRIMARY KEY ("id")
);

-- Criar tabela CreditTransaction
CREATE TABLE IF NOT EXISTS "CreditTransaction" (
    "id" TEXT NOT NULL,
    "creditsId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- Criar tabela AudioSession
CREATE TABLE IF NOT EXISTS "AudioSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioSession_pkey" PRIMARY KEY ("id")
);

-- Criar tabela AudioMessage
CREATE TABLE IF NOT EXISTS "AudioMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "ChatMessageRole" NOT NULL,
    "audioUrl" TEXT,
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioMessage_pkey" PRIMARY KEY ("id")
);

-- Criar índices
CREATE INDEX IF NOT EXISTS "UserCredits_userId_idx" ON "UserCredits"("userId");
CREATE INDEX IF NOT EXISTS "CreditTransaction_creditsId_idx" ON "CreditTransaction"("creditsId");
CREATE INDEX IF NOT EXISTS "CreditTransaction_createdAt_idx" ON "CreditTransaction"("createdAt");
CREATE INDEX IF NOT EXISTS "AudioSession_userId_idx" ON "AudioSession"("userId");
CREATE INDEX IF NOT EXISTS "AudioSession_createdAt_idx" ON "AudioSession"("createdAt");
CREATE INDEX IF NOT EXISTS "AudioMessage_sessionId_createdAt_idx" ON "AudioMessage"("sessionId", "createdAt");

-- Criar constraint unique para UserCredits.userId
DO $$ BEGIN
    ALTER TABLE "UserCredits" ADD CONSTRAINT "UserCredits_userId_key" UNIQUE ("userId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar constraint unique para AudioSession.threadId
DO $$ BEGIN
    ALTER TABLE "AudioSession" ADD CONSTRAINT "AudioSession_threadId_key" UNIQUE ("threadId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar foreign keys
DO $$ BEGIN
    ALTER TABLE "UserCredits" ADD CONSTRAINT "UserCredits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_creditsId_fkey" FOREIGN KEY ("creditsId") REFERENCES "UserCredits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AudioSession" ADD CONSTRAINT "AudioSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AudioMessage" ADD CONSTRAINT "AudioMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AudioSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


