import React, { useState, useRef, useCallback } from 'react';
import { Token, ClinicSettings } from '@/types/database';
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Share2,
  Save,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Pill,
  Stethoscope,
  CalendarDays,
  MessageSquare,
  ClipboardList,
  History,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Medicine {
  id: string;
  name: string;
  dosage: string;    // e.g. "500 mg"
  frequency: string; // e.g. "1-0-1"
  duration: string;  // e.g. "5 days"
  instructions: string; // e.g. "After food"
}

interface Prescription {
  id: string;
  date: string;
  patientName: string;
  age: number | null;
  phone: string | null;
  tokenNumber: number | null;
  chiefComplaint: string;
  diagnosis: string;
  medicines: Medicine[];
  advice: string;
  followUp: string;
  savedAt: string;
}

interface PrescriptionWriterProps {
  activeToken: Token | null;
  settings: ClinicSettings | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const FREQ_OPTIONS = [
  '1-0-0', '0-1-0', '0-0-1',
  '1-0-1', '1-1-0', '0-1-1',
  '1-1-1', '1-1-1-1', 'SOS',
  'Once daily', 'Twice daily', 'Thrice daily',
];

const DURATION_OPTIONS = [
  '1 day', '2 days', '3 days', '5 days', '7 days',
  '10 days', '14 days', '1 month', '3 months',
];

const INSTRUCTION_OPTIONS = [
  'Before food', 'After food', 'With food',
  'At bedtime', 'Empty stomach', 'As needed',
];

function emptyMedicine(): Medicine {
  return { id: uid(), name: '', dosage: '', frequency: '1-0-1', duration: '5 days', instructions: 'After food' };
}

function loadHistory(): Prescription[] {
  try {
    return JSON.parse(localStorage.getItem('dhanvantri_prescriptions') || '[]');
  } catch { return []; }
}

function saveHistory(list: Prescription[]) {
  localStorage.setItem('dhanvantri_prescriptions', JSON.stringify(list.slice(0, 20)));
}

function prescriptionToText(rx: Prescription, clinicName: string, doctorName: string): string {
  const lines: string[] = [
    `🏥 ${clinicName}`,
    `👨‍⚕️ ${doctorName}`,
    `📅 Date: ${rx.date}`,
    ``,
    `👤 Patient: ${rx.patientName}${rx.age ? `, ${rx.age} yrs` : ''}`,
    rx.phone ? `📞 ${rx.phone}` : '',
    rx.tokenNumber ? `🎫 Token #${rx.tokenNumber}` : '',
    ``,
    rx.chiefComplaint ? `🗣️ Complaint: ${rx.chiefComplaint}` : '',
    rx.diagnosis ? `🔬 Diagnosis: ${rx.diagnosis}` : '',
    ``,
    `💊 *Medicines (Rx):*`,
  ];

  rx.medicines.forEach((m, i) => {
    if (m.name) {
      lines.push(`${i + 1}. ${m.name}${m.dosage ? ` ${m.dosage}` : ''} — ${m.frequency} × ${m.duration}${m.instructions ? ` (${m.instructions})` : ''}`);
    }
  });

  if (rx.advice) {
    lines.push('', `📋 *Advice:*`, rx.advice);
  }
  if (rx.followUp) {
    lines.push('', `📆 *Follow-up:* ${rx.followUp}`);
  }

  return lines.filter(Boolean).join('\n');
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const PrescriptionWriter: React.FC<PrescriptionWriterProps> = ({
  activeToken,
  settings,
}) => {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const todayISO = new Date().toISOString().split('T')[0];

  const [patientName, setPatientName] = useState(activeToken?.patient?.full_name || '');
  const [age, setAge] = useState<string>(activeToken?.patient?.age?.toString() || '');
  const [phone, setPhone] = useState(activeToken?.patient?.phone || '');
  const [tokenNum, setTokenNum] = useState<string>(activeToken?.token_number?.toString() || '');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([emptyMedicine()]);
  const [advice, setAdvice] = useState('');
  const [followUp, setFollowUp] = useState('');

  const [history, setHistory] = useState<Prescription[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Fill form from active token when it changes
  React.useEffect(() => {
    if (activeToken) {
      setPatientName(activeToken.patient?.full_name || '');
      setAge(activeToken.patient?.age?.toString() || '');
      setPhone(activeToken.patient?.phone || '');
      setTokenNum(activeToken.token_number?.toString() || '');
    }
  }, [activeToken?.id]);

  // ── Medicine row helpers ──────────────────────────────────────────────────

  const addMedicine = () => setMedicines((p) => [...p, emptyMedicine()]);

  const updateMedicine = useCallback((id: string, field: keyof Medicine, value: string) => {
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  }, []);

  const removeMedicine = (id: string) =>
    setMedicines((prev) => prev.filter((m) => m.id !== id));

  // ── Build Prescription object ─────────────────────────────────────────────

  const buildRx = (): Prescription => ({
    id: uid(),
    date: today,
    patientName,
    age: age ? parseInt(age) : null,
    phone: phone || null,
    tokenNumber: tokenNum ? parseInt(tokenNum) : null,
    chiefComplaint,
    diagnosis,
    medicines,
    advice,
    followUp,
    savedAt: new Date().toISOString(),
  });

  // ── Save to history ───────────────────────────────────────────────────────

  const handleSave = () => {
    const rx = buildRx();
    const newHistory = [rx, ...history];
    setHistory(newHistory);
    saveHistory(newHistory);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  // ── Print ─────────────────────────────────────────────────────────────────

  const handlePrint = () => {
    handleSave();
    setTimeout(() => window.print(), 200);
  };

  // ── WhatsApp Share ────────────────────────────────────────────────────────

  const handleShare = () => {
    const rx = buildRx();
    const text = prescriptionToText(rx, settings?.clinic_name || 'Dhanvantri Clinic', settings?.doctor_name || 'Dr Yogesh');
    setShareMsg(text);
  };

  const sendWhatsApp = (number: string, text: string) => {
    const clean = number.replace(/\D/g, '');
    const url = `https://wa.me/${clean.startsWith('91') ? clean : '91' + clean}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setShareMsg(null);
  };

  // ── Load from history ─────────────────────────────────────────────────────

  const loadRx = (rx: Prescription) => {
    setPatientName(rx.patientName);
    setAge(rx.age?.toString() || '');
    setPhone(rx.phone || '');
    setTokenNum(rx.tokenNumber?.toString() || '');
    setChiefComplaint(rx.chiefComplaint);
    setDiagnosis(rx.diagnosis);
    setMedicines(rx.medicines.length ? rx.medicines : [emptyMedicine()]);
    setAdvice(rx.advice);
    setFollowUp(rx.followUp);
    setShowHistory(false);
  };

  const deleteFromHistory = (id: string) => {
    const updated = history.filter((r) => r.id !== id);
    setHistory(updated);
    saveHistory(updated);
  };

  const clinicName = settings?.clinic_name || 'Dhanvantri Clinic';
  const doctorName = settings?.doctor_name || 'Dr Yogesh';
  const clinicPhone = settings?.phone_number || '';
  const clinicAddress = settings?.address || 'Sandhya Theater Complex, VP Road, BTM Layout, Bengaluru';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ════ PRINT-ONLY STYLES ════════════════════════════════════════════ */}
      <style>{`
        @media print {
          body > *:not(#prescription-print-root) { display: none !important; }
          #prescription-print-root { display: block !important; }
          .no-print { display: none !important; }
        }
        @media screen {
          #prescription-print-root { display: none; }
        }
      `}</style>

      {/* ════ PRINT TEMPLATE (hidden on screen, shown only during print) ═══ */}
      <div id="prescription-print-root" ref={printRef}>
        <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 720, margin: '0 auto', padding: '24px 32px', fontSize: 13, color: '#000' }}>
          {/* Header */}
          <div style={{ borderBottom: '3px solid #1a56db', paddingBottom: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1a56db', letterSpacing: '-0.5px' }}>{clinicName}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginTop: 2 }}>{doctorName}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{clinicAddress}</div>
              {clinicPhone && <div style={{ fontSize: 11, color: '#6b7280' }}>📞 {clinicPhone}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Date: <strong>{today}</strong></div>
              {tokenNum && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Token #: <strong>{tokenNum}</strong></div>}
            </div>
          </div>

          {/* Patient Info */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 16, background: '#f9fafb', padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div><span style={{ color: '#6b7280', fontSize: 11 }}>PATIENT</span><br /><strong style={{ fontSize: 15 }}>{patientName || '—'}</strong></div>
            {age && <div><span style={{ color: '#6b7280', fontSize: 11 }}>AGE</span><br /><strong>{age} yrs</strong></div>}
            {phone && <div><span style={{ color: '#6b7280', fontSize: 11 }}>PHONE</span><br /><strong>{phone}</strong></div>}
          </div>

          {/* Complaint & Diagnosis */}
          {chiefComplaint && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontWeight: 700, color: '#374151', fontSize: 12 }}>Chief Complaint: </span>
              <span>{chiefComplaint}</span>
            </div>
          )}
          {diagnosis && (
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontWeight: 700, color: '#374151', fontSize: 12 }}>Diagnosis: </span>
              <span style={{ fontWeight: 600 }}>{diagnosis}</span>
            </div>
          )}

          {/* Medicines */}
          {medicines.some((m) => m.name) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 900, borderBottom: '1px solid #d1d5db', paddingBottom: 4, marginBottom: 8, letterSpacing: '-0.3px' }}>℞ Medicines</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>#</th>
                    <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Medicine</th>
                    <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Dosage</th>
                    <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Frequency</th>
                    <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Duration</th>
                    <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.filter((m) => m.name).map((m, i) => (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td style={{ padding: '5px 8px', border: '1px solid #e5e7eb', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #e5e7eb', fontWeight: 600 }}>{m.name}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #e5e7eb' }}>{m.dosage}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #e5e7eb' }}>{m.frequency}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #e5e7eb' }}>{m.duration}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #e5e7eb' }}>{m.instructions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Advice */}
          {advice && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>📋 Advice / Instructions</div>
              <div style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', whiteSpace: 'pre-line', fontSize: 12 }}>{advice}</div>
            </div>
          )}

          {/* Follow-Up */}
          {followUp && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>📆 Follow-Up: </span>
              <span>{followUp}</span>
            </div>
          )}

          {/* Footer signature */}
          <div style={{ marginTop: 32, borderTop: '1px solid #d1d5db', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>Generated by Dhanvantri Digital Queue System · KSIT CSE 25BCP308</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ borderTop: '1px solid #374151', paddingTop: 4, minWidth: 160, fontSize: 11 }}>
                <div style={{ fontWeight: 700 }}>{doctorName}</div>
                <div style={{ color: '#6b7280' }}>Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════ SCREEN UI ═══════════════════════════════════════════════════════ */}
      <div className="no-print space-y-6 pb-12">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-black text-foreground">Prescription Writer</h2>
            {activeToken && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700">
                Auto-filled from Token #{activeToken.token_number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm font-bold hover:bg-muted text-muted-foreground transition-colors"
            >
              <History className="w-4 h-4" />
              History ({history.length})
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm font-bold hover:bg-muted transition-colors"
            >
              <Save className="w-4 h-4" />
              {savedMsg ? '✓ Saved!' : 'Save Draft'}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow transition-colors"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-700 text-primary-foreground rounded-xl text-sm font-bold shadow transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / PDF
            </button>
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="bg-muted/50 border rounded-2xl p-4 space-y-3 animate-fade-in-up">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Recent Prescriptions</h3>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved prescriptions yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {history.map((rx) => (
                  <div key={rx.id} className="flex items-center justify-between bg-card border rounded-xl px-4 py-3 gap-3">
                    <div>
                      <span className="font-bold text-sm text-foreground">{rx.patientName}</span>
                      {rx.age && <span className="text-xs text-muted-foreground ml-2">{rx.age} yrs</span>}
                      {rx.tokenNumber && <span className="ml-2 text-xs font-bold text-primary">Token #{rx.tokenNumber}</span>}
                      <div className="text-xs text-muted-foreground mt-0.5">{rx.date} · {rx.medicines.filter(m => m.name).length} medicine(s)</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => loadRx(rx)} className="text-xs font-bold text-primary hover:underline">Load</button>
                      <button onClick={() => deleteFromHistory(rx.id)} className="text-xs font-bold text-destructive hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Two-column form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Patient + Clinical */}
          <div className="lg:col-span-7 space-y-5">

            {/* Patient Details */}
            <div className="bg-card border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <ClipboardList className="w-4 h-4 text-primary" />
                <h3 className="font-black text-sm uppercase tracking-wider">Patient Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Patient Name *</label>
                  <input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Full name"
                    className="mt-1 w-full h-11 px-3 border rounded-xl text-base bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Age (yrs)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="30"
                    min={0} max={120}
                    className="mt-1 w-full h-11 px-3 border rounded-xl text-base bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="mt-1 w-full h-11 px-3 border rounded-xl text-base bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Token #</label>
                  <input
                    type="number"
                    value={tokenNum}
                    onChange={(e) => setTokenNum(e.target.value)}
                    placeholder="Auto"
                    className="mt-1 w-full h-11 px-3 border rounded-xl text-base bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Date</label>
                  <input
                    type="date"
                    defaultValue={todayISO}
                    className="mt-1 w-full h-11 px-3 border rounded-xl text-base bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Chief Complaint & Diagnosis */}
            <div className="bg-card border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Stethoscope className="w-4 h-4 text-primary" />
                <h3 className="font-black text-sm uppercase tracking-wider">Clinical Notes</h3>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Chief Complaint</label>
                <textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. Fever, cough and cold for 3 days..."
                  rows={2}
                  className="mt-1 w-full px-3 py-2 border rounded-xl text-base bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Diagnosis / Impression</label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute viral upper respiratory tract infection (URTI)"
                  rows={2}
                  className="mt-1 w-full px-3 py-2 border rounded-xl text-base bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Advice + Follow-up */}
            <div className="bg-card border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="font-black text-sm uppercase tracking-wider">Advice & Follow-Up</h3>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Advice / Instructions</label>
                <textarea
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  placeholder="e.g. Rest, drink plenty of fluids. Avoid cold food. Steam inhalation twice daily."
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border rounded-xl text-base bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Follow-Up Date / Note
                </label>
                <input
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder="e.g. After 5 days if not improving, or on 20 Nov"
                  className="mt-1 w-full h-11 px-3 border rounded-xl text-base bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Medicines (Rx) */}
          <div className="lg:col-span-5">
            <div className="bg-card border rounded-2xl p-5 space-y-4 sticky top-24">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-primary" />
                  <h3 className="font-black text-sm uppercase tracking-wider">℞ Medicines</h3>
                </div>
                <button
                  onClick={addMedicine}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold shadow hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {medicines.map((m, idx) => (
                  <div key={m.id} className="bg-muted/40 border border-dashed rounded-xl p-3 space-y-2 relative">
                    {/* Row number + delete */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-primary uppercase">Medicine #{idx + 1}</span>
                      {medicines.length > 1 && (
                        <button
                          onClick={() => removeMedicine(m.id)}
                          className="text-destructive hover:text-destructive/70 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Name */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Drug Name</label>
                      <input
                        value={m.name}
                        onChange={(e) => updateMedicine(m.id, 'name', e.target.value)}
                        placeholder="e.g. Paracetamol, Azithromycin..."
                        className="mt-0.5 w-full h-9 px-2.5 border rounded-lg text-sm bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    {/* Dosage */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Dosage</label>
                      <input
                        value={m.dosage}
                        onChange={(e) => updateMedicine(m.id, 'dosage', e.target.value)}
                        placeholder="500 mg / 10 ml"
                        className="mt-0.5 w-full h-9 px-2.5 border rounded-lg text-sm bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Frequency</label>
                      <select
                        value={m.frequency}
                        onChange={(e) => updateMedicine(m.id, 'frequency', e.target.value)}
                        className="mt-0.5 w-full h-9 px-2.5 border rounded-lg text-sm bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        {FREQ_OPTIONS.map((f) => <option key={f}>{f}</option>)}
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Duration</label>
                      <select
                        value={m.duration}
                        onChange={(e) => updateMedicine(m.id, 'duration', e.target.value)}
                        className="mt-0.5 w-full h-9 px-2.5 border rounded-lg text-sm bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        {DURATION_OPTIONS.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </div>

                    {/* Instructions */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Instructions</label>
                      <select
                        value={m.instructions}
                        onChange={(e) => updateMedicine(m.id, 'instructions', e.target.value)}
                        className="mt-0.5 w-full h-9 px-2.5 border rounded-lg text-sm bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        {INSTRUCTION_OPTIONS.map((i) => <option key={i}>{i}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addMedicine}
                className="w-full h-10 border-2 border-dashed rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Another Medicine
              </button>
            </div>
          </div>
        </div>

        {/* Sticky bottom action bar on mobile */}
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background border-t px-4 py-3 flex gap-2 shadow-lg z-30 no-print">
          <button onClick={handleShare} className="flex-1 h-12 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
          <button onClick={handlePrint} className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* ════ WhatsApp Share Modal ═════════════════════════════════════════════ */}
      {shareMsg && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 no-print">
          <div className="bg-card border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-black text-lg flex items-center gap-2">
                <Share2 className="w-5 h-5 text-green-600" /> Send via WhatsApp
              </h4>
              <button onClick={() => setShareMsg(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-muted rounded-xl p-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border">
              {shareMsg}
            </div>

            <div className="space-y-3">
              {phone ? (
                <button
                  onClick={() => sendWhatsApp(phone, shareMsg)}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  Send to {phone}
                </button>
              ) : (
                <div className="text-sm text-muted-foreground text-center">No phone number on file. Enter manually:</div>
              )}
              <div className="flex gap-2">
                <input
                  id="wa-manual-phone"
                  placeholder="Enter phone: 98XXXXXXXX"
                  defaultValue={phone}
                  className="flex-1 h-11 px-3 border rounded-xl text-sm bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <button
                  onClick={() => {
                    const inp = (document.getElementById('wa-manual-phone') as HTMLInputElement)?.value;
                    if (inp) sendWhatsApp(inp, shareMsg);
                  }}
                  className="h-11 px-4 bg-green-600 text-white rounded-xl font-bold"
                >
                  Send
                </button>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareMsg);
                  setShareMsg(null);
                }}
                className="w-full h-11 border rounded-xl font-bold text-sm hover:bg-muted transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timer icon used for clock symbol in print-only footer */}
      <Clock className="hidden" aria-hidden />
    </>
  );
};

