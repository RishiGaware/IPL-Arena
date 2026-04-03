import React from 'react';
import { getTeamLogo } from '../../constants/teamLogos';

export default function MatchCard({ match, userBet }) {
    const {
        status,
        teamA,
        teamB,
        venue,
        time,
        winner // "201" or "202" representing the team
    } = match;

    const isPast = status === 'finished' || status === 'FINAL';

    // Calculate footer content based on user status and match status
    const renderFooterRight = () => {
        if (!isPast) {
            return (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {time}
                </span>
            );
        }

        // It is past, let's see their bet
        if (!userBet) {
            return (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    NO BET
                </span>
            );
        }

        // if result is calculated, let's use it
        if (userBet.result === 'won') {
            // we should technically know their won points, but for now we assume they get some points. 
            // In the future: `+${userBet.wonPoints}`
            return (
                <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">
                    WON BET
                </span>
            );
        } else if (userBet.result === 'lost') {
            return (
                <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded">
                    -{userBet.points} PTS
                </span>
            );
        } else {
            // result pending or they bet on the correct team before settlement
            const pickedWinner = userBet.team === winner;
            if (pickedWinner) {
                return (
                    <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">
                        PENDING WIN
                    </span>
                );
            } else {
                return (
                    <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded">
                        -{userBet.points} PTS
                    </span>
                );
            }
        }
    };

    return (
        <div className="card-base mb-3">

            {/* Teams & Score */}
            <div className="flex items-center justify-between gap-2">
                {/* Team A */}
                <div className={`flex flex-col items-center flex-1 gap-2 ${isPast && winner === teamB ? 'opacity-60' : ''}`}>
                    <div className={`size-20 rounded-full flex items-center justify-center ${isPast && winner === teamA
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'bg-slate-100 dark:bg-primary/20'
                        }`}>
                        <img src={getTeamLogo(teamA)} alt="Team A" className="w-full h-full object-contain" />
                    </div>
                </div>

                {/* Divider */}
                <div className="flex flex-col items-center px-4">
                    <span className="text-xs font-bold text-slate-400">
                        {isPast ? '-' : 'VS'}
                    </span>
                </div>

                {/* Team B */}
                <div className={`flex flex-col items-center flex-1 gap-2 ${isPast && winner === teamA ? 'opacity-60' : ''}`}>
                    <div className={`size-20 rounded-full flex items-center justify-center ${isPast && winner === teamB
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'bg-slate-100 dark:bg-primary/20'
                        }`}>
                        <img src={getTeamLogo(teamB)} alt="Team B" className="w-full h-full object-contain" />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-[1rem]">location_on</span>
                    <span className="text-xs">{venue}</span>
                </div>

                {renderFooterRight()}
            </div>
        </div>
    );
}
