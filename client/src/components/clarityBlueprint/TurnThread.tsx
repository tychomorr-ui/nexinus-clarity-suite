import React, { useEffect, useRef, useState } from "react";
import { DialecticTurn } from "../../lib/clarityBlueprint/fsm";

interface TurnThreadProps {
  turns: DialecticTurn[];
  isMirrorReflecting: boolean;
}

export const TurnThread: React.FC<TurnThreadProps> = ({
  turns,
  isMirrorReflecting,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wasNearBottomRef = useRef<boolean>(true);
  const [showJumpPill, setShowJumpPill] = useState(false);

  const calculateIsNearBottom = (): boolean => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight < 80;
  };

  // Track scroll position ONLY on actual scroll events.
  // This captures intent BEFORE any DOM update grows the container.
  const handleScroll = () => {
    const nearBottom = calculateIsNearBottom();
    wasNearBottomRef.current = nearBottom;
    setShowJumpPill(!nearBottom);
  };

  const scrollToBottom = (smooth: boolean = true) => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  // Mount: snap to bottom without animation.
  useEffect(() => { scrollToBottom(false); }, []);

  // New turns: only scroll if operator was already near bottom.
  useEffect(() => {
    if (wasNearBottomRef.current) scrollToBottom(true);
  }, [turns, isMirrorReflecting]);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-xinus-900 border border-xinus-800 rounded">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {turns.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xinus-400 text-xs">
            Awaiting initial operator dialectic input...
          </div>
        ) : (
          turns.map((turn) => {
            const isOperator = turn.speaker === "OPERATOR";
            return (
              <div
                key={turn.id}
                className={`flex flex-col ${isOperator ? "items-end" : "items-start"} ${
                  !isOperator ? "animate-fade-in-1200" : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-1 text-xs text-xinus-400">
                  <span className={isOperator ? "text-xinus-200" : "text-xinus-accent"}>
                    {isOperator ? "ROOT OPERATOR" : "CLARITY MIRROR"}
                  </span>
                  <span>·</span>
                  <span>Turn #{turn.turnNumber}</span>
                  {!isOperator && turn.tactic !== "NONE" && (
                    <>
                      <span>·</span>
                      <span className="text-xinus-danger">{turn.tactic}</span>
                    </>
                  )}
                </div>
                <div
                  className={`max-w-[85%] rounded p-3 text-xs leading-relaxed ${
                    isOperator
                      ? "bg-xinus-800 text-xinus-100 border border-xinus-700"
                      : "bg-xinus-950 text-xinus-200 border border-xinus-800"
                  }`}
                >
                  {turn.text}
                </div>
              </div>
            );
          })
        )}

        {isMirrorReflecting && (
          <div className="flex items-center gap-2 text-xs font-mono text-xinus-accent py-2 animate-pulse-fast">
            <span>◈</span>
            <span>MIRROR REFLECTING</span>
          </div>
        )}
      </div>

      {showJumpPill && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-4 right-4 bg-xinus-800 hover:bg-xinus-700 text-xinus-100 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 shadow-lg border border-xinus-700"
        >
          <span>↓</span>
          <span>Jump to latest</span>
        </button>
      )}
    </div>
  );
};
