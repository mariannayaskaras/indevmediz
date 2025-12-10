# 🔧 Configuração de Webhooks na Vercel

## 📋 Visão Geral

Existem **dois tipos de webhooks** no sistema:

1. **Webhook que RECEBE** (da Hotmart) → `/api/hotmart`
2. **Webhook que ENVIA** (para n8n) → `https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-audio`

---

## 1️⃣ Webhook que RECEBE da Hotmart

### URL do Webhook na Vercel

```
https://[seu-dominio].vercel.app/api/hotmart
```

**Exemplo:**
- Se seu domínio é `mediz.app`: `https://mediz.app/api/hotmart`
- Se usar subdomínio Vercel: `https://meDIZ-2.vercel.app/api/hotmart`

### Configuração na Hotmart

1. Acesse o painel da Hotmart
2. Vá em **Configurações** → **Webhooks**
3. Adicione novo webhook:
   - **URL:** `https://[seu-dominio]/api/hotmart`
   - **Eventos:**
     - ✅ `PURCHASE_APPROVED`
     - ✅ `PURCHASE_COMPLETE`
     - ✅ `PURCHASE_CANCELLED` (opcional)
     - ✅ `PURCHASE_REFUNDED` (opcional)

### Variáveis de Ambiente na Vercel

Configure estas variáveis no painel da Vercel:

```bash
# Obrigatórias
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://[seu-dominio].vercel.app

# Hotmart
HOTMART_MEDIZ_PRODUCT_ID=[ID_DO_PRODUTO_MEDIZ]

# Webhooks n8n
N8N_CHAT_WEBHOOK_URL=https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-texto
N8N_WEBHOOK_URL=https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-audio

# Google OAuth (se usar)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Como Configurar na Vercel

1. Acesse: **Vercel Dashboard** → Seu Projeto → **Settings** → **Environment Variables**
2. Adicione cada variável acima
3. Selecione os ambientes: **Production**, **Preview**, **Development**
4. Clique em **Save**

### Teste do Webhook

Após configurar, teste fazendo uma compra de teste na Hotmart e verifique os logs:

1. **Vercel Dashboard** → Seu Projeto → **Deployments** → Clique no deployment → **Functions** → `/api/hotmart`
2. Verifique os logs para ver se o webhook está sendo recebido

---

## 2️⃣ Webhook que ENVIA para n8n (meATENDE)

### URL do Webhook n8n

```
https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-audio
```

### Configuração no Código

O webhook está configurado em: `src/app/api/chat-audio/route.ts`

```typescript
const WEBHOOK_URL = 'https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-audio'
```

### Como Alterar a URL

**Opção 1: Hardcoded (atual)**
- Edite diretamente no arquivo `src/app/api/chat-audio/route.ts`

**Opção 2: Variável de Ambiente (recomendado)**
- Adicione no `.env`:
  ```bash
  N8N_WEBHOOK_URL=https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-audio
  ```
- No código:
  ```typescript
  const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-audio'
  ```

### Formato de Envio

O webhook envia o áudio como **FormData** (arquivo binário):

```typescript
// Formato atual
FormData {
  audio: Blob (audio/webm),
  userId: string,
  sessionId: string,
  threadId: string,
  audioFormat: string
}
```

**Alternativa:** Pode ser alterado para Base64 (veja `AUDIO_FORMAT` no código)

---

## 🔐 Segurança

### Webhook da Hotmart

O webhook da Hotmart **não requer autenticação especial** no momento. Se quiser adicionar:

1. Configure um token secreto na Hotmart
2. Adicione verificação no código:
   ```typescript
   const hotmartToken = req.headers.get('x-hotmart-token')
   if (hotmartToken !== process.env.HOTMART_WEBHOOK_SECRET) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
   ```

### Webhook n8n

O webhook n8n pode ter autenticação configurada no próprio n8n. Se necessário, adicione headers:

```typescript
const webhookResponse = await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.N8N_WEBHOOK_TOKEN}` // Se necessário
  },
  body: requestBody
})
```

---

## 📊 Monitoramento

### Logs na Vercel

1. **Acesse:** Vercel Dashboard → Seu Projeto → **Logs**
2. **Filtre por:** `/api/hotmart` ou `/api/chat-audio`
3. **Verifique:**
   - Status das requisições (200, 400, 500)
   - Tempo de resposta
   - Erros

### Logs no n8n

1. Acesse o painel do n8n
2. Verifique os logs do webhook `chat-audio`
3. Veja se está recebendo os dados corretamente

---

## ✅ Checklist de Configuração

### Webhook Hotmart (Recebe)
- [ ] URL configurada na Hotmart: `https://[dominio]/api/hotmart`
- [ ] Eventos selecionados na Hotmart
- [ ] Variável `HOTMART_MEDIZ_PRODUCT_ID` configurada na Vercel
- [ ] Teste de compra realizado
- [ ] Logs verificados na Vercel

### Webhook n8n (Envia)
- [ ] URL do n8n correta no código
- [ ] Formato de áudio configurado (FormData/Base64)
- [ ] Teste de envio realizado
- [ ] Logs verificados no n8n

### Variáveis de Ambiente
- [ ] `DATABASE_URL` configurada
- [ ] `NEXTAUTH_SECRET` configurada
- [ ] `NEXTAUTH_URL` configurada (domínio correto)
- [ ] `HOTMART_MEDIZ_PRODUCT_ID` configurada
- [ ] `N8N_CHAT_WEBHOOK_URL` configurada (webhook de texto)
- [ ] `N8N_WEBHOOK_URL` configurada (webhook de voz)

---

## 🚨 Troubleshooting

### Webhook Hotmart não recebe requisições

1. Verifique se a URL está correta na Hotmart
2. Verifique se o domínio está acessível (sem bloqueios)
3. Verifique logs na Vercel para ver se há erros
4. Teste a URL manualmente: `curl -X POST https://[dominio]/api/hotmart`

### Webhook n8n não recebe dados

1. Verifique se a URL do n8n está correta
2. Verifique se o n8n está online
3. Verifique logs no n8n
4. Teste enviando manualmente para o webhook n8n

### Erro 500 no webhook

1. Verifique logs na Vercel
2. Verifique variáveis de ambiente
3. Verifique conexão com banco de dados
4. Verifique se todas as dependências estão instaladas

---

## 📝 Notas Importantes

1. **Domínio:** Use sempre HTTPS em produção
2. **Timeout:** 
   - Webhooks têm timeout configurado no `vercel.json`
   - APIs gerais: 30 segundos
   - API OpenAI: 60 segundos
   - Se o webhook de áudio precisar de mais tempo, adicione em `vercel.json`:
     ```json
     "src/app/api/chat-audio/route.ts": {
       "maxDuration": 60
     }
     ```
3. **Retry:** A Hotmart faz retry automático se receber erro
4. **Idempotência:** O código já trata requisições duplicadas
5. **Região:** Configurada para `iad1` (US East) no `vercel.json`

---

**Última atualização:** [Data atual]  
**Status:** Configuração básica implementada

