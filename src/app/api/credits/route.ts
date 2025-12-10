// src/app/api/credits/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/**
 * GET /api/credits
 * Retorna o saldo de créditos do usuário autenticado
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = session.user.id

    // Busca ou cria registro de créditos para o usuário
    let credits = await prisma.userCredits.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Últimas 10 transações
        }
      }
    })

    // Se não existir, cria com saldo zero
    if (!credits) {
      credits = await prisma.userCredits.create({
        data: {
          userId,
          balance: 0
        },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })
    }

    return NextResponse.json({
      balance: credits.balance,
      recentTransactions: credits.transactions
    })
  } catch (error) {
    console.error('[API Credits] Erro ao buscar créditos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar créditos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/credits
 * Adiciona créditos ao usuário (compra/recarga)
 * Body: { amount: number, description?: string }
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()
    const amount = parseInt(body.amount)
    const description = body.description || 'Recarga de créditos'

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valor inválido' },
        { status: 400 }
      )
    }

    // Busca ou cria registro de créditos
    let credits = await prisma.userCredits.findUnique({
      where: { userId }
    })

    if (!credits) {
      credits = await prisma.userCredits.create({
        data: {
          userId,
          balance: 0
        }
      })
    }

    // Atualiza saldo e cria transação
    const updated = await prisma.userCredits.update({
      where: { id: credits.id },
      data: {
        balance: {
          increment: amount
        },
        transactions: {
          create: {
            amount,
            type: 'PURCHASE',
            description
          }
        }
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    return NextResponse.json({
      balance: updated.balance,
      transaction: updated.transactions[0]
    })
  } catch (error) {
    console.error('[API Credits] Erro ao adicionar créditos:', error)
    return NextResponse.json(
      { error: 'Erro ao adicionar créditos' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/credits
 * Debita créditos do usuário (uso)
 * Body: { amount: number, description?: string }
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()
    const amount = parseInt(body.amount)
    const description = body.description || 'Uso de créditos'

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valor inválido' },
        { status: 400 }
      )
    }

    // Busca créditos do usuário
    const credits = await prisma.userCredits.findUnique({
      where: { userId }
    })

    if (!credits) {
      return NextResponse.json(
        { error: 'Usuário não possui registro de créditos' },
        { status: 404 }
      )
    }

    // Verifica se tem saldo suficiente
    if (credits.balance < amount) {
      return NextResponse.json(
        { error: 'Saldo insuficiente', balance: credits.balance },
        { status: 400 }
      )
    }

    // Debita créditos e cria transação
    const updated = await prisma.userCredits.update({
      where: { id: credits.id },
      data: {
        balance: {
          decrement: amount
        },
        transactions: {
          create: {
            amount: -amount, // Negativo para débito
            type: 'USAGE',
            description
          }
        }
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    return NextResponse.json({
      balance: updated.balance,
      transaction: updated.transactions[0]
    })
  } catch (error) {
    console.error('[API Credits] Erro ao debitar créditos:', error)
    return NextResponse.json(
      { error: 'Erro ao debitar créditos' },
      { status: 500 }
    )
  }
}


