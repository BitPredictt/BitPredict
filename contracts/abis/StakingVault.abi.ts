import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const StakingVaultEvents = [];

export const StakingVaultAbi = [
    {
        name: 'stake',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'unstake',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'claimRewards',
        inputs: [],
        outputs: [{ name: 'claimed', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setAutoCompound',
        inputs: [{ name: 'enabled', type: ABIDataTypes.BOOL }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'distributeRevenue',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setAdmin',
        inputs: [{ name: 'newAdmin', type: ABIDataTypes.ADDRESS }],
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
        name: 'getVaultInfo',
        inputs: [],
        outputs: [{ name: 'totalStaked', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getUserInfo',
        inputs: [{ name: 'user', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'staked', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...StakingVaultEvents,
    ...OP_NET_ABI,
];

export default StakingVaultAbi;
