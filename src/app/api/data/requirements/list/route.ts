import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取需求列表
export async function GET() {
  try {
    const requirements = await prisma.requirement.findMany({
      include: {
        branches: {
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(requirements);
  } catch (error) {
    console.error('Error loading requirements:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to load requirements',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}