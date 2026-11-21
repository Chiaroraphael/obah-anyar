import { z } from 'zod';

/** Nama tampilan: 3–24 karakter, huruf/angka/spasi/titik/garis bawah (sama dengan CHECK di database). */
export const displayNameSchema = z
  .string()
  .trim()
  .min(3, 'Nama panggilan minimal 3 karakter')
  .max(24, 'Nama panggilan maksimal 24 karakter')
  .regex(/^[\p{L}\p{N} ._]+$/u, 'Hanya huruf, angka, spasi, titik, dan garis bawah');

export const passwordSchema = z
  .string()
  .min(8, 'Kata sandi minimal 8 karakter')
  .regex(/[A-Za-z]/, 'Kata sandi harus berisi huruf')
  .regex(/\d/, 'Kata sandi harus berisi angka');

export const emailSchema = z.string().trim().min(1, 'Email wajib diisi').email('Format email tidak valid');

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Kata sandi wajib diisi') });

export const registerSchema = z
  .object({
    display_name: displayNameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(['pelajar', 'maestro', 'guru'], { errorMap: () => ({ message: 'Pilih peranmu' }) }),
    age: z.enum(['17+', '<17'], { errorMap: () => ({ message: 'Pilih rentang usia' }) }),
    guardian_email: z.string().trim().optional(),
    guardian_consent: z.boolean().optional(),
    agree: z.literal(true, { errorMap: () => ({ message: 'Kamu perlu menyetujui Syarat & Kebijakan Privasi' }) }),
  })
  .superRefine((v, ctx) => {
    if (v.age === '<17') {
      if (!v.guardian_email || !z.string().email().safeParse(v.guardian_email).success)
        ctx.addIssue({ code: 'custom', path: ['guardian_email'], message: 'Email orang tua/wali wajib diisi dengan benar' });
      if (!v.guardian_consent) ctx.addIssue({ code: 'custom', path: ['guardian_consent'], message: 'Persetujuan orang tua/wali wajib dicentang' });
      if (v.role === 'maestro') ctx.addIssue({ code: 'custom', path: ['role'], message: 'Peran maestro hanya untuk usia 17 tahun ke atas' });
    }
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const resetRequestSchema = z.object({ email: emailSchema });
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Konfirmasi kata sandi tidak sama' });

export const sanggarSchema = z.object({
  name: z.string().trim().min(3, 'Nama sanggar minimal 3 karakter').max(80),
  city: z.string().trim().min(2, 'Kota wajib diisi').max(60),
  province: z.string().trim().min(2, 'Provinsi wajib diisi').max(60),
  description: z.string().trim().max(600, 'Maksimal 600 karakter').optional().default(''),
  contact_email: emailSchema,
});
export type SanggarInput = z.infer<typeof sanggarSchema>;

export const inviteCodeSchema = z.object({ invite_code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8}$/, 'Kode undangan terdiri atas 8 huruf/angka') });

/** Skor kekuatan kata sandi 0–4 untuk indikator. */
export function passwordStrength(pw: string): { score: number; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) s = Math.min(s, 1);
  return { score: s, label: ['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'][s] };
}
