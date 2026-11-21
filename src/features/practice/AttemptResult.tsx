import { Icon } from '../../components/Icon';
import { BeatBar, MatchChart, Meter, ScoreRing, TipList } from '../../components/ui';
import { PASS_SCORE } from '../../pose/compare';
import type { CompareResult, Tip } from '../../pose/types';

interface Props {
  result: CompareResult;
  tips: Tip[];
  stepName: string;
  crowd: number;
  onRetry: () => void;
  onNext?: () => void;
  onTest?: () => void;
}

/** Hasil satu percobaan: cincin skor, wiraga/wirama, grafik, maks. 3 koreksi. */
export function AttemptResult({ result, tips, stepName, crowd, onRetry, onNext, onTest }: Props) {
  const passed = result.score >= PASS_SCORE;
  return (
    <section className="kartu-gelap p-5 sm:p-6" aria-labelledby="judul-hasil">
      <div className="flex flex-wrap items-center gap-6">
        <ScoreRing score={result.score} dark size={140} />
        <div className="min-w-[200px] flex-1">
          <span className={`chip ${passed ? 'bg-tepat/15 text-tepat' : 'bg-perbaiki/20 text-perbaiki-terang'}`}>
            <Icon name={passed ? 'check' : 'refresh'} size={14} strokeWidth={2.4} />{passed ? 'Lulus' : 'Belum lulus'}
          </span>
          <h2 id="judul-hasil" className="mt-2 text-[24px]" aria-live="polite">
            {passed ? 'Bab ini lulus.' : `Kurang ${PASS_SCORE - result.score} poin lagi.`}
          </h2>
          <p className="mt-1 text-[14px] text-muted-gelap">
            {passed ? 'Skor terbaik tersimpan. Lanjutkan ke bab berikutnya atau ulangi untuk skor lebih tinggi.' : `Lulus bila skor ${PASS_SCORE} atau lebih. Perhatikan koreksi di bawah lalu coba lagi.`}
          </p>
        </div>
      </div>

      {result.coverage < 0.6 && (
        <p className="mt-5 flex gap-2 rounded-[10px] bg-hampir/10 p-3 text-[14px] text-hampir" role="note">
          <Icon name="alert" size={18} className="shrink-0" />Badanmu sering tidak terlihat penuh ({Math.round(result.coverage * 100)}% cuplikan). Mundur sedikit agar penilaian lebih akurat.
        </p>
      )}
      {crowd >= 0.15 && (
        <p className="mt-3 flex gap-2 rounded-[10px] bg-perbaiki/15 p-3 text-[14px] text-perbaiki-terang" role="note">
          <Icon name="users" size={18} className="shrink-0" />Terdeteksi lebih dari satu orang di kamera. Pastikan hanya kamu yang terlihat.
        </p>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Meter dark label="Wiraga, ketepatan gerak" value={result.wiraga} />
        <Meter dark label="Wirama, ketepatan irama" value={result.wirama} />
      </div>

      <div className="mt-6">
        <h3 className="label-kecil text-prada">Kecocokan sepanjang gerak</h3>
        <div className="mt-3"><MatchChart values={result.curve} dark /></div>
      </div>

      <div className="mt-6">
        <h3 className="label-kecil text-prada">Skor per hitungan</h3>
        <div className="mt-3"><BeatBar counts={result.perCount.length} active={null} scores={result.perCount} /></div>
      </div>

      <div className="mt-6">
        <h3 className="label-kecil text-prada">Koreksi utama</h3>
        <div className="mt-3"><TipList tips={tips.slice(0, 3)} dark /></div>
        <p className="sr-only">Gerak: {stepName}</p>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button type="button" className={passed ? 'tombol-garis-gelap' : 'tombol-utama'} onClick={onRetry}><Icon name="refresh" size={18} />Coba lagi</button>
        {passed && onNext && <button type="button" className="tombol-utama" onClick={onNext}>Lanjut ke bagian berikutnya<Icon name="arrow" size={18} /></button>}
        {passed && onTest && <button type="button" className="tombol-utama" onClick={onTest}>Ke tes akhir<Icon name="arrow" size={18} /></button>}
      </div>
    </section>
  );
}
