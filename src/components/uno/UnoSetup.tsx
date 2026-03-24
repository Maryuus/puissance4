import { RoomSetup } from '../shared/RoomSetup';
import { isSupabaseConfigured } from '../../lib/unoSupabase';

interface Props {
  onBack: () => void;
  createRoom: (name: string) => Promise<unknown>;
  joinRoom: (code: string, name: string) => Promise<unknown>;
  loading: boolean;
  error: string | null;
}

export function UnoSetup({ onBack, createRoom, joinRoom, loading, error }: Props) {
  return (
    <RoomSetup
      emoji="🃏"
      title="UNO — En ligne"
      subtitle="2 à 10 joueurs"
      codeLength={4}
      isConfigured={isSupabaseConfigured}
      onBack={onBack}
      createRoom={createRoom}
      joinRoom={joinRoom}
      loading={loading}
      error={error}
    />
  );
}
