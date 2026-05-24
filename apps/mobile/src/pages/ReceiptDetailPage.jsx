import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { api } from '../lib/api.js';
import {
  formatCurrency,
  formatDate,
  confidenceIndicator,
} from '../lib/utils.js';
import AppLayout from '../components/AppLayout.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';

export default function ReceiptDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});
  const [savingCategory, setSavingCategory] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.getReceipt(id);
        if (!cancelled) setReceipt(data);
      } catch {
        if (!cancelled) setReceipt(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCategoryChange = async (category) => {
    if (!receipt || savingCategory) return;
    setSavingCategory(true);
    try {
      await api.updateCategory(receipt.id, category);
      setReceipt((prev) => ({ ...prev, category }));
    } catch {
      /* ignore */
    } finally {
      setSavingCategory(false);
    }
  };

  const toggleItem = (itemId) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  if (loading) {
    return (
      <AppLayout showNav={false}>
        <div className="min-h-[60dvh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!receipt) {
    return (
      <AppLayout showNav={false}>
        <div className="px-5 pt-8 text-center space-y-4">
          <p>Receipt not found.</p>
          <Link to="/history" className="text-primary font-medium">Back to history</Link>
        </div>
      </AppLayout>
    );
  }

  const imageUrl = receipt.webp_file_url || receipt.original_file_url;
  const items = receipt.items || [];

  return (
    <AppLayout showNav={false}>
      <div className="px-5 pt-6 pb-8 space-y-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="touch-target inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {imageUrl && (
          <motion.div
            layout
            className={`overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5 ${zoomed ? 'fixed inset-4 z-50 bg-black/90 p-2' : ''}`}
            onClick={() => setZoomed((z) => !z)}
          >
            <img
              src={imageUrl}
              alt={`Receipt from ${receipt.store_name}`}
              className={`w-full object-contain transition-transform ${zoomed ? 'max-h-[85dvh] scale-110' : 'max-h-72'}`}
            />
          </motion.div>
        )}

        <section className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold">{receipt.store_name}</h1>
              {receipt.store_address && (
                <p className="text-sm text-ink/60 dark:text-dark-text/60 flex items-start gap-2 mt-2">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  {receipt.store_address}
                </p>
              )}
              {receipt.store_phone && (
                <p className="text-sm text-ink/60 dark:text-dark-text/60 flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 shrink-0" />
                  {receipt.store_phone}
                </p>
              )}
            </div>
            <p className="font-display text-2xl font-bold text-accent shrink-0">
              {formatCurrency(receipt.total_amount, receipt.currency)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <CategoryBadge
              category={receipt.category}
              editable
              onChange={handleCategoryChange}
              confidence={receipt.classification_confidence}
            />
            <span className="text-sm">
              {confidenceIndicator(receipt.classification_confidence)}{' '}
              {receipt.classification_confidence != null
                ? `${Math.round(receipt.classification_confidence * 100)}% confidence`
                : 'Unknown confidence'}
            </span>
            {savingCategory && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="font-display font-semibold">Transaction</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{formatDate(receipt.transaction_date)}</span>
            </div>
            {receipt.payment_method && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>
                  {receipt.payment_method}
                  {receipt.card_last4 ? ` •••• ${receipt.card_last4}` : ''}
                </span>
              </div>
            )}
          </div>
          {(receipt.tax_amount > 0 || receipt.tip_amount > 0) && (
            <div className="text-sm space-y-1 pt-2 border-t border-black/5 dark:border-white/10">
              {receipt.subtotal != null && (
                <div className="flex justify-between">
                  <span className="text-ink/60 dark:text-dark-text/60">Subtotal</span>
                  <span>{formatCurrency(receipt.subtotal)}</span>
                </div>
              )}
              {receipt.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink/60 dark:text-dark-text/60">Tax</span>
                  <span>{formatCurrency(receipt.tax_amount)}</span>
                </div>
              )}
              {receipt.tip_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink/60 dark:text-dark-text/60">Tip</span>
                  <span>{formatCurrency(receipt.tip_amount)}</span>
                </div>
              )}
            </div>
          )}
        </section>

        {items.length > 0 && (
          <section className="glass-card rounded-2xl p-5 space-y-3">
            <h2 className="font-display font-semibold">Line items ({items.length})</h2>
            <div className="space-y-2">
              {items.map((item) => {
                const expanded = expandedItems[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="w-full text-left rounded-xl p-3 bg-black/[0.03] dark:bg-white/[0.03] touch-target"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.name}</p>
                        {expanded && item.original_name && item.original_name !== item.name && (
                          <p className="text-xs text-ink/50 dark:text-dark-text/50 mt-1">
                            Original: {item.original_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-accent">
                          {formatCurrency(item.total_price ?? item.unit_price)}
                        </span>
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-ink/40" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-ink/40" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
