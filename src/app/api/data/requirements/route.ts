import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const REQUIREMENTS_FILE = path.join(DATA_DIR, 'requirements.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export async function GET() {
  try {
    ensureDataDir();
    if (fs.existsSync(REQUIREMENTS_FILE)) {
      const data = fs.readFileSync(REQUIREMENTS_FILE, 'utf8');
      return NextResponse.json(JSON.parse(data));
    }
    return NextResponse.json([]);
  } catch (error) {
    console.error('Error loading requirements:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requirements = await request.json();
    ensureDataDir();
    fs.writeFileSync(REQUIREMENTS_FILE, JSON.stringify(requirements, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving requirements:', error);
    return NextResponse.json({ success: false, error: 'Failed to save requirements' }, { status: 500 });
  }
}