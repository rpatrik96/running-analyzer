interface BalanceIndicatorProps {
  balance: string;
}

export function BalanceIndicator({ balance }: BalanceIndicatorProps) {
  const numBalance = parseFloat(balance);
  const isBalanced = Math.abs(numBalance - 50) < 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">L/R Balance</h2>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Left</span>
            <span>Right</span>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${numBalance}%` }}
            />
            {/* Center line */}
            <div className="absolute top-0 left-1/2 w-0.5 h-full bg-gray-400 dark:bg-gray-500" />
          </div>
          <div className="text-center mt-2">
            <span className={`font-semibold ${isBalanced ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
              {balance}% L / {(100 - numBalance).toFixed(1)}% R
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
            {isBalanced ? 'Well balanced' : numBalance > 50 ? 'Left dominant' : 'Right dominant'}
          </p>
        </div>
      </div>
    </div>
  );
}
