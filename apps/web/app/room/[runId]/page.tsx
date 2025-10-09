import React from 'react';

export default function RoomPage({ params }: { params: { runId: string } }) {
  const runId = params.runId;

  return (
    <div>
      <h1>Live Room</h1>
      <h2>Run {runId}</h2>
      <p>Room ID: {runId}</p>
    </div>
  );
}
