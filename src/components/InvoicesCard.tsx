import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, ExternalLink, Loader2, ReceiptText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { getInvoicePdfUrl, listMyInvoices } from "@/lib/invoices.functions";
import { GlassCard } from "@/components/PageShell";
import { Button } from "@/components/ui/button";

function formatMoney(amountMinor: string, currency: string) {
  const value = Number(amountMinor || 0) / 100;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function InvoicesCard() {
  const environment = getPaddleEnvironment();
  const [userId, setUserId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchInvoices = useServerFn(listMyInvoices);
  const fetchPdf = useServerFn(getInvoicePdfUrl);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserId(s?.user?.id ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["my-invoices", userId, environment],
    queryFn: () => fetchInvoices({ data: { environment } }),
    enabled: !!userId,
  });

  const pdfMut = useMutation({
    mutationFn: (vars: { transactionId: string; download: boolean }) =>
      fetchPdf({ data: { ...vars, environment } }),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (e: any) => toast.error(e?.message ?? "Could not open the invoice"),
    onSettled: () => setBusyId(null),
  });

  if (!userId || (!isLoading && (!invoices || invoices.length === 0))) return null;

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2">
        <ReceiptText className="h-4 w-4 text-cyan-300" />
        <h2 className="text-lg font-semibold text-white">Invoices &amp; receipts</h2>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        GST-compliant invoices for every successful payment, issued by our merchant of record.
      </p>

      {isLoading ? (
        <div className="mt-4 space-y-2" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-white/5">
          {invoices!.map((inv) => {
            const busy = busyId === inv.id && pdfMut.isPending;
            return (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {inv.invoiceNumber ?? inv.id}
                  </p>
                  <p className="text-xs text-slate-400">
                    {inv.billedAt ? new Date(inv.billedAt).toLocaleDateString() : "—"} ·{" "}
                    {formatMoney(inv.total, inv.currency)}
                    {Number(inv.tax) > 0 && (
                      <> · incl. tax {formatMoney(inv.tax, inv.currency)}</>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`View invoice ${inv.invoiceNumber ?? inv.id}`}
                    disabled={busy}
                    onClick={() => {
                      setBusyId(inv.id);
                      pdfMut.mutate({ transactionId: inv.id, download: false });
                    }}
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    <span className="ml-1.5">View</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Download invoice ${inv.invoiceNumber ?? inv.id}`}
                    disabled={busy}
                    onClick={() => {
                      setBusyId(inv.id);
                      pdfMut.mutate({ transactionId: inv.id, download: true });
                    }}
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    <Download className="h-4 w-4" />
                    <span className="ml-1.5">Download</span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
