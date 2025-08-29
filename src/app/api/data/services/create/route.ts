import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const projectData = await request.json();
    
    if (!projectData.name) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' }, 
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: projectData.name,
        description: projectData.description,
        gitRepository: projectData.gitRepository,
        masterBranch: projectData.masterBranch || 'main',
        qaBranch: projectData.qaBranch || 'test',
        status: projectData.status || 'ACTIVE'
      }
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project' }, 
      { status: 500 }
    );
  }
}