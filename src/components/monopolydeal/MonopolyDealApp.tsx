import { AnimatePresence, motion } from 'framer-motion';
import { useMonopolyDealGame } from '../../hooks/useMonopolyDealGame';
import { MonopolyDealSetup } from './MonopolyDealSetup';
import { MonopolyDealWaiting } from './MonopolyDealWaiting';
import { MonopolyDealGame } from './MonopolyDealGame';

interface MonopolyDealAppProps {
  onGoBack: () => void;
}

export function MonopolyDealApp({ onGoBack }: MonopolyDealAppProps) {
  const {
    room,
    myHand,
    myPlayerId,
    loading,
    error,
    isMyTurn,
    isMyTurnToRespond,
    hasJSNInHand,
    pendingPlay,
    paymentSelection,
    setPaymentSelection,
    isDiscardMode,
    createRoom,
    joinRoom,
    startGame,
    playMoney,
    playProperty,
    initiateAction,
    commitDebtCollector,
    commitRent,
    commitDealBreaker,
    commitForcedDeal,
    commitSlyDeal,
    respondJSN,
    acceptCancellation,
    resolveActionEffect,
    submitPayment,
    moveWild,
    endTurn,
    discardCard,
    syncYoutubeUrl,
    leaveRoom,
    setPendingPlay,
  } = useMonopolyDealGame();

  const handleLeave = () => leaveRoom();
  const handleLeaveToHub = () => { leaveRoom(); onGoBack(); };

  // Game screen
  if (room?.status === 'playing' || room?.status === 'finished') {
    return (
      <MonopolyDealGame
        room={room}
        myHand={myHand}
        myPlayerId={myPlayerId}
        isMyTurn={isMyTurn}
        isMyTurnToRespond={isMyTurnToRespond}
        hasJSNInHand={hasJSNInHand}
        pendingPlay={pendingPlay}
        paymentSelection={paymentSelection}
        setPaymentSelection={setPaymentSelection}
        isDiscardMode={isDiscardMode}
        onPlayMoney={playMoney}
        onPlayProperty={playProperty}
        onInitiateAction={initiateAction}
        onCommitDebtCollector={commitDebtCollector}
        onCommitRent={commitRent}
        onCommitDealBreaker={commitDealBreaker}
        onCommitForcedDeal={commitForcedDeal}
        onCommitSlyDeal={commitSlyDeal}
        onRespondJSN={respondJSN}
        onAcceptCancellation={acceptCancellation}
        onResolveAction={resolveActionEffect}
        onSubmitPayment={submitPayment}
        onMoveWild={moveWild}
        onEndTurn={endTurn}
        onDiscardCard={discardCard}
        onSyncYoutubeUrl={syncYoutubeUrl}
        onLeave={room.status === 'finished' ? handleLeaveToHub : handleLeave}
        setPendingPlay={setPendingPlay}
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
              key="md-waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MonopolyDealWaiting
                room={room}
                myPlayerId={myPlayerId}
                loading={loading}
                onStart={startGame}
                onLeave={handleLeaveToHub}
                onSyncYoutubeUrl={syncYoutubeUrl}
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
            key="md-setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MonopolyDealSetup
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
