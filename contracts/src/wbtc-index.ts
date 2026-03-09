import { Blockchain } from '@btc-vision/btc-runtime/runtime';
import { WBTC } from '../WBTC';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';

Blockchain.contract = (): WBTC => {
    return new WBTC();
};

export * from '@btc-vision/btc-runtime/runtime/exports';

export function abort(message: string, fileName: string, line: u32, column: u32): void {
    revertOnError(message, fileName, line, column);
}
