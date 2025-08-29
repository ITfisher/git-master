import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  let requestData: any;
  try {
    requestData = await request.json();
    
    const { id, title, description, jiraUrl, jiraKey, priority, status, startTime, endTime } = requestData;
    
    // Validate required fields
    if (!id || !title) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: id and title are required' 
      }, { status: 400 });
    }

    // Update the requirement
    const updatedRequirement = await prisma.requirement.update({
      where: { id: parseInt(id.toString()) },
      data: {
        title,
        description: description || null,
        jiraUrl: jiraUrl || null,
        jiraKey: jiraKey || null,
        priority: priority ? priority.toUpperCase() : 'MEDIUM',
        status: status ? status.toUpperCase() : 'BACKLOG',
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null
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

    return NextResponse.json({ 
      success: true, 
      requirement: updatedRequirement 
    });
    
  } catch (error) {
    console.error('Error updating requirement:', error);
    console.error('Data received:', JSON.stringify(requestData, null, 2));
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Requirement not found',
        details: error.message 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update requirement', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}