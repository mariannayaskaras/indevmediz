// src/app/api/chat-audio/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import { Readable } from 'stream'

// URL do webhook n8n para processamento de áudio
// Configure N8N_WEBHOOK_URL na Vercel ou use o valor padrão
const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-audio'
// const CREDITS_PER_USE = 1 // Quantidade de créditos por uso (comentado - será usado quando créditos forem implementados)

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

/**
 * POST /api/chat-audio
 * Envia áudio para o webhook e processa a resposta
 * Body: FormData com arquivo de áudio
 */
export async function POST(req: Request) {
  console.log('[API Chat Audio] 📥 Requisição recebida')
  
  try {
    const session = await auth()
    console.log('[API Chat Audio] 🔐 Sessão:', { hasSession: !!session, userId: session?.user?.id })
    
    if (!session?.user?.id) {
      console.error('[API Chat Audio] ❌ Não autenticado')
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = session.user.id
    console.log('[API Chat Audio] 👤 Usuário:', userId)

    // TODO: Verificar créditos (comentado para teste)
    // const credits = await prisma.userCredits.findUnique({
    //   where: { userId }
    // })
    // if (!credits || credits.balance < CREDITS_PER_USE) {
    //   return NextResponse.json(
    //     { error: 'Créditos insuficientes' },
    //     { status: 402 }
    //   )
    // }

    console.log('[API Chat Audio] 📦 Lendo FormData...')
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    console.log('[API Chat Audio] 🎵 Arquivo de áudio:', {
      hasFile: !!audioFile,
      fileName: audioFile?.name,
      fileSize: audioFile?.size,
      fileType: audioFile?.type
    })

    if (!audioFile) {
      console.error('[API Chat Audio] ❌ Arquivo de áudio não fornecido')
      return NextResponse.json(
        { error: 'Arquivo de áudio não fornecido' },
        { status: 400 }
      )
    }

    // Converte o arquivo para buffer
    console.log('[API Chat Audio] 🔄 Convertendo para buffer...')
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('[API Chat Audio] ✅ Buffer criado:', { size: buffer.length })

    // Verifica se Cloudinary está configurado
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('[API Chat Audio] ❌ Cloudinary não configurado. Variáveis de ambiente faltando.')
      return NextResponse.json(
        { error: 'Serviço de upload não configurado. Entre em contato com o suporte.' },
        { status: 500 }
      )
    }

    // Faz upload do áudio para Cloudinary
    console.log('[API Chat Audio] ☁️ Fazendo upload para Cloudinary...')
    let audioUrl: string
    try {
      const stream = Readable.from(buffer)
      const uploadResult: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploader = cloudinary.uploader.upload_stream(
          {
            folder: 'chat_audio',
            public_id: `audio-${userId}-${Date.now()}`,
            overwrite: false,
            resource_type: 'video', // Cloudinary trata áudio como vídeo
            format: 'webm' // Mantém o formato original
          },
          (err, result) => {
            if (err) {
              console.error('[API Chat Audio] ❌ Erro no upload Cloudinary:', {
                message: err.message,
                http_code: err.http_code,
                name: err.name
              })
              return reject(err)
            }
            if (!result) {
              console.error('[API Chat Audio] ❌ Upload retornou null')
              return reject(new Error('Upload retornou resultado vazio'))
            }
            console.log('[API Chat Audio] ✅ Upload Cloudinary sucesso:', {
              publicId: result.public_id,
              secureUrl: result.secure_url,
              format: result.format,
              bytes: result.bytes
            })
            resolve(result)
          }
        )
        stream.pipe(uploader)
      })
      
      if (!uploadResult?.secure_url) {
        console.error('[API Chat Audio] ❌ Upload não retornou URL')
        return NextResponse.json(
          { error: 'Upload concluído mas URL não disponível' },
          { status: 500 }
        )
      }
      
      audioUrl = uploadResult.secure_url
      console.log('[API Chat Audio] ✅ URL do áudio:', audioUrl)
    } catch (uploadError) {
      console.error('[API Chat Audio] ❌ Erro ao fazer upload:', {
        error: uploadError instanceof Error ? uploadError.message : String(uploadError),
        stack: uploadError instanceof Error ? uploadError.stack : undefined
      })
      return NextResponse.json(
        { 
          error: 'Falha ao fazer upload do áudio',
          details: uploadError instanceof Error ? uploadError.message : 'Erro desconhecido'
        },
        { status: 500 }
      )
    }

    // TODO: Remover comentários quando migration for executada
    // Por enquanto, pula criação de sessão/mensagens para testar webhook
    console.log('[API Chat Audio] ⚠️ Modo teste: pulando criação de sessão no banco')
    
    // Gera IDs temporários para teste
    const tempSessionId = randomUUID()
    const tempThreadId = randomUUID()

    // Prepara dados para enviar ao webhook com URL do áudio
    console.log('[API Chat Audio] 📦 Preparando dados para webhook...')
    const requestBody = JSON.stringify({
      audioUrl: audioUrl, // Envia a URL do áudio
      userId,
      sessionId: tempSessionId, // Temporário para teste
      threadId: tempThreadId, // Temporário para teste
      audioFormat: audioFile.type || 'audio/webm'
    })
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    console.log('[API Chat Audio] 📦 Payload preparado:', {
      hasAudioUrl: !!audioUrl,
      audioUrl: audioUrl.substring(0, 50) + '...',
      userId,
      sessionId: tempSessionId,
      threadId: tempThreadId
    })

    // Envia para o webhook
    console.log('[API Chat Audio] 📤 Enviando para webhook n8n:', WEBHOOK_URL)
    
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: requestBody
    })

    console.log('[API Chat Audio] 📥 Resposta do webhook:', {
      status: webhookResponse.status,
      statusText: webhookResponse.statusText,
      ok: webhookResponse.ok,
      contentType: webhookResponse.headers.get('content-type')
    })

    if (!webhookResponse.ok) {
      let errorText = ''
      let errorData: { message?: string; [key: string]: unknown } | null = null
      
      try {
        errorText = await webhookResponse.text()
        // Tenta parsear como JSON
        try {
          errorData = JSON.parse(errorText)
        } catch {
          // Se não for JSON, usa o texto
          errorData = { message: errorText }
        }
      } catch {
        errorText = 'Erro desconhecido'
        errorData = { message: errorText }
      }
      
      console.error('[API Chat Audio] ❌ Erro no webhook n8n:', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        errorText,
        errorData
      })
      
      // Mensagem mais amigável baseada no erro do n8n
      let userMessage = 'Erro ao processar áudio no servidor'
      if (errorData?.message) {
        if (errorData.message.includes('Workflow could not be started')) {
          userMessage = 'O workflow do n8n não pôde ser iniciado. Verifique a configuração do workflow no n8n.'
        } else if (errorData.message.includes('Workflow')) {
          userMessage = `Erro no workflow n8n: ${errorData.message}`
        } else {
          userMessage = errorData.message
        }
      }
      
      return NextResponse.json(
        { error: userMessage, details: errorData },
        { status: webhookResponse.status || 500 }
      )
    }

    console.log('[API Chat Audio] 🔄 Processando resposta do webhook...')
    
    // Verifica o content-type antes de fazer parse
    const contentType = webhookResponse.headers.get('content-type') || ''
    console.log('[API Chat Audio] 📋 Content-Type da resposta:', contentType)
    
    let agentAudioUrl: string
    let transcript = ''
    let agentTranscript = ''
    
    // Aceita tanto JSON quanto arquivo de áudio diretamente
    if (contentType.includes('application/json')) {
      // Resposta é JSON
      console.log('[API Chat Audio] 📄 Resposta é JSON')
      try {
        const responseText = await webhookResponse.text()
        console.log('[API Chat Audio] 📄 Resposta (primeiros 200 chars):', responseText.substring(0, 200))
        
        const webhookData = JSON.parse(responseText)
        console.log('[API Chat Audio] ✅ Dados do webhook:', {
          hasAudioUrl: !!(webhookData.audioUrl || webhookData.audio_url),
          hasTranscript: !!(webhookData.transcript || webhookData.text),
          hasAgentTranscript: !!(webhookData.agentTranscript || webhookData.agent_text),
          keys: Object.keys(webhookData)
        })

        // Extrai dados da resposta do webhook
        agentAudioUrl = webhookData.audioUrl || webhookData.audio_url || ''
        transcript = webhookData.transcript || webhookData.text || ''
        agentTranscript = webhookData.agentTranscript || webhookData.agent_text || ''
        
        if (!agentAudioUrl) {
          return NextResponse.json(
            { error: 'Resposta do webhook não contém audioUrl' },
            { status: 500 }
          )
        }
      } catch (parseError) {
        console.error('[API Chat Audio] ❌ Erro ao fazer parse do JSON:', parseError)
        return NextResponse.json(
          { error: 'Resposta do webhook não é JSON válido' },
          { status: 500 }
        )
      }
    } else if (contentType.includes('audio/') || contentType.includes('video/')) {
      // Resposta é arquivo de áudio diretamente (MP3, etc.)
      console.log('[API Chat Audio] 🎵 Resposta é arquivo de áudio diretamente')
      
      try {
        // Lê o arquivo de áudio como buffer
        const audioBuffer = Buffer.from(await webhookResponse.arrayBuffer())
        console.log('[API Chat Audio] ✅ Áudio recebido:', {
          size: audioBuffer.length,
          contentType
        })
        
        // Faz upload do áudio para Cloudinary
        console.log('[API Chat Audio] ☁️ Fazendo upload do áudio do agente para Cloudinary...')
        const stream = Readable.from(audioBuffer)
        const uploadResult: UploadApiResponse = await new Promise((resolve, reject) => {
          const uploader = cloudinary.uploader.upload_stream(
            {
              folder: 'chat_audio_agent',
              public_id: `agent-audio-${userId}-${Date.now()}`,
              overwrite: false,
              resource_type: 'video', // Cloudinary trata áudio como vídeo
              format: contentType.includes('mp3') ? 'mp3' : 'webm'
            },
            (err, result) => {
              if (err) {
                console.error('[API Chat Audio] ❌ Erro no upload Cloudinary:', err)
                return reject(err)
              }
              if (!result) {
                return reject(new Error('Upload retornou resultado vazio'))
              }
              console.log('[API Chat Audio] ✅ Upload Cloudinary sucesso:', {
                publicId: result.public_id,
                secureUrl: result.secure_url
              })
              resolve(result)
            }
          )
          stream.pipe(uploader)
        })
        
        agentAudioUrl = uploadResult.secure_url
        console.log('[API Chat Audio] ✅ URL do áudio do agente:', agentAudioUrl)
        
        // Transcrições não disponíveis quando recebe áudio diretamente
        transcript = ''
        agentTranscript = ''
      } catch (uploadError) {
        console.error('[API Chat Audio] ❌ Erro ao processar áudio:', uploadError)
        return NextResponse.json(
          { error: 'Erro ao processar áudio recebido do webhook' },
          { status: 500 }
        )
      }
    } else {
      // Formato não suportado
      console.error('[API Chat Audio] ❌ Formato não suportado. Content-Type:', contentType)
      return NextResponse.json(
        { error: `Formato de resposta não suportado: ${contentType}. Esperado JSON ou arquivo de áudio.` },
        { status: 500 }
      )
    }

    // Salva mensagem do agente (comentado para teste)
    // console.log('[API Chat Audio] 🤖 Criando mensagem do agente...')
    // let agentMessage
    // try {
    //   agentMessage = await prisma.audioMessage.create({
    //     data: {
    //       sessionId: audioSession.id,
    //       role: 'ASSISTANT',
    //       audioUrl: agentAudioUrl,
    //       transcript: agentTranscript || transcript
    //     }
    //   })
    //   console.log('[API Chat Audio] ✅ Mensagem do agente criada:', { id: agentMessage.id })
    // } catch (dbError) {
    //   console.error('[API Chat Audio] ❌ Erro ao criar mensagem do agente:', dbError)
    //   throw dbError
    // }

    // Atualiza transcrição da mensagem do usuário se disponível (comentado para teste)
    // if (transcript && transcript !== 'Áudio do usuário') {
    //   console.log('[API Chat Audio] 📝 Atualizando transcrição do usuário...')
    //   try {
    //     await prisma.audioMessage.update({
    //       where: { id: userMessage.id },
    //       data: { transcript }
    //     })
    //     console.log('[API Chat Audio] ✅ Transcrição atualizada')
    //   } catch (dbError) {
    //     console.error('[API Chat Audio] ⚠️ Erro ao atualizar transcrição (não crítico):', dbError)
    //     // Não falha o processo se não conseguir atualizar a transcrição
    //   }
    // }
    
    console.log('[API Chat Audio] ⚠️ Modo teste: pulando salvamento no banco')

    // TODO: Debita créditos (comentado para teste)
    // await prisma.userCredits.update({
    //   where: { id: credits.id },
    //   data: {
    //     balance: { decrement: CREDITS_PER_USE },
    //     transactions: {
    //       create: {
    //         amount: -CREDITS_PER_USE,
    //         type: 'USAGE',
    //         description: 'Uso do meATENDE'
    //       }
    //     }
    //   }
    // })

    return NextResponse.json({
      success: true,
      agentAudioUrl,
      transcript: agentTranscript || transcript,
      userTranscript: transcript,
      sessionId: tempSessionId, // Temporário para teste
      threadId: tempThreadId // Temporário para teste
    })
  } catch (error) {
    console.error('[API Chat Audio] 💥 Erro completo:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro ao processar áudio',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/chat-audio
 * Busca histórico de conversas de áudio
 */
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (sessionId) {
      // Busca mensagens de uma sessão específica
      const messages = await prisma.audioMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' }
      })
      return NextResponse.json({ messages })
    }

    // Busca todas as sessões do usuário
    const sessions = await prisma.audioSession.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10 // Últimas 10 mensagens por sessão
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Últimas 20 sessões
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('[API Chat Audio] Erro ao buscar histórico:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar histórico' },
      { status: 500 }
    )
  }
}


