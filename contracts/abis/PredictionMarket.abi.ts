import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const PredictionMarketEvents = [];

export const PredictionMarketAbi = [
    {
        name: 'createMarket',
        inputs: [{ name: 'endBlock', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'buyShares',
        inputs: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'isYes', type: ABIDataTypes.BOOL },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'shares', type: ABIDataTypes.UINT256 }],
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
        name: 'setAdmin',
        inputs: [{ name: 'newAdmin', type: ABIDataTypes.ADDRESS }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMarketInfo',
        inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'yesReserve', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getUserShares',
        inputs: [
            { name: 'marketId', type: ABIDataTypes.UINT256 },
            { name: 'user', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [{ name: 'yesShares', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getPrice',
        inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'yesPriceBps', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...PredictionMarketEvents,
    ...OP_NET_ABI,
];

export default PredictionMarketAbi;
