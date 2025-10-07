import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { ensureUserProfile } from './auth.supabase';

type MockReturn = {
  supabase: any;
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  selectAfterInsert: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

const createSupabaseMock = (): MockReturn => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq, maybeSingle }));
  const single = vi.fn();
  const selectAfterInsert = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select: selectAfterInsert }));
  const from = vi.fn(() => ({ select, insert }));

  return {
    supabase: { from } as unknown,
    from,
    select,
    eq,
    maybeSingle,
    insert,
    selectAfterInsert,
    single,
  };
};

const createGoogleUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-123',
    email: 'adventurer@example.com',
    app_metadata: { provider: 'google' },
    user_metadata: {
      full_name: 'Test Adventurer',
      avatar_url: 'https://example.com/avatar.png',
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    role: 'authenticated',
    confirmed_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    phone: '',
    factor_ids: [],
    identities: [],
    invited_at: null,
    is_anonymous: false,
    phone_confirmed_at: null,
    recovery_sent_at: null,
    updated_at: new Date().toISOString(),
    raw_app_meta_data: {},
    raw_user_meta_data: {},
    ...overrides,
  }) as unknown as User;

describe('ensureUserProfile', () => {
  let logger: { error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    logger = {
      error: vi.fn(),
      warn: vi.fn(),
    };
  });

  it('returns existing profile for google users', async () => {
    const mocks = createSupabaseMock();
    const profile = { user_id: 'user-123', display_name: 'Existing User', avatar_url: null };
    mocks.maybeSingle.mockResolvedValueOnce({ data: profile, error: null });
    const user = createGoogleUser();

    const result = await ensureUserProfile({ supabase: mocks.supabase, user, logger });

    expect(result).toEqual(profile);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledWith('profiles');
  });

  it('creates a new profile when missing for google users', async () => {
    const mocks = createSupabaseMock();
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const inserted = {
      user_id: 'user-123',
      display_name: 'Test Adventurer',
      avatar_url: 'https://example.com/avatar.png',
    };
    mocks.single.mockResolvedValueOnce({ data: inserted, error: null });
    const user = createGoogleUser();

    const result = await ensureUserProfile({ supabase: mocks.supabase, user, logger });

    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      display_name: 'Test Adventurer',
      avatar_url: 'https://example.com/avatar.png',
    });
    expect(mocks.selectAfterInsert).toHaveBeenCalled();
    expect(mocks.single).toHaveBeenCalled();
    expect(result).toEqual(inserted);
  });

  it('throws when profile lookup fails', async () => {
    const mocks = createSupabaseMock();
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const user = createGoogleUser();

    await expect(ensureUserProfile({ supabase: mocks.supabase, user, logger })).rejects.toThrow(
      'failed to load user profile',
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('throws when profile creation fails', async () => {
    const mocks = createSupabaseMock();
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mocks.single.mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } });
    const user = createGoogleUser();

    await expect(ensureUserProfile({ supabase: mocks.supabase, user, logger })).rejects.toThrow(
      'failed to create user profile',
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('still ensures profiles for non-google providers but logs a warning', async () => {
    const mocks = createSupabaseMock();
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const inserted = {
      user_id: 'user-123',
      display_name: 'Test Adventurer',
      avatar_url: 'https://example.com/avatar.png',
    };
    mocks.single.mockResolvedValueOnce({ data: inserted, error: null });
    const user = createGoogleUser({ app_metadata: { provider: 'email' } } as Partial<User>);

    const result = await ensureUserProfile({ supabase: mocks.supabase, user, logger });

    expect(result).toEqual(inserted);
    expect(mocks.insert).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith({ provider: 'email' }, expect.any(String));
  });
});
