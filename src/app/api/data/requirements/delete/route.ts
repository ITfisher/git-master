import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 删除需求
export async function POST(request: NextRequest) {
  let requestData: any;
  try {
    requestData = await request.json();
    const { id } = requestData;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required field: id is required' 
      }, { status: 400 });
    }

    // 检查需求是否存在
    const existingRequirement = await prisma.requirement.findUnique({
      where: { id: parseInt(id.toString()) }
    });

    if (!existingRequirement) {
      return NextResponse.json({ 
        success: false, 
        error: 'Requirement not found' 
      }, { status: 404 });
    }

    // 删除需求 (关联的分支会被级联删除)
    await prisma.requirement.delete({
      where: { id: parseInt(id.toString()) }
    });

    return NextResponse.json({ 
      success: true 
    });
    
  } catch (error: any) {
    console.error('Error deleting requirement:', error);
    console.error('Data received:', JSON.stringify(requestData, null, 2));
    
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        success: false, 
        error: 'Requirement not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete requirement',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}