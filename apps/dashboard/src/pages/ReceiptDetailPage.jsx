import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/utils';

export default function ReceiptDetailPage() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getReceipt(id);
        setReceipt(data);
        setCategory(data.category || '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleCategorySave() {
    setSaving(true);
    try {
      await api.updateCategory(id, category);
      setReceipt((r) => ({ ...r, category }));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this receipt?')) return;
    try {
      await api.deleteReceipt(id);
      window.location.href = '/receipts';
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-[var(--text-secondary)]">Loading...</div>;
  }

  if (!receipt) {
    return <div className="p-8 text-center text-[var(--accent-red)]">Receipt not found</div>;
  }

  const imageUrl = receipt.webp_file_url || receipt.original_file_url;

  return (
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
      <Link
        to="/receipts"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={16} /> Back to receipts
      </Link>

      <div className="card overflow-hidden">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={receipt.store_name}
            className="max-h-64 w-full object-contain bg-black/20 sm:max-h-96"
          />
        )}

        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold sm:text-2xl">{receipt.store_name}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{receipt.transaction_date}</p>
            </div>
            <p className="text-2xl font-bold text-[var(--accent-gold)] sm:text-3xl">
              {formatCurrency(receipt.total_amount, receipt.currency)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[var(--text-secondary)]">Category:</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1"
              />
              <button
                type="button"
                onClick={handleCategorySave}
                disabled={saving}
                className="rounded-lg bg-[var(--accent-blue)] px-3 py-1 text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
            {receipt.store_address && (
              <span className="text-[var(--text-secondary)]">📍 {receipt.store_address}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {receipt.subtotal != null && (
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-[var(--text-secondary)]">Subtotal</p>
                <p className="font-semibold">{formatCurrency(receipt.subtotal, receipt.currency)}</p>
              </div>
            )}
            {receipt.tax_amount != null && (
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-[var(--text-secondary)]">Tax</p>
                <p className="font-semibold">{formatCurrency(receipt.tax_amount, receipt.currency)}</p>
              </div>
            )}
            {receipt.tip_amount != null && Number(receipt.tip_amount) > 0 && (
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-[var(--text-secondary)]">Tip</p>
                <p className="font-semibold">{formatCurrency(receipt.tip_amount, receipt.currency)}</p>
              </div>
            )}
            <div className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-[var(--text-secondary)]">Total</p>
              <p className="font-semibold">{formatCurrency(receipt.total_amount, receipt.currency)}</p>
            </div>
          </div>

          {receipt.items?.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">Line Items</h3>
              <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                {receipt.items.map((item, i) => (
                  <li key={item.id || i} className="flex justify-between px-4 py-2 text-sm">
                    <span>
                      {item.name || item.description}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                    </span>
                    <span className="text-[var(--accent-gold)]">
                      {formatCurrency(item.total_price ?? item.unit_price ?? 0, receipt.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-lg border border-[var(--accent-red)]/30 px-4 py-2 text-sm text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
          >
            <Trash2 size={16} /> Delete Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
