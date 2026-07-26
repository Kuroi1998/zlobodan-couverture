import { NextRequest } from "next/server";
import { handleQuoteDecision } from "@/lib/services/quote-decision-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleQuoteDecision(req, id, "refuse");
}
