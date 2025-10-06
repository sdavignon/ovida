import { ReplaySchema } from '@ovida/schemas';

export const signReplay = (replay: unknown) => {
  const parsed = ReplaySchema.parse(replay);
  // Placeholder deterministic signature using JSON string hash
  const signature = Buffer.from(JSON.stringify(parsed)).toString('base64url');
  return { ...parsed, signature };
};
