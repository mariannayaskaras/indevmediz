# 📋 Planejamento: Sistema de Créditos para meATENDE (Voz)

## 🎯 Objetivo
Implementar sistema de créditos consumidos por minuto de uso do agente de voz meATENDE, com recarga via Hotmart.

---

## 📊 Estrutura de Produtos na Hotmart

### Opção 1: Produtos Separados (Recomendado)
Criar produtos individuais na Hotmart para cada pacote de créditos:

| Produto na Hotmart | hotmartId | Quantidade de Créditos | Preço Sugerido | Descrição |
|-------------------|-----------|------------------------|----------------|-----------|
| 10 Minutos meATENDE | `[ID_1]` | 10 créditos | R$ X,XX | Pacote inicial |
| 30 Minutos meATENDE | `[ID_2]` | 30 créditos | R$ X,XX | Pacote médio |
| 60 Minutos meATENDE | `[ID_3]` | 60 créditos | R$ X,XX | Pacote grande |
| 120 Minutos meATENDE | `[ID_4]` | 120 créditos | R$ X,XX | Pacote premium |

**Vantagens:**
- ✅ Fácil identificação no webhook
- ✅ Flexibilidade de preços diferentes
- ✅ Análise de vendas por pacote

**Desvantagens:**
- ⚠️ Múltiplos produtos para gerenciar

### Opção 2: Produto Único com Variações
Criar um único produto com diferentes ofertas (offers):

| Offer Code | Quantidade de Créditos | Preço Sugerido |
|------------|------------------------|----------------|
| `CREDITOS_10` | 10 créditos | R$ X,XX |
| `CREDITOS_30` | 30 créditos | R$ X,XX |
| `CREDITOS_60` | 60 créditos | R$ X,XX |
| `CREDITOS_120` | 120 créditos | R$ X,XX |

**Vantagens:**
- ✅ Um único produto
- ✅ Fácil gerenciamento

**Desvantagens:**
- ⚠️ Identificação mais complexa (precisa usar `offer.code`)

**Recomendação:** Usar **Opção 1** (produtos separados) para maior clareza e facilidade de implementação.

---

## 🔧 Configuração na Hotmart

### Passo 1: Criar Produtos
1. Acesse o painel da Hotmart
2. Crie os produtos conforme a tabela acima
3. **IMPORTANTE:** Anote o `hotmartId` de cada produto (será usado no código)

### Passo 2: Configurar Webhook
1. No painel da Hotmart, configure o webhook para:
   - URL: `https://seu-dominio.com/api/hotmart`
   - Eventos: `PURCHASE_APPROVED`, `PURCHASE_COMPLETE`

### Passo 3: Informações Necessárias
Preencha a tabela abaixo com os dados reais da Hotmart:

```
┌─────────────────────────────────────────────────────────────┐
│ INFORMAÇÕES PARA IMPLEMENTAÇÃO                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Produto 1:                                                  │
│   - Nome: [________________]                                │
│   - hotmartId: [________]                                   │
│   - Créditos: [____] minutos                                │
│   - Preço: R$ [____]                                        │
│                                                              │
│ Produto 2:                                                  │
│   - Nome: [________________]                                │
│   - hotmartId: [________]                                   │
│   - Créditos: [____] minutos                                │
│   - Preço: R$ [____]                                        │
│                                                              │
│ Produto 3:                                                  │
│   - Nome: [________________]                                │
│   - hotmartId: [________]                                   │
│   - Créditos: [____] minutos                                │
│   - Preço: R$ [____]                                        │
│                                                              │
│ Produto 4:                                                  │
│   - Nome: [________________]                                │
│   - hotmartId: [________]                                   │
│   - Créditos: [____] minutos                                │
│   - Preço: R$ [____]                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 💾 Estrutura no Banco de Dados

### Tabela: Plan (já existe)
Adicionar planos de créditos com identificação especial:

```sql
-- Exemplo de planos de créditos
INSERT INTO "Plan" (id, name, "stripePriceId", "hotmartId", "active", "isCreditPackage", "creditAmount")
VALUES
  ('credit_10', '10 Minutos meATENDE', 'credits_10', [HOTMART_ID_1], true, true, 10),
  ('credit_30', '30 Minutos meATENDE', 'credits_30', [HOTMART_ID_2], true, true, 30),
  ('credit_60', '60 Minutos meATENDE', 'credits_60', [HOTMART_ID_3], true, true, 60),
  ('credit_120', '120 Minutos meATENDE', 'credits_120', [HOTMART_ID_4], true, true, 120);
```

**Campos necessários:**
- `hotmartId`: ID do produto na Hotmart
- `isCreditPackage`: Flag para identificar como pacote de créditos (novo campo)
- `creditAmount`: Quantidade de créditos/minutos (novo campo)

---

## 🔄 Fluxo de Funcionamento

### 1. Primeira Vez (Sem Créditos)
```
Cliente acessa /chat/meatende
  ↓
Sistema verifica créditos: 0 créditos
  ↓
Redireciona para página de recarga
  ↓
Cliente compra na Hotmart
  ↓
Webhook recebe notificação
  ↓
Sistema adiciona créditos
  ↓
Cliente pode usar meATENDE
```

### 2. Durante o Uso
```
Cliente grava áudio
  ↓
Sistema verifica créditos suficientes
  ↓
Envia para webhook de voz
  ↓
Processa resposta
  ↓
