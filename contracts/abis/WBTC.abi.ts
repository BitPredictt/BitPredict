import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const WBTCEvents = [];

export const WBTCAbi = [
    {
        name: 'wrap',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'unwrap',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'approve',
        inputs: [],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setPoolAddress',
        inputs: [{ name: 'newPool', type: ABIDataTypes.STRING }],
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
        name: 'getTotalWrapped',
        inputs: [],
        outputs: [{ name: 'totalWrapped', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getPoolAddress',
        inputs: [],
        outputs: [{ name: 'poolAddress', type: ABIDataTypes.STRING }],
        type: BitcoinAbiTypes.Function,
    },
    ...WBTCEvents,
    ...OP_NET_ABI,
];

export default WBTCAbi;
