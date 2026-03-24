import { AnimatePresence, motion } from 'framer-motion';
import { useUnoGame } from '../../hooks/useUnoGame';
import { UnoSetup } from './UnoSetup';
import { UnoWaiting } from './UnoWaiting';
import { UnoGame } from './UnoGame';

interface UnoAppProps {
  onGoBack: () => void;
}

export function UnoApp({ onGoBack }: UnoAppProps) {
  const {
    room,
    myHand,
    myPlayerId,
    loading,
    error,
    isMyTurn,
    topCard,
    hasDrawnThisTurn,
    pendingWild,
    createRoom,
    joinRoom,
    startGame,
    playCard,
    selectWildColor,
    drawCard,
    passTurn,
    callUno,
    counterUno,
    syncYoutubeUrl,
    leaveRoom,
  } = useUnoGame();

  const handleLeave = () => {
    leaveRoom();
  };

  const handleLeaveToHub = () => {
    leaveRoom();
    onGoBack();
  };

  // Game screen
  if (room?.status === 'playing' || room?.status === 'finished') {
    return (
      <UnoGame
        room={room}
        myHand={myHand}
        myPlayerId={myPlayerId}
        isMyTurn={isMyTurn}
        topCard={topCard}
        hasDrawnThisTurn={hasDrawnThisTurn}
        pendingWild={pendingWild}
        onPlayCard={playCard}
        onSelectWildColor={selectWildColor}
        onDrawCard={drawCard}
        onPassTurn={passTurn}
        onCallUno={callUno}
        onCounterUno={counterUno}
        onSyncYoutubeUrl={syncYoutubeUrl}
        onLeave={room.status === 'finished' ? handleLeaveToHub : handleLeave}
      />
    );
  }

  // Waiting room
  if (room?.status === 'waiting') {
    return (
      <div className="app-root">
        <div className="screen-wrapper">
          <AnimatePresence>
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <UnoWaiting
                room={room}
                myPlayerId={myPlayerId}
                loading={loading}
                onStart={startGame}
                onLeave={handleLeaveToHub}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Setup screen
  return (
    <div className="app-root">
      <div className="screen-wrapper">
        <AnimatePresence>
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <UnoSetup
              onBack={onGoBack}
              createRoom={createRoom}
              joinRoom={joinRoom}
              loading={loading}
              error={error}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
