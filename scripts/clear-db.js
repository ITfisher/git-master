const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('Clearing database...');
    
    // 删除所有数据（按依赖关系顺序）
    await prisma.requirementBranch.deleteMany();
    console.log('✅ Cleared RequirementBranch table');
    
    await prisma.requirement.deleteMany();
    console.log('✅ Cleared Requirement table');
    
    await prisma.service.deleteMany();
    console.log('✅ Cleared Service table');
    
    console.log('🎉 Database cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();