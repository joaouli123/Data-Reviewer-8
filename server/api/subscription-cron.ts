import { db } from "../db";
import { subscriptions, companies, users } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function checkAndSendSubscriptionEmails() {
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
  
  const dateStr = fiveDaysFromNow.toISOString().split('T')[0];

  console.log(`[Cron] Checking for subscriptions expiring on ${dateStr}`);

  try {
    const expiringSoon = await db
      .select({
        id: subscriptions.id,
        companyId: subscriptions.companyId,
        subscriberName: subscriptions.subscriberName,
        expiresAt: subscriptions.expiresAt,
        amount: subscriptions.amount,
        ticketUrl: subscriptions.ticket_url,
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
      const [admin] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(and(eq(users.companyId, sub.companyId), eq(users.role, 'admin')))
        .limit(1);

      if (admin?.email) {
        console.log(`[Cron] Sending payment reminder email to ${admin.email} for company ${sub.companyName}`);
        
        try {
          await resend.emails.send({
            from: 'Financeiro <onboarding@resend.dev>',
            to: admin.email,
            subject: `Lembrete de Vencimento - ${sub.companyName}`,
            html: `
              <h1>Olá, ${admin.name || 'Administrador'}</h1>
              <p>Sua assinatura da plataforma vence em 5 dias (${new Date(sub.expiresAt!).toLocaleDateString('pt-BR')}).</p>
              <p>Valor: R$ ${parseFloat(sub.amount || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              ${sub.ticketUrl ? `<p>Você pode baixar seu boleto aqui: <a href="${sub.ticketUrl}">${sub.ticketUrl}</a></p>` : ''}
              <p>Evite a suspensão dos seus serviços realizando o pagamento em dia.</p>
            `
          });
        } catch (emailError) {
          console.error(`[Cron] Failed to send email to ${admin.email}:`, emailError);
        }
      }
    }
  } catch (error) {
    console.error("[Cron] Error checking expiring subscriptions:", error);
  }
}
