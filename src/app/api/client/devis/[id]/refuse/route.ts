import { NextRequest } from "next/server";
import { handleQuoteDecision } from "@/lib/services/quote-decision-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handleQuoteDecision(req, params.id, "refuse");
}
