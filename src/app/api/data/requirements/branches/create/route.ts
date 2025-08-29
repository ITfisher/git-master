import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 创建需求分支绑定
export async function POST(request: NextRequest) {
  let requestData: any;
  try {
    requestData = await request.json();
    const { requirementId, projectId, branchName, status = 'PENDING' } = requestData;
    
    if (!requirementId || !projectId || !branchName) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: requirementId, projectId, and branchName are required' 
      }, { status: 400 });
    }

    // 检查需求和项目是否存在
    const requirement = await prisma.requirement.findUnique({ 
      where: { id: parseInt(requirementId.toString()) } 
    });
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!requirement) {
      return NextResponse.json({ 
        success: false, 
        error: 'Requirement not found' 
      }, { status: 404 });
    }
    if (!project) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project not found' 
      }, { status: 404 });
    }

    // 检查是否已存在相同的分支绑定
    const existingBranch = await prisma.requirementBranch.findFirst({
      where: {
        requirementId: parseInt(requirementId.toString()),
        projectId: projectId
      }
    });

    if (existingBranch) {
      return NextResponse.json({ 
        success: false, 
        error: 'Branch already exists for this requirement and project' 
      }, { status: 409 });
    }

    // 创建分支绑定
    const branch = await prisma.requirementBranch.create({
      data: {
        requirementId: parseInt(requirementId.toString()),
        projectId,
        branchName,
        status: status.toUpperCase()
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      branch 
    });
    
  } catch (error: any) {
    console.error('Error creating requirement branch:', error);
    console.error('Data received:', JSON.stringify(requestData, null, 2));
    
    // 处理唯一约束错误
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        success: false, 
        error: 'Branch already exists for this requirement and project' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create branch',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}