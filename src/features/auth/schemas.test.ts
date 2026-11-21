import { describe, expect, it } from 'vitest';
import { displayNameSchema, inviteCodeSchema, passwordSchema, passwordStrength, registerSchema } from './schemas';

const base = { display_name: 'Sekar', email: 'a@b.co', password: 'rahasia123', role: 'pelajar', age: '17+', agree: true } as const;

describe('validasi form', () => {
  it('nama tampilan', () => {
    expect(displayNameSchema.safeParse('Sekar_Ayu.2').success).toBe(true);
    expect(displayNameSchema.safeParse('ab').success).toBe(false);
    expect(displayNameSchema.safeParse('nama<script>').success).toBe(false);
  });
  it('kata sandi wajib huruf dan angka', () => {
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(false);
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
    expect(passwordSchema.safeParse('abcd1234').success).toBe(true);
  });
  it('daftar valid', () => { expect(registerSchema.safeParse(base).success).toBe(true); });
  it('wajib setuju syarat', () => { expect(registerSchema.safeParse({ ...base, agree: false }).success).toBe(false); });
  it('di bawah 17 butuh wali', () => {
    expect(registerSchema.safeParse({ ...base, age: '<17' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, age: '<17', guardian_email: 'wali@b.co', guardian_consent: true }).success).toBe(true);
  });
  it('kode undangan', () => {
    expect(inviteCodeSchema.safeParse({ invite_code: 'ab12cd34' }).success).toBe(true);
    expect(inviteCodeSchema.safeParse({ invite_code: 'abc' }).success).toBe(false);
  });
  it('kekuatan kata sandi', () => {
    expect(passwordStrength('abc').score).toBeLessThanOrEqual(1);
    expect(passwordStrength('Rahasia!2026xyz').score).toBe(4);
  });
});
