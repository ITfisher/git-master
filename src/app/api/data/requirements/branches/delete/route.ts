import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 删除需求分支绑定
export async function POST(request: NextRequest) {
  let requestData: any;
  try {
    requestData = await request.json();
    const { branchId } = requestData;
    
    if (!branchId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required field: branchId is required' 
      }, { status: 400 });
    }

    // 检查分支是否存在
    const existingBranch = await prisma.requirementBranch.findUnique({
      where: { id: branchId }
    });

    if (!existingBranch) {
      return NextResponse.json({ 
        success: false, 
        error: 'Branch not found' 
      }, { status: 404 });
    }

    // 删除分支绑定
    await prisma.requirementBranch.delete({
      where: { id: branchId }
    });

    return NextResponse.json({ 
      success: true 
    });
    
  } catch (error: any) {
    console.error('Error deleting requirement branch:', error);
    console.error('Data received:', JSON.stringify(requestData, null, 2));
    
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        success: false, 
        error: 'Branch not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete branch',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}