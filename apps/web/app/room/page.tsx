'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { resolveRunId } from '@/lib/run-id';

function RoomContent() {
  const searchParams = useSearchParams();
  const runId = resolveRunId(searchParams?.get('runId'));

  return (
    <div>
      <h1>Live Room</h1>
      <h2>Run {runId}</h2>
      <p>Room ID: {runId}</p>
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div>Loading room…</div>}>
      <RoomContent />
    </Suspense>
  );
}
