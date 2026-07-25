import { NextRequest } from "next/server";
import { handleQuoteDecision } from "@/lib/services/quoteDecisionService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handleQuoteDecision(req, params.id, "accept");
}
