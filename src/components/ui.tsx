/** Komponen kecil bersama: Logo, StatusChip, ScoreRing, Meter, BeatBar, TipList, EmptyState, Skeleton, Modal. */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import type { SegmentStatus, Tip } from '../pose/types';

export function LogoMark({ size = 36 }: { size?: number }) {
  const e = (style: React.CSSProperties) => <i style={style} />;
  const s = size;
  return (
    <span className="logo-kawung inline-block shrink-0" style={{ width: s, height: s }} aria-hidden>
      <span>
        {e({ width: s * 0.22, height: s * 0.34, left: s * 0.39, top: s * 0.1 })}
        {e({ width: s * 0.22, height: s * 0.34, left: s * 0.39, top: s * 0.56 })}
        {e({ width: s * 0.34, height: s * 0.22, left: s * 0.1, top: s * 0.39 })}
        {e({ width: s * 0.34, height: s * 0.22, left: s * 0.56, top: s * 0.39 })}
      </span>
      <b />
    </span>
  );
}

export function Logo({ dark = false, aksara = false }: { dark?: boolean; aksara?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 min-h-[44px]" aria-label="Obah Anyar, ke beranda">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[20px] font-medium tracking-[-0.02em] ${dark ? 'text-mori' : 'text-nila'}`}>Obah Anyar</span>
        {aksara && <span className={`font-jawa text-[11px] mt-1 ${dark ? 'text-prada' : 'text-soga'}`} aria-hidden>ꦲꦺꦴꦧꦃꦲꦚꦂ</span>}
      </span>
    </Link>
  );
}

const STATUS_STYLE: Record<string, string> = {
  tepat: 'bg-tepat/15 text-pendar-teks',
  hampir: 'bg-hampir/20 text-hampir-teks',
  perbaiki: 'bg-perbaiki/12 text-perbaiki-teks',
  lulus: 'bg-pendar/12 text-pendar-teks',
  aktif: 'bg-prada/20 text-prada-teks',
  kunci: 'bg-nila/5 text-muted',
  draf: 'bg-nila/5 text-muted',
  ditinjau: 'bg-hampir/20 text-hampir-teks',
  terbit: 'bg-pendar/12 text-pendar-teks',
  ditolak: 'bg-perbaiki/12 text-perbaiki-teks',
  live: 'bg-pendar/15 text-pendar-teks',
};

export function StatusChip({ tone, children, dark, icon }: { tone: keyof typeof STATUS_STYLE | string; children: ReactNode; dark?: boolean; icon?: string }) {
  const darkStyle: Record<string, string> = {
    tepat: 'bg-tepat/15 text-tepat', hampir: 'bg-hampir/15 text-hampir', perbaiki: 'bg-perbaiki/20 text-perbaiki-terang', live: 'bg-pendar/15 text-tepat', aktif: 'bg-prada/20 text-prada', kunci: 'bg-white/10 text-muted-gelap',
  };
  return (
    <span className={`chip ${dark ? darkStyle[tone] ?? 'bg-white/10 text-mori' : STATUS_STYLE[tone] ?? 'bg-nila/5 text-nila'}`}>
      {icon && <Icon name={icon} size={14} strokeWidth={2.2} />}
      {children}
    </span>
  );
}

export function scoreTone(score: number): SegmentStatus { return score >= 80 ? 'tepat' : score >= 70 ? 'hampir' : 'perbaiki'; }

export function ScoreRing({ score, size = 132, label = 'Skor', dark = false, stroke = 10 }: { score: number | null; size?: number; label?: string; dark?: boolean; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = score == null ? 0 : Math.max(0, Math.min(100, score));
  const color = score == null ? 'transparent' : score >= 70 ? (dark ? '#3FCFB8' : '#2FB8A6') : '#E8553E';
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${score ?? 'belum ada'}${score != null ? ' dari 100' : ''}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? 'rgba(255,255,255,.1)' : '#EADFC8'} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className={`angka leading-none ${dark ? 'text-mori' : 'text-nila'}`} style={{ fontSize: size * 0.3 }}>{score ?? '–'}</span>
        <span className={`label-kecil mt-1 ${dark ? 'text-muted-gelap' : 'text-muted'}`} style={{ fontSize: Math.max(10, size * 0.08) }}>{label}</span>
      </div>
    </div>
  );
}

