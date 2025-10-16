/**
 * Verify that the billing_code_chain view exists in the database
 * Run with: npx tsx scripts/verify-view.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyView() {
  try {
    console.log('🔍 Checking if billing_code_chain view exists...');
    
    // Try to query the view
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM billing_code_chain 
      LIMIT 1;
    `;
    
    console.log('✅ billing_code_chain view exists and is accessible!');
    console.log(`   View contains ${(result as any)[0].count} records`);
    
  } catch (error: any) {
    console.error('❌ Error: billing_code_chain view does not exist or is inaccessible!');
    console.error('   Message:', error.message);
    console.log('\n📝 To restore the view, run:');
    console.log('   psql $DATABASE_URL -f prisma/restore-view.sql');
    console.log('   or apply all migrations with:');
    console.log('   npx prisma migrate deploy');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyView();

