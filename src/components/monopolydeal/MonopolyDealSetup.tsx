import { RoomSetup } from '../shared/RoomSetup';
import { isSupabaseConfigured } from '../../lib/monopolyDealSupabase';

interface Props {
  onBack: () => void;
  createRoom: (name: string) => Promise<unknown>;
  joinRoom: (code: string, name: string) => Promise<unknown>;
  loading: boolean;
  error: string | null;
}

export function MonopolyDealSetup({ onBack, createRoom, joinRoom, loading, error }: Props) {
  return (
    <RoomSetup
      emoji="🎩"
      title="Monopoly Deal"
      subtitle="2 à 5 joueurs"
      codeLength={6}
      isConfigured={isSupabaseConfigured}
      onBack={onBack}
      createRoom={createRoom}
      joinRoom={joinRoom}
      loading={loading}
      error={error}
    />
  );
}
