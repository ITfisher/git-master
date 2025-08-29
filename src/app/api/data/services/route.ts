import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error loading projects:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const projectData = await request.json();
    
    if (Array.isArray(projectData)) {
      const projects = await Promise.all(
        projectData.map(project => 
          prisma.project.upsert({
            where: { id: project.id || '' },
            update: {
              name: project.name,
              description: project.description,
              gitRepository: project.gitRepository,
              masterBranch: project.masterBranch || 'main',
              qaBranch: project.qaBranch || 'test',
              status: project.status || 'ACTIVE'
            },
            create: {
              name: project.name,
              description: project.description,
              gitRepository: project.gitRepository,
              masterBranch: project.masterBranch || 'main',
              qaBranch: project.qaBranch || 'test',
              status: project.status || 'ACTIVE'
            }
          })
        )
      );
      return NextResponse.json({ success: true, projects });
    } else {
      const project = await prisma.project.create({
        data: {
          name: projectData.name,
          description: projectData.description,
          gitRepository: projectData.gitRepository,
          masterBranch: projectData.masterBranch || 'main',
          qaBranch: projectData.qaBranch || 'test',
          status: projectData.status || 'ACTIVE'
        },
      });
      return NextResponse.json({ success: true, project });
    }
  } catch (error) {
    console.error('Error saving projects:', error);
    console.error('Project data received:', projectData);
    return NextResponse.json({ success: false, error: 'Failed to save projects', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}