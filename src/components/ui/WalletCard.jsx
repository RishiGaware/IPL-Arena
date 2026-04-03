import React from 'react';

export default function WalletCard({ balance, showRedeemBtn = false }) {
    return (
        <div className="card-highlight mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                {/* Only show the icon if no redeem button is present (Live/Bet page style) */}
                {!showRedeemBtn && (
                    <div className="size-10 rounded-full bg-primary flex items-center justify-center text-background-dark">
                        <span className="material-symbols-outlined font-variation-settings-['FILL'_1]">account_balance_wallet</span>
                    </div>
                )}
                <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-primary/70">
                        {showRedeemBtn ? 'My Balance' : 'Available Balance'}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className={showRedeemBtn ? "text-2xl font-bold" : "text-lg font-bold text-primary"}>
                            {balance.toLocaleString()}
                        </span>
                        {showRedeemBtn && <span className="text-sm font-medium text-primary">PTS</span>}
                        {!showRedeemBtn && <span className="text-lg font-bold text-primary">Points</span>}
                    </div>
                </div>
            </div>

            {showRedeemBtn && (
                <button className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
                    REDEEM
                </button>
            )}
        </div>
    );
}