export function ProgressRing({ done, total, size = 76 }: { done: number; total: number; size?: number }) {
  const stroke = 7, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = total ? done / total : 0;
  return (
    <div className="relative inline-grid place-items-center shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${done} dari ${total} bab lulus`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EADFC8" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#D4A23A" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <span className="absolute angka text-[17px]">{done}/{total}</span>
    </div>
  );
}

export function Meter({ label, value, hint, dark }: { label: string; value: number; hint?: string; dark?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`label-kecil ${dark ? 'text-muted-gelap' : 'text-soga'}`}>{label}</span>
        <span className="angka text-[20px]">{value}</span>
      </div>
      <div className={`mt-2 h-2 rounded-full overflow-hidden ${dark ? 'bg-white/10' : 'bg-mori-tua'}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: value >= 70 ? '#2FB8A6' : '#E8553E', transition: 'width .6s ease' }} />
      </div>
      {hint && <p className={`mt-1.5 text-[14px] ${dark ? 'text-muted-gelap' : 'text-muted'}`}>{hint}</p>}
    </div>
  );
}

const DELAPAN = 8;

/**
 * Baris hitungan; hitungan aktif disorot; skor per hitungan opsional.
 * Gerak panjang (lebih dari 16 hitungan) ditampilkan per "delapan hitungan" yang sedang berjalan;
 * hasil akhir (tanpa hitungan aktif, dengan skor) ditampilkan utuh, 16 per baris.
 */
export function BeatBar({ counts, active, scores, dark = true, compact }: { counts: number; active: number | null; scores?: (number | null)[]; dark?: boolean; compact?: boolean }) {
  const panjang = counts > 16;
  const ringkasan = panjang && active == null && Boolean(scores);
  const perDelapan = panjang && !ringkasan;
  const kelompok = perDelapan ? Math.floor((Math.max(1, active ?? 1) - 1) / DELAPAN) : 0;
  const mulai = perDelapan ? kelompok * DELAPAN : 0;
  const jumlah = perDelapan ? Math.min(DELAPAN, counts - mulai) : counts;
  const kolom = perDelapan ? DELAPAN : ringkasan ? 16 : counts;
  const muted = dark ? 'text-muted-gelap' : 'text-muted';
  return (
    <div>
      {perDelapan && (
        <p className={`mb-1.5 flex items-center justify-between text-[12px] font-semibold ${muted}`}>
          <span>Delapan ke-{kelompok + 1} dari {Math.ceil(counts / DELAPAN)}</span>
          <span className="angka">Hitungan {active ?? '–'}/{counts}</span>
        </p>
      )}
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${kolom}, minmax(0, 1fr))` }} aria-label="Hitungan">
        {Array.from({ length: jumlah }, (_, k) => {
          const i = mulai + k;
          const n = i + 1;
          const s = scores?.[i];
          const isActive = active === n;
          const tone = s == null ? null : scoreTone(s);
          const toneBg = tone === 'tepat' ? 'bg-tepat text-nila' : tone === 'hampir' ? 'bg-hampir text-nila' : tone === 'perbaiki' ? 'bg-perbaiki text-mori' : '';
          return (
            <li
              key={n}
              aria-current={isActive ? 'step' : undefined}
              className={`grid place-items-center rounded-[10px] ${compact || ringkasan ? 'h-9' : 'h-11'} angka ${ringkasan ? 'text-[13px]' : 'text-[15px]'} transition-colors ${
                isActive ? 'bg-prada text-nila ring-2 ring-prada/40' : tone ? toneBg : dark ? 'bg-white/[0.06] text-muted-gelap' : 'bg-mori-tua/60 text-muted'
              }`}
            >
              <span className="sr-only">Hitungan </span>{perDelapan ? k + 1 : n}
              {perDelapan && <span className="sr-only"> (hitungan {n} dari {counts})</span>}
              {s != null && <span className="sr-only">: skor {s}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function TipList({ tips, dark, stepName }: { tips: Tip[]; dark?: boolean; stepName?: string }) {
  if (!tips.length) return <p className={`text-[14px] ${dark ? 'text-muted-gelap' : 'text-muted'}`}>Tidak ada koreksi besar. Pertahankan.</p>;
  return (
    <ul className="space-y-2.5">
      {tips.map((t) => (
        <li key={t.count + t.key} className={`flex gap-3 rounded-[10px] p-3 ${dark ? 'bg-white/[0.05]' : 'bg-mori border border-mori-tua'}`}>
          <span className={`grid h-9 min-w-[44px] place-items-center rounded-[10px] px-2 angka text-[14px] ${t.severity === 'perbaiki' ? 'bg-perbaiki text-mori' : 'bg-hampir text-nila'}`}>
            {stepName ? `H${t.count}` : `H${t.count}`}
          </span>
          <div>
            {stepName && <div className={`label-kecil ${dark ? 'text-muted-gelap' : 'text-soga'}`}>{stepName}, hitungan {t.count}</div>}
            <p className="text-[15px] font-semibold leading-snug">{t.text}</p>
            <p className={`text-[12px] mt-0.5 ${dark ? 'text-muted-gelap' : 'text-muted'}`}>{t.severity === 'perbaiki' ? 'Perbaiki' : 'Hampir'}, hitungan {t.count}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({ icon = 'info', title, children, action, dark }: { icon?: string; title: string; children?: ReactNode; action?: ReactNode; dark?: boolean }) {
  return (
    <div className={`rounded-kartu border border-dashed p-8 text-center ${dark ? 'border-white/15' : 'border-mori-tua bg-white/40'}`}>
      <span className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${dark ? 'bg-white/5 text-prada' : 'bg-mori-tua/60 text-soga'}`}><Icon name={icon} /></span>
      <h3 className="mt-4 text-[18px]">{title}</h3>
      {children && <div className={`mx-auto mt-2 max-w-md text-[15px] ${dark ? 'text-muted-gelap' : 'text-muted'}`}>{children}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}
export function SkeletonList({ rows = 3, className = 'h-16' }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-3" role="status" aria-label="Memuat">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={className} />)}
      <span className="sr-only">Memuat…</span>
    </div>
  );
}

export function Modal({ open, onClose, title, children, dark }: { open: boolean; onClose: () => void; title: string; children: ReactNode; dark?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={`w-[min(480px,calc(100vw-32px))] rounded-kartu p-0 backdrop:bg-nila-malam/70 ${dark ? 'bg-nila text-mori' : 'bg-mori text-nila'}`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id={id} className="text-[20px]">{title}</h2>
          <button type="button" onClick={onClose} className="-mr-2 -mt-2 grid h-11 w-11 place-items-center rounded-full hover:bg-nila/5" aria-label="Tutup">
            <Icon name="x" />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </dialog>
  );
}

/** Grafik kecocokan sepanjang gerak dengan garis batas lulus 70. */
export function MatchChart({ values, dark, height = 120, markers }: { values: number[]; dark?: boolean; height?: number; markers?: { at: number; label: string }[] }) {
  const w = 600;
  const h = height;
  const pad = 4;
  if (!values.length) return null;
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * w;
  const y = (v: number) => pad + (1 - v / 100) * (h - pad * 2);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label={`Grafik kecocokan sepanjang gerak, rata-rata ${avg}. Garis batas lulus 70.`}>
        <path d={area} fill={dark ? 'rgba(63,207,184,.12)' : 'rgba(47,184,166,.12)'} />
        <path d={line} fill="none" stroke={dark ? '#3FCFB8' : '#2FB8A6'} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
        <line x1={0} x2={w} y1={y(70)} y2={y(70)} stroke={dark ? '#F3B63F' : '#8A4A2A'} strokeDasharray="6 5" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        {markers?.map((m) => <line key={m.at} x1={m.at * w} x2={m.at * w} y1={0} y2={h} stroke={dark ? 'rgba(255,255,255,.15)' : '#EADFC8'} strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
      </svg>
      <figcaption className={`mt-1.5 flex justify-between text-[12px] ${dark ? 'text-muted-gelap' : 'text-muted'}`}>
        <span>Awal gerak</span>
        <span className="font-bold">- - - batas lulus 70</span>
        <span>Akhir</span>
      </figcaption>
    </figure>
  );
}

export function SampleBadge() {
  return <span className="chip bg-hampir/20 text-hampir-teks" title="Bukan data asli">Data contoh</span>;
}