Debita créditos (por minuto de áudio)
  ↓
Atualiza saldo
```

### 3. Créditos Acabando
```
Cliente tenta usar meATENDE
  ↓
Sistema verifica: saldo insuficiente
  ↓
Mostra página de recarga
  ↓
Cliente recarrega
  ↓
Volta para meATENDE
```

---

## 📐 Regras de Negócio

### Consumo de Créditos
- **1 crédito = 1 minuto de áudio**
- Créditos são debitados após processamento bem-sucedido
- Se o processamento falhar, créditos NÃO são debitados
- Arredondamento: sempre para cima (ex: 1.5 minutos = 2 créditos)

### Validade
- **Créditos não expiram** (permanentes até uso)
- Não há limite de tempo para usar

### Verificações
- Verificar saldo antes de iniciar gravação
- Verificar saldo antes de enviar para webhook
- Debitar apenas após resposta bem-sucedida

---

## 🎨 Interface do Usuário

### Página meATENDE (`/chat/meatende`)
- **Header:** Mostrar saldo de créditos em destaque
- **Botão Recarregar:** Sempre visível, leva para página de recarga
- **Estado sem créditos:** Bloquear gravação, mostrar mensagem + botão recarregar

### Página de Recarga (`/chat/meatende/recarregar`)
- Lista de pacotes disponíveis
- Preços e quantidades
- Botões que redirecionam para Hotmart
- Histórico de compras recentes

### Componentes Necessários
1. `CreditBalance` - Exibe saldo atual
2. `RechargePage` - Página de recarga
3. `CreditPackages` - Lista de pacotes
4. `CreditHistory` - Histórico de transações

---

## 🔌 Modificações no Código

### 1. Schema Prisma
```prisma
model Plan {
  // ... campos existentes
  isCreditPackage Boolean? @default(false)
  creditAmount    Int?     // Quantidade de créditos (se for pacote)
}
```

### 2. Webhook Hotmart (`/api/hotmart`)
- Detectar se compra é de créditos (verificar `isCreditPackage`)
- Se for créditos: adicionar ao `UserCredits` ao invés de criar `Subscription`
- Criar `CreditTransaction` com tipo `PURCHASE`

### 3. API Chat Audio (`/api/chat-audio`)
- Verificar saldo antes de processar
- Calcular minutos de áudio (duração do áudio enviado + resposta)
- Debitar créditos após sucesso
- Retornar erro se saldo insuficiente

### 4. Nova API: Recarga
- `GET /api/credits/packages` - Lista pacotes disponíveis
- `GET /api/credits/history` - Histórico de transações

---

## ✅ Checklist de Implementação

### Fase 1: Preparação
- [ ] Criar produtos na Hotmart
- [ ] Anotar `hotmartId` de cada produto
- [ ] Configurar webhook na Hotmart
- [ ] Preencher tabela de informações acima

### Fase 2: Banco de Dados
- [ ] Adicionar campos `isCreditPackage` e `creditAmount` ao modelo `Plan`
- [ ] Criar migration
- [ ] Inserir planos de créditos no banco

### Fase 3: Backend
- [ ] Modificar webhook Hotmart para detectar créditos
- [ ] Implementar lógica de adição de créditos
- [ ] Ativar verificação e débito na API de áudio
- [ ] Criar API de pacotes de créditos

### Fase 4: Frontend
- [ ] Criar página de recarga
- [ ] Adicionar componente de saldo
- [ ] Implementar bloqueio quando sem créditos
- [ ] Adicionar histórico de transações

### Fase 5: Testes
- [ ] Testar compra de créditos via Hotmart
- [ ] Testar uso e débito de créditos
- [ ] Testar bloqueio quando sem créditos
- [ ] Testar recarga quando créditos acabam

---

## 📝 Notas Importantes

1. **Formato de Áudio para Webhook:**
   - **Atual:** Enviado como `FormData` com arquivo binário (formato `audio/webm;codecs=opus`)
   - **Suportado:** FormData (padrão) ou Base64 (JSON)
   - **MP3:** Se necessário, pode ser convertido no webhook ou adicionar biblioteca de conversão
   - **Configuração:** Alterar constante `AUDIO_FORMAT` em `/api/chat-audio/route.ts`
     - `'formdata'`: Envia arquivo binário (recomendado, menor tamanho)
     - `'base64'`: Envia como string base64 em JSON
     - `'mp3'`: Requer conversão (não implementado ainda)

2. **Identificação de Créditos:**
   - Usar `hotmartId` para identificar produtos de créditos
   - Ou usar campo `isCreditPackage = true` no banco

3. **Cálculo de Minutos:**
   - Duração do áudio do usuário (em segundos / 60)
   - Duração do áudio do agente (em segundos / 60)
   - Total = soma arredondada para cima

4. **Idempotência:**
   - Usar `transaction` do webhook para evitar créditos duplicados
   - Verificar se transação já foi processada

5. **Logs:**
   - Registrar todas as transações de créditos
   - Logar tentativas de uso sem créditos
   - Logar débitos e recargas

---

## 🚀 Próximos Passos

1. **Você:** Configurar produtos na Hotmart e preencher informações
2. **Eu:** Implementar código baseado nas informações fornecidas
3. **Juntos:** Testar e ajustar conforme necessário

---

**Data de Criação:** [Data atual]  
**Status:** Aguardando configuração na Hotmart  
**Próxima Revisão:** Após receber informações dos produtos

