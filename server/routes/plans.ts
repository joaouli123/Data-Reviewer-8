import { Express, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { authMiddleware, requireSuperAdmin } from "../middleware";

type PlanRow = {
  key: string;
  display_name: string;
  price: string | number;
  currency: string;
  interval: string;
  is_active: boolean;
  updated_at: Date | string;
};

const toNumber = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function registerPlanRoutes(app: Express) {
  // Public endpoint used by LP/Signup/Checkout
  app.get("/api/public/plans", async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        select key, display_name, price, currency, interval, is_active, updated_at
        from plan_catalog
        where is_active = true
        order by key asc
      `);

      const rows = ((result as any)?.rows ?? []) as PlanRow[];
      return res.json(
        rows.map((r) => ({
          key: r.key,
          displayName: r.display_name,
          price: toNumber(r.price),
          currency: r.currency || "BRL",
          interval: r.interval || "month",
          updatedAt: r.updated_at,
        }))
      );
    } catch (error) {
      console.error("[Plans] public list error", error);
      return res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  // Admin endpoints (global pricing)
  app.get("/api/admin/plans", authMiddleware, requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        select key, display_name, price, currency, interval, is_active, updated_at
        from plan_catalog
        order by key asc
      `);
      const rows = ((result as any)?.rows ?? []) as PlanRow[];
      return res.json(
        rows.map((r) => ({
          key: r.key,
          displayName: r.display_name,
          price: toNumber(r.price),
          currency: r.currency || "BRL",
          interval: r.interval || "month",
          isActive: !!r.is_active,
          updatedAt: r.updated_at,
        }))
      );
    } catch (error) {
      console.error("[Plans] admin list error", error);
      return res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  const updateSchema = z.object({
    displayName: z.string().min(1).optional(),
    price: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
  });

  app.patch(
    "/api/admin/plans/:key",
    authMiddleware,
    requireSuperAdmin,
    async (req: Request, res: Response) => {
      try {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: "Dados inválidos" });
        }

        const planKey = String(req.params.key || "").trim();
        if (!planKey) return res.status(400).json({ error: "Plan key missing" });

        const patch = parsed.data;
        if (Object.keys(patch).length === 0) {
          return res.status(400).json({ error: "Nenhuma alteração" });
        }

        // Build dynamic SQL patch
        const setParts: any[] = [];
        if (patch.displayName !== undefined) setParts.push(sql`display_name = ${patch.displayName}`);
        if (patch.price !== undefined) setParts.push(sql`price = ${patch.price}`);
        if (patch.isActive !== undefined) setParts.push(sql`is_active = ${patch.isActive}`);
        setParts.push(sql`updated_at = now()`);

        // drizzle sql join
        const joined = setParts.reduce((acc, part, idx) => {
          if (idx === 0) return part;
          return sql`${acc}, ${part}`;
        }, setParts[0]);

        const result = await db.execute(sql`
          update plan_catalog
          set ${joined}
          where key = ${planKey}
          returning key, display_name, price, currency, interval, is_active, updated_at
        `);

        const row = ((result as any)?.rows ?? [])[0] as PlanRow | undefined;
        if (!row) return res.status(404).json({ error: "Plano não encontrado" });

        return res.json({
          key: row.key,
          displayName: row.display_name,
          price: toNumber(row.price),
          currency: row.currency || "BRL",
          interval: row.interval || "month",
          isActive: !!row.is_active,
          updatedAt: row.updated_at,
        });
      } catch (error) {
        console.error("[Plans] admin update error", error);
        return res.status(500).json({ error: "Failed to update plan" });
      }
    }
  );
}
