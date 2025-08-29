import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 创建需求
export async function POST(request: NextRequest) {
  let requestData: any;
  try {
    requestData = await request.json();
    
    const { 
      requirementNumber, 
      title, 
      description, 
      jiraUrl, 
      jiraKey, 
      priority = 'MEDIUM',
      status = 'BACKLOG',
      startTime,
      endTime
    } = requestData;
    
    // 验证必填字段
    if (!requirementNumber || !title) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: requirementNumber and title are required' 
      }, { status: 400 });
    }

    // 检查需求编号是否已存在
    const existingRequirement = await prisma.requirement.findUnique({
      where: { requirementNumber }
    });

    if (existingRequirement) {
      return NextResponse.json({ 
        success: false, 
        error: 'Requirement number already exists' 
      }, { status: 409 });
    }

    // 创建需求
    const requirement = await prisma.requirement.create({
      data: {
        requirementNumber,
        title,
        description: description || null,
        jiraUrl: jiraUrl || null,
        jiraKey: jiraKey || null,
        priority: priority.toUpperCase(),
        status: status.toUpperCase(),
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
      requirement 
    });
    
  } catch (error: any) {
    console.error('Error creating requirement:', error);
    console.error('Data received:', JSON.stringify(requestData, null, 2));
    
    // 处理唯一约束错误
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        success: false, 
        error: 'Requirement with this number already exists' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create requirement',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}