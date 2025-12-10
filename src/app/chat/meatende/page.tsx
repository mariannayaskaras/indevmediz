// src/app/chat/meatende/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { AudioRecorder } from '@/components/audio/AudioRecorder'
import { AudioPlayer } from '@/components/audio/AudioPlayer'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, History } from 'lucide-react'
import {
  SidebarInset,
  SidebarProvider
} from '@/components/ui/sidebar'
import { Card, CardContent } from '@/components/ui/card'

type AudioMessage = {
  id: string
  role: 'USER' | 'ASSISTANT'
  audioUrl?: string | null
  transcript?: string | null
  createdAt: string
}

type AudioSession = {
  id: string
  threadId: string | null
  createdAt: string
  messages: AudioMessage[]
}

export default function MeATENDEPage() {
  const router = useRouter()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentSession, setCurrentSession] = useState<AudioSession | null>(null)
  const [messages, setMessages] = useState<AudioMessage[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState<AudioSession[]>([])
  const [credits, setCredits] = useState<number | null>(null)

  // Carrega créditos do usuário
  useEffect(() => {
    loadCredits()
  }, [])

  // Carrega sessão atual e histórico
  useEffect(() => {
    loadCurrentSession()
    loadHistory()
  }, [])

  const loadCredits = async () => {
    try {
      const res = await fetch('/api/credits')
      if (res.ok) {
        const data = await res.json()
        setCredits(data.balance || 0)
      }
    } catch (error) {
      console.error('Erro ao carregar créditos:', error)
    }
  }

  const loadCurrentSession = async () => {
    try {
      const res = await fetch('/api/chat-audio')
      if (res.ok) {
        const data = await res.json()
        if (data.sessions && data.sessions.length > 0) {
          const latestSession = data.sessions[0]
          setCurrentSession(latestSession)
          setMessages(latestSession.messages || [])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar sessão:', error)
    }
  }

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/chat-audio')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    }
  }

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessing(true)
    
    try {
      console.log('[meATENDE] Iniciando processamento de áudio...', {
        blobSize: audioBlob.size,
        blobType: audioBlob.type
      })

      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      console.log('[meATENDE] Enviando para API...')
      const res = await fetch('/api/chat-audio', {
        method: 'POST',
        body: formData
      })

      console.log('[meATENDE] Resposta recebida:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        contentType: res.headers.get('content-type')
      })

      // Verifica content-type antes de fazer parse
      const contentType = res.headers.get('content-type') || ''
      console.log('[meATENDE] Content-Type da resposta:', contentType)

      // Lê a resposta como texto (só pode ser lida uma vez)
      let responseText = ''
      try {
        responseText = await res.text()
      } catch (textError) {
        console.error('[meATENDE] Erro ao ler resposta:', textError)
        throw new Error('Erro ao ler resposta do servidor')
      }

      if (!res.ok) {
        console.error('[meATENDE] Erro na resposta:', {
          status: res.status,
          statusText: res.statusText,
          contentType,
          errorTextPreview: responseText.substring(0, 200) // Primeiros 200 chars
        })
        
        // Tenta parsear como JSON, se falhar usa o texto
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch (parseError) {
          console.error('[meATENDE] Erro ao fazer parse do JSON de erro:', parseError)
          // Se começar com "ID3" ou outros padrões de áudio, é provável que seja um arquivo de áudio
          if (responseText.trim().startsWith('ID3') || contentType.includes('audio') || contentType.includes('video')) {
            errorData = { 
              error: 'O servidor retornou dados de áudio em vez de JSON. Verifique a configuração do webhook.' 
            }
          } else {
            errorData = { error: responseText || 'Erro ao processar áudio' }
          }
        }
        
        throw new Error(errorData.error || errorData.message || 'Erro ao processar áudio')
      }

      // Verifica se a resposta é JSON antes de fazer parse
      let data
      try {
        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(responseText)
          } catch (parseError) {
            console.error('[meATENDE] Erro ao fazer parse do JSON de sucesso:', parseError)
            console.error('[meATENDE] Resposta (primeiros 200 chars):', responseText.substring(0, 200))
            throw new Error('Resposta do servidor não é JSON válido')
          }
        } else {
          throw new Error(`Resposta não é JSON. Content-Type: ${contentType}`)
        }
      } catch (parseError) {
        console.error('[meATENDE] Erro ao processar resposta:', parseError)
        throw new Error('Erro ao processar resposta do servidor')
      }
      console.log('[meATENDE] Dados recebidos:', {
        hasAgentAudioUrl: !!data.agentAudioUrl,
        hasTranscript: !!data.transcript,
        sessionId: data.sessionId
      })

      // Adiciona mensagens à lista
      const userMessage: AudioMessage = {
        id: `user-${Date.now()}`,
        role: 'USER',
        transcript: data.userTranscript || 'Áudio do usuário',
        createdAt: new Date().toISOString()
      }

      const agentMessage: AudioMessage = {
        id: `agent-${Date.now()}`,
        role: 'ASSISTANT',
        audioUrl: data.agentAudioUrl,
        transcript: data.transcript,
        createdAt: new Date().toISOString()
      }

      setMessages(prev => [...prev, userMessage, agentMessage])

      // Atualiza sessão atual
      if (data.sessionId && !currentSession) {
        setCurrentSession({
          id: data.sessionId,
          threadId: data.threadId,
          createdAt: new Date().toISOString(),
          messages: [userMessage, agentMessage]
        })
      }

      // Recarrega histórico
      await loadHistory()
      
      // Atualiza créditos
      await loadCredits()
    } catch (error) {
      console.error('Erro ao enviar áudio:', error)
      alert(error instanceof Error ? error.message : 'Erro ao processar áudio')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <SidebarProvider>
      <AppSidebar
        history={[]}
        selectedThread={null}
        onSelectSession={() => {}}
      />

      <SidebarInset>
        <div className="flex flex-col min-h-screen bg-zinc-50">
          {/* Header */}
          <header className="w-full sticky top-0 z-30 flex items-center h-16 bg-zinc-50 p-4 shadow-sm border-b">
            <div className="w-full flex items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/chat')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold text-indigo-600">
                    🎙️ meATENDE
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Agente de Voz - Converse por áudio
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {credits !== null && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Créditos: </span>
                    <span className="font-semibold text-indigo-600">{credits}</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4 mr-2" />
                  Histórico
                </Button>
              </div>
            </div>
          </header>

          {/* Conteúdo Principal */}
          <div className="flex-1 flex">
            {/* Área de Conversa */}
            <div className="flex-1 flex flex-col p-6">
              <div className="flex-1 mb-6 overflow-y-auto max-h-[calc(100vh-300px)]">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="mb-4 p-4 bg-indigo-100 rounded-full">
                        <span className="text-4xl">🎙️</span>
                      </div>
                      <h2 className="text-2xl font-semibold text-indigo-600 mb-2">
                        Bem-vindo ao meATENDE
                      </h2>
                      <p className="text-muted-foreground max-w-md">
                        Grave uma mensagem de áudio para começar a conversar com nosso agente de voz.
                        Ele responderá também por áudio!
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                      >
                        <Card className={`max-w-[80%] ${message.role === 'USER' ? 'bg-indigo-50' : 'bg-white'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="text-xs text-muted-foreground mb-2">
                                  {message.role === 'USER' ? 'Você' : 'Agente'} • {formatDate(message.createdAt)}
                                </div>
                                
                                {message.role === 'ASSISTANT' && message.audioUrl ? (
                                  <AudioPlayer
                                    audioUrl={message.audioUrl}
                                    transcript={message.transcript || undefined}
                                  />
                                ) : (
                                  <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-sm">
                                      {message.transcript || 'Áudio do usuário'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))
                  )}
                  
                  {isProcessing && (
                    <div className="flex justify-start">
                      <Card className="bg-white">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                            <span className="text-sm text-muted-foreground">
                              Processando áudio...
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>

              {/* Área de Gravação */}
              <div className="border-t pt-6">
                <div className="max-w-2xl mx-auto">
                  <AudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>

            {/* Painel de Histórico */}
            {showHistory && (
              <div className="w-80 border-l bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Histórico</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHistory(false)}
                  >
                    ×
                  </Button>
                </div>
                <div className="h-[calc(100vh-8rem)] overflow-y-auto">
                  <div className="space-y-2">
                    {sessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma conversa anterior
                      </p>
                    ) : (
                      sessions.map((session) => (
                        <Card
                          key={session.id}
                          className="cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => {
                            setCurrentSession(session)
                            setMessages(session.messages)
                            setShowHistory(false)
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="text-xs text-muted-foreground mb-1">
                              {formatDate(session.createdAt)}
                            </div>
                            <div className="text-sm font-medium">
                              {session.messages.length} mensagens
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

