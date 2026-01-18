import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { companies, subscriptions } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function fixPaymentStatus() {
  console.log('🔧 Fixing payment status for existing companies...');
  
  try {
    // Get all companies with subscriptions pending but marked as approved
    const companiesWithIssue = await db
      .select({
        companyId: companies.id,
        companyName: companies.name,
        paymentStatus: companies.paymentStatus,
        subscriptionStatus: companies.subscriptionStatus,
      })
      .from(companies)
      .leftJoin(subscriptions, eq(subscriptions.companyId, companies.id))
      .where(sql`${subscriptions.status} = 'pending' AND ${companies.paymentStatus} = 'approved'`);
    
    console.log(`Found ${companiesWithIssue.length} companies with incorrect payment status`);
    
    // Update each company
    for (const company of companiesWithIssue) {
      await db.update(companies)
        .set({
          paymentStatus: 'pending',
          subscriptionStatus: 'pending'
        })
        .where(eq(companies.id, company.companyId));
      
      console.log(`✅ Fixed company: ${company.companyName} (${company.companyId})`);
    }
    
    // Also fix companies with no subscription
    const companiesNoSub = await db
      .select()
      .from(companies)
      .where(sql`${companies.id} NOT IN (SELECT company_id FROM ${subscriptions} WHERE status = 'active') AND ${companies.paymentStatus} = 'approved'`);
    
    console.log(`Found ${companiesNoSub.length} companies without active subscription but marked as approved`);
    
    for (const company of companiesNoSub) {
      await db.update(companies)
        .set({
          paymentStatus: 'pending',
          subscriptionStatus: 'pending'
        })
        .where(eq(companies.id, company.id));
      
      console.log(`✅ Fixed company without subscription: ${company.name} (${company.id})`);
    }
    
    console.log('✅ Payment status fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing payment status:', error);
    process.exit(1);
  }
}

fixPaymentStatus();
