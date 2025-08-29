import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let requirementData: any;
  try {
    requirementData = await request.json();
    
    if (Array.isArray(requirementData)) {
      const requirements = await Promise.all(
        requirementData.map(requirement => 
          prisma.requirement.upsert({
            where: { id: requirement.id || 0 },
            update: {
              title: requirement.title,
              description: requirement.description,
              jiraUrl: requirement.jiraUrl,
              jiraKey: requirement.jiraKey,
              priority: (requirement.priority || 'MEDIUM').toUpperCase(),
              status: (requirement.status || 'BACKLOG').toUpperCase(),
              startTime: requirement.startTime ? new Date(requirement.startTime) : null,
              endTime: requirement.endTime ? new Date(requirement.endTime) : null
            },
            create: {
              requirementNumber: requirement.requirementNumber,
              title: requirement.title,
              description: requirement.description,
              jiraUrl: requirement.jiraUrl,
              jiraKey: requirement.jiraKey,
              priority: (requirement.priority || 'MEDIUM').toUpperCase(),
              status: (requirement.status || 'BACKLOG').toUpperCase(),
              startTime: requirement.startTime ? new Date(requirement.startTime) : null,
              endTime: requirement.endTime ? new Date(requirement.endTime) : null
            }
          })
        )
      );
      return NextResponse.json({ success: true, requirements });
    } else {
      const requirement = await prisma.requirement.create({
        data: {
          requirementNumber: requirementData.requirementNumber,
          title: requirementData.title,
          description: requirementData.description,
          jiraUrl: requirementData.jiraUrl,
          jiraKey: requirementData.jiraKey,
          priority: (requirementData.priority || 'MEDIUM').toUpperCase(),
          status: (requirementData.status || 'BACKLOG').toUpperCase(),
          startTime: requirementData.startTime ? new Date(requirementData.startTime) : null,
          endTime: requirementData.endTime ? new Date(requirementData.endTime) : null
        },
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
        }
      });
      return NextResponse.json({ success: true, requirement });
    }
  } catch (error) {
    console.error('Error saving requirements:', error);
    console.error('Data received:', JSON.stringify(requirementData, null, 2));
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save requirements', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}