import { Receipt, Download, ShieldCheck } from "lucide-react";

export default function ClientInvoicesPage() {
  const invoicesList = [
    {
      number: "FACT-2026-0004",
      quoteNumber: "DEV-2026-0012",
      issuedAt: "24/07/2026",
      dueAt: "15/08/2026",
      amountHt: 4575.47,
      vatAmount: 274.53,
      amountTtc: 4850.0,
      status: "issued", // 'issued' | 'paid'
      type: "Facture d'acompte (30%)",
    },
    {
      number: "FACT-2026-0001",
      quoteNumber: "DEV-2026-0002",
      issuedAt: "10/05/2026",
      dueAt: "25/05/2026",
      amountHt: 330.19,
      vatAmount: 19.81,
      amountTtc: 350.0,
      status: "paid",
      paidAt: "14/05/2026",
      type: "Facture solde dépannage fuite",
    },
  ];

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
          Mes Factures Immuables
        </h1>
        <p className="text-sm text-slate-400">
          Toutes vos factures émises possèdent une numérotation séquentielle continue. Une facture émise ne peut être modifiée (loi comptable).
        </p>
      </div>

      {/* Immutability Notice Box */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-white">Garantie d'Immuabilité Comptable &amp; Mentions Légales Belges</p>
          <p className="text-slate-400">
            Conformément aux exigences fiscales belges, toute correction sur une facture émise fait l'objet d'un avoir officiel (`credit_notes`).
          </p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">N° Facture</th>
                <th className="p-4">Objet</th>
                <th className="p-4">Date Émission</th>
                <th className="p-4">Date Échéance</th>
                <th className="p-4 text-right">Montant TTC</th>
                <th className="p-4 text-center">Statut</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {invoicesList.map((inv) => (
                <tr key={inv.number} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 font-bold text-white">{inv.number}</td>
                  <td className="p-4">{inv.type}</td>
                  <td className="p-4">{inv.issuedAt}</td>
                  <td className="p-4 text-slate-400">{inv.dueAt}</td>
                  <td className="p-4 text-right font-heading font-extrabold text-sm text-white">
                    {inv.amountTtc.toFixed(2)} €
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        inv.status === "paid"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {inv.status === "paid" ? "✓ Payée" : "• En attente de règlement"}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <a
                      href={`/api/pdf/invoice/${inv.number}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition border border-slate-700"
                    >
                      <Download className="h-3.5 w-3.5 text-brand-terracotta" />
                      <span>PDF</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
