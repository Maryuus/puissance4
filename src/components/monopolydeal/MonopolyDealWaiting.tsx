import { RoomWaiting } from '../shared/RoomWaiting';
import type { MDRoomRow } from '../../lib/monopolyDealSupabase';

interface Props {
  room: MDRoomRow;
  myPlayerId: string;
  loading: boolean;
  onStart: () => void;
  onLeave: () => void;
}

export function MonopolyDealWaiting({ room, myPlayerId, loading, onStart, onLeave }: Props) {
  return (
    <RoomWaiting
      emoji="🎩"
      roomCode={room.room_code}
      players={room.players}
      hostId={room.host_id}
      myPlayerId={myPlayerId}
      maxPlayers={5}
      loading={loading}
      onStart={onStart}
      onLeave={onLeave}
    />
  );
}
