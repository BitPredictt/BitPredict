import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const PredTokenEvents = [];

export const PredTokenAbi = [
    {
        name: 'mint',
        inputs: [
            { name: 'to', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
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
    ...PredTokenEvents,
    ...OP_NET_ABI,
];

export default PredTokenAbi;
