import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const PredictionMarketEvents = [
    {
        name: 'MarketCreated',
        values: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'endBlock', type: ABIDataTypes.UINT256 },
            { name: 'creator', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'BetPlaced',
        values: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'bettor', type: ABIDataTypes.ADDRESS },
            { name: 'isYes', type: ABIDataTypes.BOOL },
            { name: 'amount', type: ABIDataTypes.UINT256 },
            { name: 'netAmount', type: ABIDataTypes.UINT256 },
            { name: 'newYesPool', type: ABIDataTypes.UINT256 },
            { name: 'newNoPool', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'MarketResolved',
        values: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'outcome', type: ABIDataTypes.BOOL },
            { name: 'resolver', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'PayoutClaimed',
        values: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'claimer', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'AdminChanged',
        values: [
            { name: 'oldAdmin', type: ABIDataTypes.ADDRESS },
            { name: 'newAdmin', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'FeeChanged',
        values: [
            { name: 'oldFeeBps', type: ABIDataTypes.UINT256 },
            { name: 'newFeeBps', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'FeeRecipientChanged',
        values: [
            { name: 'newRecipient', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'Paused',
        values: [
            { name: 'admin', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'Unpaused',
        values: [
            { name: 'admin', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'MarketCancelled',
        values: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'admin', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'EmergencyWithdraw',
        values: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'user', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'NoWinnerRefund',
        values: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'recipient', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'DustSwept',
        values: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
];

export const PredictionMarketAbi = [
    {
        name: 'createMarket',
        inputs: [{ name: 'endBlock', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'placeBet',
        inputs: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'isYes', type: ABIDataTypes.BOOL },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'netAmount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'resolveMarket',
        inputs: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'outcome', type: ABIDataTypes.BOOL },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'claimPayout',
        inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'payout', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'cancelMarket',
        inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'emergencyWithdraw',
        inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'refund', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'sweepDust',
        inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'swept', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setAdmin',
        inputs: [{ name: 'newAdmin', type: ABIDataTypes.ADDRESS }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setFee',
        inputs: [{ name: 'newFeeBps', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'withdrawFees',
        inputs: [],
        outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setFeeRecipient',
        inputs: [{ name: 'recipient', type: ABIDataTypes.ADDRESS }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'pause',
        inputs: [],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'unpause',
        inputs: [],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMarketInfo',
        inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'yesPool', type: ABIDataTypes.UINT256 },
            { name: 'noPool', type: ABIDataTypes.UINT256 },
            { name: 'totalPool', type: ABIDataTypes.UINT256 },
            { name: 'endBlock', type: ABIDataTypes.UINT256 },
            { name: 'resolved', type: ABIDataTypes.BOOL },
            { name: 'outcome', type: ABIDataTypes.BOOL },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getUserBets',
        inputs: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'user', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [
            { name: 'yesBet', type: ABIDataTypes.UINT256 },
            { name: 'noBet', type: ABIDataTypes.UINT256 },
            { name: 'claimed', type: ABIDataTypes.BOOL },
            { name: 'yesPool', type: ABIDataTypes.UINT256 },
            { name: 'noPool', type: ABIDataTypes.UINT256 },
            { name: 'totalPool', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getPrice',
        inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'yesPriceBps', type: ABIDataTypes.UINT256 },
            { name: 'noPriceBps', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getContractInfo',
        inputs: [],
        outputs: [
            { name: 'nextMarketId', type: ABIDataTypes.UINT256 },
            { name: 'activeMarketCount', type: ABIDataTypes.UINT256 },
            { name: 'accumulatedFees', type: ABIDataTypes.UINT256 },
            { name: 'isPaused', type: ABIDataTypes.BOOL },
        ],
        type: BitcoinAbiTypes.Function,
    },
    ...PredictionMarketEvents,
    ...OP_NET_ABI,
];

export default PredictionMarketAbi;
