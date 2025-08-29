import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 添加分支到需求
export async function POST(request: NextRequest) {
  try {
    const { requirementId, projectId, branchName, status = 'PENDING' } = await request.json();
    
    if (!requirementId || !projectId || !branchName) {
      return NextResponse.json({ 
        success: false, 
        error: 'requirementId, projectId, and branchName are required' 
      }, { status: 400 });
    }

    // 检查需求和项目是否存在
    const requirement = await prisma.requirement.findUnique({ where: { id: requirementId } });
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!requirement) {
      return NextResponse.json({ success: false, error: 'Requirement not found' }, { status: 404 });
    }
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
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

    return NextResponse.json({ success: true, branch });
  } catch (error: any) {
    console.error('Error creating requirement branch:', error);
    
    // 处理唯一约束错误
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        success: false, 
        error: 'Branch already exists for this requirement and project' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ success: false, error: 'Failed to create branch' }, { status: 500 });
  }
}

// 删除需求分支
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    
    if (!branchId) {
      return NextResponse.json({ success: false, error: 'branchId is required' }, { status: 400 });
    }

    await prisma.requirementBranch.delete({
      where: { id: branchId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting requirement branch:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete branch' }, { status: 500 });
  }
}

// 更新分支状态
export async function PUT(request: NextRequest) {
  try {
    const { branchId, status, branchName } = await request.json();
    
    if (!branchId) {
      return NextResponse.json({ success: false, error: 'branchId is required' }, { status: 400 });
    }

    const updatedBranch = await prisma.requirementBranch.update({
      where: { id: branchId },
      data: {
        ...(status !== undefined && { status: status.toUpperCase() }),
        ...(branchName !== undefined && { branchName }),
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

    return NextResponse.json({ success: true, branch: updatedBranch });
  } catch (error) {
    console.error('Error updating requirement branch:', error);
    return NextResponse.json({ success: false, error: 'Failed to update branch' }, { status: 500 });
  }
}