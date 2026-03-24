import { RoomWaiting } from '../shared/RoomWaiting';
import type { UnoRoomRow } from '../../lib/unoSupabase';

interface Props {
  room: UnoRoomRow;
  myPlayerId: string;
  loading: boolean;
  onStart: () => void;
  onLeave: () => void;
}

export function UnoWaiting({ room, myPlayerId, loading, onStart, onLeave }: Props) {
  return (
    <RoomWaiting
      emoji="🃏"
      roomCode={room.room_code}
      players={room.players}
      hostId={room.host_id}
      myPlayerId={myPlayerId}
      maxPlayers={10}
      loading={loading}
      onStart={onStart}
      onLeave={onLeave}
    />
  );
}
