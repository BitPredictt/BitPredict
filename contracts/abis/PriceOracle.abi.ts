import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const PriceOracleEvents = [];

export const PriceOracleAbi = [
    {
        name: 'addOracle',
        inputs: [{ name: 'oracle', type: ABIDataTypes.ADDRESS }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'removeOracle',
        inputs: [{ name: 'oracle', type: ABIDataTypes.ADDRESS }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'submitPrice',
        inputs: [
            { name: 'assetId', type: ABIDataTypes.UINT256 },
            { name: 'price', type: ABIDataTypes.UINT256 },
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
    {
        name: 'getPrice',
        inputs: [{ name: 'assetId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'price', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...PriceOracleEvents,
    ...OP_NET_ABI,
];

export default PriceOracleAbi;
