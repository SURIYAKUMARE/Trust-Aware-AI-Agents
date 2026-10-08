import React, { useState, useEffect } from 'react';
import { EscalationItem } from '../types';
import { api } from '../api';
import { 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  Clock, 
  UserCheck, 
  AlertTriangle,
  RefreshCw,
  Send
} from 'lucide-react';

interface EscalationInboxProps {
  onRefresh?: () => void;
}

export const EscalationInbox: React.FC<EscalationInboxProps> = () => {
  const [items, setItems] = useState<EscalationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeItem, setActiveItem] = useState<EscalationItem | null>(null);
  const [modalMode, setModalMode] = useState<'APPROVE' | 'REJECT' | 'EDIT' | null>(null);
  const [note, setNote] = useState('');
  const [editedActionText, setEditedActionText] = useState('');

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const data = await api.listEscalations();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openModal = (item: EscalationItem, mode: 'APPROVE' | 'REJECT' | 'EDIT') => {
    setActiveItem(item);
    setModalMode(mode);
    setNote('');
    setEditedActionText(item.proposed_action);
  };

  const handleResolve = async () => {
    if (!activeItem || !modalMode) return;
    try {
      await api.resolveEscalation(activeItem.id, modalMode, note, modalMode === 'EDIT' ? editedActionText : undefined);
      setModalMode(null);
      setActiveItem(null);
      await fetchItems();
    } catch (e: any) {
      alert(`Error resolving escalation: ${e.message}`);
    }
  };

  const pendingItems = items.filter(i => i.status === 'PENDING');
  const resolvedItems = items.filter(i => i.status !== 'PENDING');

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Human-in-the-Loop Escalation Inbox
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Authorize, deny, or modify high-stakes, irreversible, or safety-critical operations flagged by TrustAgent.
          </p>
        </div>
        <button
          onClick={fetchItems}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Pending Items Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
            Pending Human Authorization ({pendingItems.length})
          </h3>
        </div>

        {pendingItems.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-950/50 border border-slate-800/80">
            <UserCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-400">Escalation queue is clean</p>
            <p className="text-xs text-slate-500 mt-0.5">
              High-stakes commands (e.g. "Refund Rs 50,000") will automatically appear here for mandatory supervisor approval.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-900 border border-rose-900/40 shadow-xl relative overflow-hidden"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded font-mono text-xs bg-rose-950 text-rose-400 border border-rose-500/30 font-bold">
                        {item.id}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.risk_category}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        Confidence: {Math.round(item.confidence_score * 100)}%
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white">
                      "{item.query}"
                    </h4>

                    <div className="mt-2 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-slate-300 font-mono">
                      <span className="text-slate-500 block text-[10px] uppercase mb-0.5">Proposed Action:</span>
                      {item.proposed_action}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => openModal(item, 'APPROVE')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => openModal(item, 'REJECT')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => openModal(item, 'EDIT')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit & Run
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved History */}
      {resolvedItems.length > 0 && (
        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono mb-3">
            Resolved Audit Trail ({resolvedItems.length})
          </h3>
          <div className="space-y-2.5">
            {resolvedItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-slate-400 font-bold">{item.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        item.status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : item.status === 'REJECTED'
                          ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                          : 'bg-blue-950 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-slate-500">{item.query}</span>
                  </div>
                  {item.human_note && (
                    <p className="text-slate-400 italic">Note: "{item.human_note}"</p>
                  )}
                </div>
                <span className="text-[11px] font-mono text-slate-500">{item.resolved_at}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {modalMode && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-400" />
              Confirm Human Decision: {modalMode}
            </h3>

            <p className="text-xs text-slate-400 font-mono">
              Action ID: {activeItem.id} | Query: "{activeItem.query}"
            </p>

            {modalMode === 'EDIT' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Modified Execution Command:
                </label>
                <textarea
                  value={editedActionText}
                  onChange={(e) => setEditedActionText(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  rows={3}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Auditor Note (Optional):
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Authorized by Ops Supervisor, limits verified"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer ${
                  modalMode === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-500' :
                  modalMode === 'REJECT' ? 'bg-rose-600 hover:bg-rose-500' :
                  'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                Confirm {modalMode}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
