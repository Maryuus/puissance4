import { AnimatePresence, motion } from 'framer-motion';
import { useMonopolyDealGame } from '../../hooks/useMonopolyDealGame';
import { MonopolyDealSetup } from './MonopolyDealSetup';
import { MonopolyDealWaiting } from './MonopolyDealWaiting';
import { MonopolyDealGame } from './MonopolyDealGame';

interface Props {
  onGoBack: () => void;
}

export function MonopolyDealApp({ onGoBack }: Props) {
  const {
    room, myHand, myPlayerId, loading, error,
    isMyTurn, isMyTurnToRespond, hasJSNInHand,
    pendingPlay, setPendingPlay,
    paymentSelection, setPaymentSelection,
    isDiscardMode,
    createRoom, joinRoom, startGame, leaveRoom,
    playMoney, playProperty, initiateAction, commitPassGo,
    commitDebt, commitRent, commitDealBreaker, commitSlyDeal, commitForcedDeal,
    confirmSteal,
    respondJSN, acceptCancellation,
    submitPayment, moveWild,
    endTurn, discardCard,
    syncYoutubeUrl,
  } = useMonopolyDealGame();

  const handleLeave = () => leaveRoom();
  const handleLeaveToHub = () => { leaveRoom(); onGoBack(); };

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
        setPendingPlay={setPendingPlay}
        paymentSelection={paymentSelection}
        setPaymentSelection={setPaymentSelection}
        isDiscardMode={isDiscardMode}
        onPlayMoney={playMoney}
        onPlayProperty={playProperty}
        onPlayActionAsMoney={playMoney}
        onInitiateAction={initiateAction}
        onCommitPassGo={commitPassGo}
        onCommitDebt={commitDebt}
        onCommitRent={commitRent}
        onCommitDealBreaker={commitDealBreaker}
        onCommitSlyDeal={commitSlyDeal}
        onCommitForcedDeal={commitForcedDeal}
        onConfirmSteal={confirmSteal}
        onRespondJSN={respondJSN}
        onAcceptCancellation={acceptCancellation}
        onSubmitPayment={submitPayment}
        onMoveWild={moveWild}
        onEndTurn={endTurn}
        onDiscardCard={discardCard}
        onSyncYoutubeUrl={syncYoutubeUrl}
        onPlayAgain={startGame}
        onLeave={room.status === 'finished' ? handleLeaveToHub : handleLeave}
      />
    );
  }

  if (room?.status === 'waiting') {
    return (
      <div className="app-root">
        <div className="screen-wrapper">
          <AnimatePresence>
            <motion.div key="md-waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MonopolyDealWaiting
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

  return (
    <div className="app-root">
      <div className="screen-wrapper">
        <AnimatePresence>
          <motion.div key="md-setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
