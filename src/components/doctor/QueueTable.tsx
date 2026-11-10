import React, { useState } from 'react';
import { Token } from '@/types/database';
import { 
  Search, 
  ArrowUp, 
  ArrowDown, 
  Phone, 
  Sparkles, 
  MapPin, 
  Play, 
  Pause, 
  X, 
  Filter 
} from 'lucide-react';

interface QueueTableProps {
  tokens: Token[];
  onCall: (tokenId: string) => void;
  onHold: (tokenId: string) => void;
  onCancel: (tokenId: string) => void;
  onReorder: (tokenIds: string[], reason: string) => Promise<void>;
  loading: boolean;
}

export const QueueTable: React.FC<QueueTableProps> = ({
  tokens,
  onCall,
  onHold,
  onCancel,
  onReorder,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'seniors' | 'arrived'>('all');
  const [reorderReasonModal, setReorderReasonModal] = useState<{
    show: boolean;
    pendingIds: string[];
  }>({ show: false, pendingIds: [] });
  const [reasonInput, setReasonInput] = useState<string>('Medical priority adjustment');

  // Filter only active waiting/held tokens for reordering
  const activeTokens = tokens.filter(
    (t) => t.status === 'waiting' || t.status === 'hold' || t.status === 'missed'
  );

  // Search filter
  const filteredTokens = activeTokens.filter((t) => {
    const matchesSearch =
      t.token_number.toString().includes(searchTerm) ||
      (t.patient?.full_name && t.patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.patient?.phone && t.patient.phone.includes(searchTerm));

    if (!matchesSearch) return false;

    if (filterType === 'seniors') return t.patient?.is_senior;
    if (filterType === 'arrived') return t.arrived_at_clinic;
    return true;
  });

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === filteredTokens.length - 1)
    ) {
      return;
    }

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const newItems = [...filteredTokens];
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    // Prompt doctor for audit reason
    setReorderReasonModal({
      show: true,
      pendingIds: newItems.map((t) => t.id),
    });
  };

  const handleConfirmReorder = async () => {
    if (reorderReasonModal.pendingIds.length > 0) {
      await onReorder(reorderReasonModal.pendingIds, reasonInput);
    }
    setReorderReasonModal({ show: false, pendingIds: [] });
  };

  return (
    <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h3 className="text-xl font-extrabold text-foreground">
            Waiting Queue ({filteredTokens.length})
          </h3>
          <p className="text-xs text-muted-foreground font-semibold">
            Reorder positions with audit tracking
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterType === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('seniors')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
              filterType === 'seniors' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seniors (60+)</span>
          </button>
          <button
            onClick={() => setFilterType('arrived')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
              filterType === 'arrived' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>In Lobby</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search patient by name, phone, or token #..."
          className="w-full h-11 pl-11 pr-4 text-sm rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>

      {/* Queue List */}
      <div className="divide-y divide-border">
        {filteredTokens.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground font-semibold text-sm">
            No patients match current filters.
          </div>
        ) : (
          filteredTokens.map((token, index) => (
            <div
              key={token.id}
              className="py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-muted/40 transition-colors rounded-xl px-2"
            >
              <div className="flex items-center gap-3">
                {/* Position and Token Number */}
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs font-bold text-muted-foreground">
                    #{index + 1}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl">
                    #{token.token_number}
                  </div>
                </div>

                {/* Patient Details */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-foreground text-base">
                      {token.patient?.full_name || 'Walk-In Patient'}
                    </span>
                    {token.patient?.is_senior && (
                      <span className="px-2 py-0.2 rounded text-[11px] font-extrabold bg-amber-100 text-amber-800 flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" /> Senior
                      </span>
                    )}
                    {token.arrived_at_clinic && (
                      <span className="px-2 py-0.2 rounded text-[11px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" /> In Lobby
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground mt-0.5">
                    <span>Age {token.patient?.age ?? '--'}</span>
                    {token.patient?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {token.patient.phone}
                      </span>
                    )}
                    <span className="capitalize px-1.5 py-0.5 rounded bg-muted text-[10px]">
                      {token.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions & Reordering Controls */}
              <div className="flex items-center gap-1.5">
                {/* Move Up/Down Reorder */}
                <div className="flex items-center border rounded-lg bg-background p-0.5">
                  <button
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0 || loading}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Move up in queue"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === filteredTokens.length - 1 || loading}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Move down in queue"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Call Direct */}
                <button
                  onClick={() => onCall(token.id)}
                  disabled={loading}
                  className="h-9 px-3 bg-primary hover:bg-primary-700 text-primary-foreground font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm transition-colors"
                  title="Call this patient now"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Call</span>
                </button>

                {/* Hold Turn */}
                <button
                  onClick={() => onHold(token.id)}
                  disabled={loading}
                  className="h-9 px-2.5 border rounded-lg hover:bg-muted text-amber-600 transition-colors"
                  title="Hold turn (10 mins)"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>

                {/* Cancel Token */}
                <button
                  onClick={() => {
                    if (window.confirm(`Cancel Token #${token.token_number}?`)) {
                      onCancel(token.id);
                    }
                  }}
                  disabled={loading}
                  className="h-9 px-2 border rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Cancel Token"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reorder Audit Justification Modal */}
      {reorderReasonModal.show && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              <span>Audit Reason for Queue Reorder</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Clinical best practice requires recording a reason whenever queue order is modified manually.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Reason Preset</label>
              <select
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                className="w-full h-11 px-3 border rounded-xl text-sm bg-background"
              >
                <option value="Medical priority adjustment">Medical priority adjustment</option>
                <option value="Senior citizen assistance priority">Senior citizen assistance priority</option>
                <option value="Patient requested delay">Patient requested delay</option>
                <option value="Emergency case insertion">Emergency case insertion</option>
                <option value="Doctor manual override">Doctor manual override</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setReorderReasonModal({ show: false, pendingIds: [] })}
                className="w-1/2 h-11 border rounded-xl font-bold text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReorder}
                disabled={loading}
                className="w-1/2 h-11 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary-700 shadow"
              >
                Confirm Reorder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
