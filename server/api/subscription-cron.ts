import { db } from "../db";
import { subscriptions, companies, users } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

export async function checkAndSendSubscriptionEmails() {
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
  
  // Format date to compare only year-month-day
  const dateStr = fiveDaysFromNow.toISOString().split('T')[0];

  console.log(`[Cron] Checking for subscriptions expiring on ${dateStr}`);

  try {
    const expiringSoon = await db
      .select({
        id: subscriptions.id,
        companyId: subscriptions.companyId,
        subscriberName: subscriptions.subscriberName,
        expiresAt: subscriptions.expiresAt,
        companyName: companies.name,
      })
      .from(subscriptions)
      .leftJoin(companies, eq(subscriptions.companyId, companies.id))
      .where(
        and(
          eq(subscriptions.status, 'active'),
          sql`DATE(${subscriptions.expiresAt}) = ${dateStr}`
        )
      );

    for (const sub of expiringSoon) {
      // Find company admin email
      const [admin] = await db
        .select({ email: users.email })
        .from(users)
        .where(and(eq(users.companyId, sub.companyId), eq(users.role, 'admin')))
        .limit(1);

      if (admin?.email) {
        console.log(`[Cron] Sending payment reminder email to ${admin.email} for company ${sub.companyName}`);
        // Here you would integrate with your email service (Nodemailer, SendGrid, etc.)
        // and include the boleto/payment link.
      }
    }
  } catch (error) {
    console.error("[Cron] Error checking expiring subscriptions:", error);
  }
}
