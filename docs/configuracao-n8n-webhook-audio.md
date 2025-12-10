# Configuração do Webhook n8n para meATENDE

## Problema Atual

O webhook n8n está retornando o arquivo de áudio (`audio/mp3`) diretamente em vez de retornar JSON. Isso causa erro no código que espera receber JSON.

## Solução: Configurar n8n para Retornar JSON

O n8n deve retornar um JSON com a seguinte estrutura:

```json
{
  "audioUrl": "https://res.cloudinary.com/.../audio.mp3",
  "transcript": "Transcrição do áudio do usuário",
  "agentTranscript": "Transcrição da resposta do agente"
}
```

### Campos Aceitos (flexível):

- **audioUrl** ou **audio_url**: URL do áudio do agente (obrigatório)
- **transcript** ou **text**: Transcrição do áudio do usuário (opcional)
- **agentTranscript** ou **agent_text**: Transcrição da resposta do agente (opcional)

## Passos para Configurar no n8n

### Opção 1: Retornar JSON com URL do Áudio (Recomendado)

1. **No nó "Responde Audio1" (ou similar):**
   - Mude "Respond With" de **"Binary File"** para **"JSON"**
   - Configure os campos JSON:
     ```json
     {
       "audioUrl": "{{ $json.audioUrl }}",
       "transcript": "{{ $json.transcript }}",
       "agentTranscript": "{{ $json.agentTranscript }}"
     }
     ```

2. **Antes de responder, faça upload do áudio para Cloudinary:**
   - Use um nó HTTP Request para fazer upload do áudio para Cloudinary
   - Ou use um nó Cloudinary se disponível
   - Armazene a URL retornada em uma variável

3. **Estrutura do Workflow:**
   ```
   Webhook (recebe audioUrl)
   ↓
   Processa áudio (transcrição, IA, etc.)
   ↓
   Gera resposta em áudio (text-to-speech)
   ↓
   Upload áudio para Cloudinary (ou storage)
   ↓
   Retorna JSON com { audioUrl, transcript, agentTranscript }
   ```

### Opção 2: Retornar JSON com Base64 (Alternativa)

Se preferir não usar Cloudinary, pode retornar o áudio como base64:

1. **No nó "Responde Audio1":**
   - Mude "Respond With" para **"JSON"**
   - Configure:
     ```json
     {
       "audioBase64": "{{ $binary.data.toString('base64') }}",
       "audioFormat": "mp3",
       "transcript": "{{ $json.transcript }}",
       "agentTranscript": "{{ $json.agentTranscript }}"
     }
     ```

2. **No código Next.js**, precisará ajustar para aceitar base64 (não implementado ainda).

## Exemplo de Configuração no n8n

### Nó Final (Respond to Webhook)

**Parâmetros:**
- **Respond With**: `JSON` (não "Binary File")
- **Response Data**: 
  ```json
  {
    "audioUrl": "{{ $json.audioUrl }}",
    "transcript": "{{ $json.transcript || '' }}",
    "agentTranscript": "{{ $json.agentTranscript || '' }}"
  }
  ```

### Verificação Importante

⚠️ **Atenção**: O nó "Webhook" inicial deve ter o parâmetro **"Respond"** configurado como:
- **"Using Respond to Webhook Node"** ✅

Isso garante que a resposta do workflow seja enviada corretamente.

## Teste

Após configurar, teste enviando um request:

```bash
curl -X POST https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-audio \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://example.com/test.mp3",
    "userId": "test-user",
    "sessionId": "test-session",
    "threadId": "test-thread"
  }'
```

**Resposta esperada:**
```json
{
  "audioUrl": "https://res.cloudinary.com/.../audio.mp3",
  "transcript": "...",
  "agentTranscript": "..."
}
```

**Content-Type:** `application/json` ✅

## Troubleshooting

### Erro: "Resposta não é JSON. Content-Type: audio/mp3"

**Causa**: O nó está configurado para retornar "Binary File" em vez de "JSON".

**Solução**: Mude "Respond With" para "JSON" no nó de resposta.

### Erro: "Workflow could not be started"

**Causa**: O workflow não está ativo no n8n.

**Solução**: Ative o workflow no n8n.

### Erro: "audioUrl não encontrado"

**Causa**: O JSON retornado não contém o campo `audioUrl` ou `audio_url`.

**Solução**: Verifique se o JSON retornado contém um dos campos esperados.

## Referências

- [n8n Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [n8n Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/)

