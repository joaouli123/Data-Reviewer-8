import { db } from "../db";
import { companies, users } from "../../shared/schema";
import { and, eq } from "drizzle-orm";

type GenerateBoletoParams = {
  companyId: string;
  amount: string | null;
  plan?: string | null;
  expirationDate?: Date;
  payer?: {
    email?: string | null;
    name?: string | null;
    document?: string | null;
    cep?: string | null;
    rua?: string | null;
    numero?: string | null;
    bairro?: string | null;
    complemento?: string | null;
    cidade?: string | null;
    estado?: string | null;
  };
};

export async function generateBoletoForCompany(params: GenerateBoletoParams) {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
  }

  const [companyRecord] = await db
    .select({ document: companies.document })
    .from(companies)
    .where(eq(companies.id, params.companyId))
    .limit(1);

  const [adminUser] = await db
    .select({
      email: users.email,
      name: users.name,
      cep: users.cep,
      rua: users.rua,
      numero: users.numero,
      complemento: users.complemento,
      cidade: users.cidade,
      estado: users.estado,
    })
    .from(users)
    .where(and(eq(users.companyId, params.companyId), eq(users.role, "admin")))
    .limit(1);

  const docNumber = (params.payer?.document || companyRecord?.document || "").replace(/\D/g, "");
  if (docNumber.length !== 11 && docNumber.length !== 14) {
    throw new Error("CPF/CNPJ inválido para emissão de boleto");
  }

  const fullName = params.payer?.name || adminUser?.name || "";
  const [firstName, ...lastNameParts] = fullName.split(" ");

  const expiration = params.expirationDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(23, 59, 59, 999);
    return d;
  })();

  const streetNumber = String(params.payer?.numero || adminUser?.numero || "").trim() || "S/N";
  const neighborhood = String(params.payer?.bairro || params.payer?.complemento || adminUser?.complemento || "").trim() || "S/N";

  const boletoMethods = ["bolbradesco", "boleto"];
  let lastError: any = null;

  for (const methodId of boletoMethods) {
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `boleto-${params.companyId}-${methodId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: Number(parseFloat(params.amount || "0").toFixed(2)),
        payment_method_id: methodId,
        date_of_expiration: expiration.toISOString(),
        payer: {
          email: params.payer?.email || adminUser?.email || "",
          first_name: firstName || "Admin",
          last_name: lastNameParts.join(" ") || "User",
          identification: {
            type: docNumber.length > 11 ? "CNPJ" : "CPF",
            number: docNumber,
          },
          address: {
            zip_code: String(params.payer?.cep || adminUser?.cep || "").replace(/\D/g, ""),
            street_name: String(params.payer?.rua || adminUser?.rua || "").trim(),
            street_number: streetNumber,
            neighborhood,
            city: String(params.payer?.cidade || adminUser?.cidade || "").trim(),
            federal_unit: String(params.payer?.estado || adminUser?.estado || "").trim(),
          },
        },
        description: "Renovação Assinatura - HUACONTROL",
        external_reference: params.companyId,
        metadata: {
          company_id: params.companyId,
          plan: params.plan || "monthly",
        },
      }),
    });

    if (mpResponse.ok) {
      const payment = await mpResponse.json();
      return payment?.transaction_details?.external_resource_url || null;
    }

    lastError = await mpResponse.json();
  }

  throw new Error(lastError?.message || lastError?.cause || "Failed to generate boleto");
}
