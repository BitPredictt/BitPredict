(module
 (type $0 (func (param i32) (result i32)))
 (type $1 (func (param i32 i32) (result i32)))
 (type $2 (func (param i32 i32)))
 (type $3 (func (param i32 i32 i32)))
 (type $4 (func (param i32)))
 (type $5 (func (param i32 i32 i32 i32)))
 (type $6 (func (param i32 i32 i32) (result i32)))
 (type $7 (func (param i32 i32 i32 i32) (result i32)))
 (type $8 (func (result i32)))
 (type $9 (func))
 (type $10 (func (param i32 i64) (result i32)))
 (type $11 (func (param i64 i64) (result i32)))
 (type $12 (func (param i64 i64 i64 i64) (result i32)))
 (type $13 (func (param i64 i64)))
 (type $14 (func (param i32 i32 i64)))
 (type $15 (func (param i32 i32) (result i64)))
 (type $16 (func (param i64 i64 i64 i64 i64 i64 i64 i64) (result i32)))
 (type $17 (func (param i64) (result i64)))
 (type $18 (func (param i32) (result i64)))
 (type $19 (func (param i32 i32 i32 i32 i32)))
 (type $20 (func (param i32 i32 i32 i32 i32 i64 i32)))
 (import "env" "exit" (func $~lib/@btc-vision/btc-runtime/runtime/env/global/env_exit (param i32 i32 i32)))
 (import "env" "environment" (func $~lib/@btc-vision/btc-runtime/runtime/env/global/getEnvironmentVariables (param i32 i32 i32)))
 (import "env" "calldata" (func $~lib/@btc-vision/btc-runtime/runtime/env/global/getCalldata (param i32 i32 i32)))
 (import "env" "sha256" (func $~lib/@btc-vision/btc-runtime/runtime/env/global/_sha256 (param i32 i32 i32)))
 (import "env" "load" (func $~lib/@btc-vision/btc-runtime/runtime/env/global/loadPointer (param i32 i32)))
 (import "env" "store" (func $~lib/@btc-vision/btc-runtime/runtime/env/global/storePointer (param i32 i32)))
 (import "env" "emit" (func $~lib/@btc-vision/btc-runtime/runtime/env/global/emit (param i32 i32)))
 (import "env" "accountType" (func $~lib/@btc-vision/btc-runtime/runtime/env/global/getAccountType (param i32) (result i32)))
 (import "env" "call" (func $~lib/@btc-vision/btc-runtime/runtime/env/global/callContract (param i32 i32 i32 i32) (result i32)))
 (import "env" "callResult" (func $~lib/@btc-vision/btc-runtime/runtime/env/global/getCallResult (param i32 i32 i32)))
 (import "env" "verifySignature" (func $~lib/@btc-vision/btc-runtime/runtime/env/global/verifySignature (param i32 i32 i32) (result i32)))
 (import "env" "loadMLDSA" (func $~lib/@btc-vision/btc-runtime/runtime/env/global/loadMLDSA (param i32 i32)))
 (global $~argumentsLength (mut i32) (i32.const 0))
 (global $~lib/rt/stub/offset (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/types/Address/ZERO_ADDRESS (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/math/bytes/EMPTY_BUFFER (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/math/bytes/EMPTY_POINTER (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/math/bytes/ONE_BUFFER (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/script/Networks/Network (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/DEAD_ADDRESS (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/SCRATCH_BUF (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/FOUR_BYTES_UINT8ARRAY_MEMORY_CACHE (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/storage/StoredString/StoredString.MAX_LENGTH_U256 (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/statusPointer (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/depthPointer (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/nonceMapPointer (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/maxSupplyPointer (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/decimalsPointer (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/stringPointer (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/totalSupplyPointer (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/allowanceMapPointer (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/balanceOfMapPointer (mut i32) (i32.const 0))
 (global $~lib/@btc-vision/as-bignum/assembly/globals/__res128_hi (mut i64) (i64.const 0))
 (global $~lib/@btc-vision/as-bignum/assembly/globals/__u256carry (mut i64) (i64.const 0))
 (global $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub (mut i64) (i64.const 0))
 (global $~started (mut i32) (i32.const 0))
 (memory $0 1)
 (data $0 (i32.const 1036) "\1c")
 (data $0.1 (i32.const 1048) "\02\00\00\00\08\00\00\00 \00a\00t\00 ")
 (data $1 (i32.const 1068) "\1c")
 (data $1.1 (i32.const 1080) "\02\00\00\00\02\00\00\00:")
 (data $2 (i32.const 1100) ",\00\00\00\03\00\00\00\00\00\00\00\05\00\00\00\1c\00\00\00\00\00\00\00 \04\00\00\00\00\00\00@\04\00\00\00\00\00\00@\04")
 (data $3 (i32.const 1148) "\1c\02")
 (data $3.1 (i32.const 1160) "\06\00\00\00\00\02\00\00000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff")
 (data $4 (i32.const 1692) "|")
 (data $4.1 (i32.const 1704) "\02\00\00\00d\00\00\00t\00o\00S\00t\00r\00i\00n\00g\00(\00)\00 \00r\00a\00d\00i\00x\00 \00a\00r\00g\00u\00m\00e\00n\00t\00 \00m\00u\00s\00t\00 \00b\00e\00 \00b\00e\00t\00w\00e\00e\00n\00 \002\00 \00a\00n\00d\00 \003\006")
 (data $5 (i32.const 1820) "<")
 (data $5.1 (i32.const 1832) "\02\00\00\00&\00\00\00~\00l\00i\00b\00/\00u\00t\00i\00l\00/\00n\00u\00m\00b\00e\00r\00.\00t\00s")
 (data $6 (i32.const 1884) "\1c")
 (data $6.1 (i32.const 1896) "\02\00\00\00\02\00\00\000")
 (data $7 (i32.const 1916) "\\")
 (data $7.1 (i32.const 1928) "\02\00\00\00H\00\00\000\001\002\003\004\005\006\007\008\009\00a\00b\00c\00d\00e\00f\00g\00h\00i\00j\00k\00l\00m\00n\00o\00p\00q\00r\00s\00t\00u\00v\00w\00x\00y\00z")
 (data $8 (i32.const 2012) "\1c")
 (data $8.1 (i32.const 2024) "\02")
 (data $9 (i32.const 2044) "<")
 (data $9.1 (i32.const 2056) "\02\00\00\00$\00\00\00U\00n\00p\00a\00i\00r\00e\00d\00 \00s\00u\00r\00r\00o\00g\00a\00t\00e")
 (data $10 (i32.const 2108) ",")
 (data $10.1 (i32.const 2120) "\02\00\00\00\1c\00\00\00~\00l\00i\00b\00/\00s\00t\00r\00i\00n\00g\00.\00t\00s")
 (data $11 (i32.const 2156) "<")
 (data $11.1 (i32.const 2168) "\02\00\00\00$\00\00\00I\00n\00d\00e\00x\00 \00o\00u\00t\00 \00o\00f\00 \00r\00a\00n\00g\00e")
 (data $12 (i32.const 2220) "<")
 (data $12.1 (i32.const 2232) "\02\00\00\00$\00\00\00~\00l\00i\00b\00/\00t\00y\00p\00e\00d\00a\00r\00r\00a\00y\00.\00t\00s")
 (data $13 (i32.const 2284) ",")
 (data $13.1 (i32.const 2296) "\02\00\00\00\1c\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00l\00e\00n\00g\00t\00h")
 (data $14 (i32.const 2332) "<")
 (data $14.1 (i32.const 2344) "\02\00\00\00&\00\00\00~\00l\00i\00b\00/\00a\00r\00r\00a\00y\00b\00u\00f\00f\00e\00r\00.\00t\00s")
 (data $15 (i32.const 2396) "<")
 (data $15.1 (i32.const 2408) "\02\00\00\00 \00\00\00~\00l\00i\00b\00/\00d\00a\00t\00a\00v\00i\00e\00w\00.\00t\00s")
 (data $16 (i32.const 2460) "<")
 (data $16.1 (i32.const 2472) "\02\00\00\00(\00\00\00A\00l\00l\00o\00c\00a\00t\00i\00o\00n\00 \00t\00o\00o\00 \00l\00a\00r\00g\00e")
 (data $17 (i32.const 2524) "<")
 (data $17.1 (i32.const 2536) "\02\00\00\00\1e\00\00\00~\00l\00i\00b\00/\00r\00t\00/\00s\00t\00u\00b\00.\00t\00s")
 (data $18 (i32.const 2588) "L")
 (data $18.1 (i32.const 2600) "\02\00\00\006\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00p\00u\00b\00l\00i\00c\00 \00k\00e\00y\00 \00l\00e\00n\00g\00t\00h\00 \00(")
 (data $19 (i32.const 2668) "\1c")
 (data $19.1 (i32.const 2680) "\02\00\00\00\02\00\00\00)")
 (data $20 (i32.const 2700) "\1c\00\00\00\03\00\00\00\00\00\00\00\05\00\00\00\0c\00\00\000\n\00\00\00\00\00\00\80\n")
 (data $21 (i32.const 2732) "|")
 (data $21.1 (i32.const 2744) "\02\00\00\00j\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00t\00y\00p\00e\00s\00/\00A\00d\00d\00r\00e\00s\00s\00.\00t\00s")
 (data $22 (i32.const 2860) "\1c")
 (data $22.1 (i32.const 2872) "\01")
 (data $23 (i32.const 2892) "<")
 (data $23.1 (i32.const 2904) "\02\00\00\00$\00\00\00A\00r\00r\00a\00y\00 \00i\00s\00 \00t\00o\00o\00 \00l\00a\00r\00g\00e")
 (data $24 (i32.const 2956) "\9c")
 (data $24.1 (i32.const 2968) "\01\00\00\00\80")
 (data $24.2 (i32.const 2996) "\19\00\00\00\d6\00\00\00h\00\00\00\9c\00\00\00\08\00\00\00Z\00\00\00\e1\00\00\00e\00\00\00\83\00\00\00\1e\00\00\00\93\00\00\00O\00\00\00\f7\00\00\00c\00\00\00\ae\00\00\00F\00\00\00\a2\00\00\00\a6\00\00\00\c1\00\00\00r\00\00\00\b3\00\00\00\f1\00\00\00\b6\00\00\00\n\00\00\00\8c\00\00\00\e2\00\00\00o")
 (data $25 (i32.const 3116) "\9c")
 (data $25.1 (i32.const 3128) "\01\00\00\00\80")
 (data $25.2 (i32.const 3152) "\t\00\00\003\00\00\00\ea\00\00\00\01\00\00\00\ad\00\00\00\0e\00\00\00\e9\00\00\00\84\00\00\00 \00\00\00\97\00\00\00y\00\00\00\ba\00\00\00\ae\00\00\00\c3\00\00\00\ce\00\00\00\d9\00\00\00\0f\00\00\00\a3\00\00\00\f4\00\00\00\08\00\00\00q\00\00\00\95\00\00\00&\00\00\00\f8\00\00\00\d7\00\00\00\7f\00\00\00I\00\00\00C")
 (data $26 (i32.const 3276) "\9c")
 (data $26.1 (i32.const 3288) "\01\00\00\00\80\00\00\00\0f\00\00\00\91\00\00\00\88\00\00\00\f1\00\00\00<\00\00\00\b7\00\00\00\b2\00\00\00\c7\00\00\00\1f\00\00\00*\00\00\003\00\00\00^\00\00\00:\00\00\00O\00\00\00\c3\00\00\00(\00\00\00\bf\00\00\00[\00\00\00\eb\00\00\00C\00\00\00`\00\00\00\12\00\00\00\af\00\00\00\ca\00\00\00Y\00\00\00\0b\00\00\00\1a\00\00\00\11\00\00\00F\00\00\00n\00\00\00\"\00\00\00\06")
 (data $27 (i32.const 3436) "\9c")
 (data $27.1 (i32.const 3448) "\01\00\00\00\80")
 (data $27.2 (i32.const 3464) "\01\00\00\00\7f\00\00\00\85\00\00\00\10\00\00\00k\00\00\00\1f\00\00\00\ee\00\00\00\af\00\00\00/\00\00\00p\00\00\00\f1\00\00\00\e2\00\00\00\b8\00\00\00\05\00\00\00\98\00\00\00[\00\00\00\b5\00\00\00u\00\00\00\f8\00\00\00\8f\00\00\00\9b\00\00\00\0b\00\00\00\a5\00\00\00u\00\00\00=\00\00\00/\00\00\00<\00\00\00\f1\00\00\002\00\00\00s")
 (data $28 (i32.const 3596) "\\")
 (data $28.1 (i32.const 3608) "\02\00\00\00@\00\00\00q\00p\00z\00r\00y\009\00x\008\00g\00f\002\00t\00v\00d\00w\000\00s\003\00j\00n\005\004\00k\00h\00c\00e\006\00m\00u\00a\007\00l")
 (data $29 (i32.const 3692) "l")
 (data $29.1 (i32.const 3704) "\02\00\00\00P\00\00\00T\00w\00e\00a\00k\00e\00d\00 \00p\00u\00b\00l\00i\00c\00 \00k\00e\00y\00 \00m\00u\00s\00t\00 \00b\00e\00 \003\002\00 \00b\00y\00t\00e\00s\00 \00l\00o\00n\00g")
 (data $30 (i32.const 3804) "\8c")
 (data $30.1 (i32.const 3816) "\02\00\00\00z\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00t\00y\00p\00e\00s\00/\00E\00x\00t\00e\00n\00d\00e\00d\00A\00d\00d\00r\00e\00s\00s\00.\00t\00s")
 (data $31 (i32.const 3948) "<")
 (data $31.1 (i32.const 3960) "\01\00\00\00 ")
 (data $32 (i32.const 4012) "<")
 (data $32.1 (i32.const 4024) "\01\00\00\00 ")
 (data $33 (i32.const 4076) "<")
 (data $33.1 (i32.const 4088) "\01\00\00\00 \00\00\00(J\e4\ac\db2\a9\9b\a3\eb\faf\a9\1d\dbA\a7\b7\a1\d2\fe\f4\159\99\"\cd\8a\04H\\\02")
 (data $34 (i32.const 4140) "<")
 (data $34.1 (i32.const 4152) "\01\00\00\00 ")
 (data $35 (i32.const 4204) ",")
 (data $35.1 (i32.const 4216) "\02\00\00\00\1a\00\00\00~\00l\00i\00b\00/\00a\00r\00r\00a\00y\00.\00t\00s")
 (data $36 (i32.const 4252) "\1c")
 (data $36.1 (i32.const 4264) "\01")
 (data $37 (i32.const 4284) "\1c")
 (data $37.1 (i32.const 4296) "\01")
 (data $38 (i32.const 4316) "\1c")
 (data $38.1 (i32.const 4328) "\01")
 (data $39 (i32.const 4348) "<")
 (data $39.1 (i32.const 4360) "\01\00\00\00 \00\00\00~\88\02\f1\fd#\e1\0e\r\de?\00\c0\aaH\15\d8\85\ec\d9\cd\a0\dfV\ff\a2^\ccp-E\8e")
 (data $40 (i32.const 4412) ",")
 (data $40.1 (i32.const 4424) "\n\00\00\00\10\00\00\00\10\11\00\00\10\11\00\00 \00\00\00 ")
 (data $41 (i32.const 4460) "<")
 (data $41.1 (i32.const 4472) "\01\00\00\00 \00\00\00p\87\994\92\1c/H\17x\87\89w\d5\b4^*Y\da\1d(\"A\c9?\f1\baj\f0\98\fc\d0")
 (data $42 (i32.const 4524) ",")
 (data $42.1 (i32.const 4536) "\n\00\00\00\10\00\00\00\80\11\00\00\80\11\00\00 \00\00\00 ")
 (data $43 (i32.const 4572) "<")
 (data $43.1 (i32.const 4584) "\01\00\00\00 \00\00\00Zd,\a2\d8\fd\e9\e1(\87|\f5]q\96\e3:\d4K\b3K\n\8d\85\8d\a8\04\bd;\86!\0e")
 (data $44 (i32.const 4636) ",")
 (data $44.1 (i32.const 4648) "\n\00\00\00\10\00\00\00\f0\11\00\00\f0\11\00\00 \00\00\00 ")
 (data $45 (i32.const 4684) "<")
 (data $45.1 (i32.const 4696) "\01\00\00\00 \00\00\00{\f8\b69_\ea\cc\15\97\128\00\91\b9+\96gk+sF\ff)\'\bf\1aT\f8\fc\ef\9c\0b")
 (data $46 (i32.const 4748) ",")
 (data $46.1 (i32.const 4760) "\n\00\00\00\10\00\00\00`\12\00\00`\12\00\00 \00\00\00 ")
 (data $47 (i32.const 4796) "<")
 (data $47.1 (i32.const 4808) "\01\00\00\00 \00\00\00\fe\e8\"\925\1d\1a\8b\ab!\c4\ef\dd\15~1h\e8\f62:\d0L\ba\12\f7|\0b\dcF\"X")
 (data $48 (i32.const 4860) ",")
 (data $48.1 (i32.const 4872) "\n\00\00\00\10\00\00\00\d0\12\00\00\d0\12\00\00 \00\00\00 ")
 (data $49 (i32.const 4908) "<")
 (data $49.1 (i32.const 4920) "\01\00\00\00 \00\00\00k\86\b2s\ff4\fc\e1\9dk\80N\ffZ?WG\ad\a4\ea\a2/\1dI\c0\1eR\dd\b7\87[K")
 (data $50 (i32.const 4972) ",")
 (data $50.1 (i32.const 4984) "\n\00\00\00\10\00\00\00@\13\00\00@\13\00\00 \00\00\00 ")
 (data $51 (i32.const 5020) "<")
 (data $51.1 (i32.const 5032) "\01\00\00\00 \00\00\00\b8n\99\da\c0GKJ\9f\c32:\d6\ed/9U\e7\b8m\c6\8cbB\82\1c\bc\ac\a2\d8y\de")
 (data $52 (i32.const 5084) ",")
 (data $52.1 (i32.const 5096) "\n\00\00\00\10\00\00\00\b0\13\00\00\b0\13\00\00 \00\00\00 ")
 (data $53 (i32.const 5132) "<")
 (data $53.1 (i32.const 5144) "\01\00\00\00 \00\00\00OH\06]\9e\f1E%k\f7\7f\d2\e5\8by\e6\f6\0c\d0\d3Gp\1424P\c9e\b7K\80\ed")
 (data $54 (i32.const 5196) ",")
 (data $54.1 (i32.const 5208) "\n\00\00\00\10\00\00\00 \14\00\00 \14\00\00 \00\00\00 ")
 (data $55 (i32.const 5244) "<")
 (data $55.1 (i32.const 5256) "\01\00\00\00 \00\00\00\f9\03\d7\be\0c\a4\99\eem}F\"\c7\92\b2\ead\ab\a6\afhQ\03\fe\c4\ae\12\d7\a6\a9\b2\0f")
 (data $56 (i32.const 5308) ",")
 (data $56.1 (i32.const 5320) "\n\00\00\00\10\00\00\00\90\14\00\00\90\14\00\00 \00\00\00 ")
 (data $57 (i32.const 5356) "L")
 (data $57.1 (i32.const 5368) "\02\00\00\00.\00\00\00O\00u\00t\00 \00o\00f\00 \00s\00t\00o\00r\00a\00g\00e\00 \00p\00o\00i\00n\00t\00e\00r\00.")
 (data $58 (i32.const 5436) "\9c")
 (data $58.1 (i32.const 5448) "\02\00\00\00\82\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00e\00n\00v\00/\00B\00l\00o\00c\00k\00c\00h\00a\00i\00n\00E\00n\00v\00i\00r\00o\00n\00m\00e\00n\00t\00.\00t\00s")
 (data $59 (i32.const 5596) "<")
 (data $59.1 (i32.const 5608) "\01\00\00\00 \00\00\00/\fc\ff\ff\fe\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff\ff")
 (data $60 (i32.const 5660) ",")
 (data $60.1 (i32.const 5672) "\n\00\00\00\10\00\00\00\f0\15\00\00\f0\15\00\00 \00\00\00 ")
 (data $61 (i32.const 5708) "<")
 (data $61.1 (i32.const 5720) "\01\00\00\00 \00\00\00\98\17\f8\16\b1[(\d9Y(\ce-\db\fc\9b\02p\b0\87\ce\95\a0bU\ac\bb\dc\f9\eff\bey")
 (data $62 (i32.const 5772) ",")
 (data $62.1 (i32.const 5784) "\n\00\00\00\10\00\00\00`\16\00\00`\16\00\00 \00\00\00 ")
 (data $63 (i32.const 5820) "<")
 (data $63.1 (i32.const 5832) "\01\00\00\00 \00\00\00\b8\d4\10\fb\8f\d0G\9c\19T\85\a6H\b4\17\fd\a8\08\11\0e\fc\fb\a4]e\c4\a3&w\da:H")
 (data $64 (i32.const 5884) ",")
 (data $64.1 (i32.const 5896) "\n\00\00\00\10\00\00\00\d0\16\00\00\d0\16\00\00 \00\00\00 ")
 (data $65 (i32.const 5932) "|")
 (data $65.1 (i32.const 5944) "\02\00\00\00f\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00a\00s\00-\00b\00i\00g\00n\00u\00m\00/\00a\00s\00s\00e\00m\00b\00l\00y\00/\00i\00n\00t\00e\00g\00e\00r\00/\00u\002\005\006\00.\00t\00s")
 (data $66 (i32.const 6060) "L")
 (data $66.1 (i32.const 6072) "\02\00\00\002\00\00\00t\00r\00a\00n\00s\00f\00e\00r\00(\00a\00d\00d\00r\00e\00s\00s\00,\00u\00i\00n\00t\002\005\006\00)")
 (data $67 (i32.const 6140) "\\")
 (data $67.1 (i32.const 6152) "\02\00\00\00J\00\00\00t\00r\00a\00n\00s\00f\00e\00r\00F\00r\00o\00m\00(\00a\00d\00d\00r\00e\00s\00s\00,\00a\00d\00d\00r\00e\00s\00s\00,\00u\00i\00n\00t\002\005\006\00)")
 (data $68 (i32.const 6236) "\\")
 (data $68.1 (i32.const 6248) "\02\00\00\00F\00\00\00s\00a\00f\00e\00T\00r\00a\00n\00s\00f\00e\00r\00(\00a\00d\00d\00r\00e\00s\00s\00,\00u\00i\00n\00t\002\005\006\00,\00b\00y\00t\00e\00s\00)")
 (data $69 (i32.const 6332) "|")
 (data $69.1 (i32.const 6344) "\02\00\00\00^\00\00\00s\00a\00f\00e\00T\00r\00a\00n\00s\00f\00e\00r\00F\00r\00o\00m\00(\00a\00d\00d\00r\00e\00s\00s\00,\00a\00d\00d\00r\00e\00s\00s\00,\00u\00i\00n\00t\002\005\006\00,\00b\00y\00t\00e\00s\00)")
 (data $70 (i32.const 6460) "\\")
 (data $70.1 (i32.const 6472) "\02\00\00\00D\00\00\00i\00n\00c\00r\00e\00a\00s\00e\00A\00l\00l\00o\00w\00a\00n\00c\00e\00(\00a\00d\00d\00r\00e\00s\00s\00,\00u\00i\00n\00t\002\005\006\00)")
 (data $71 (i32.const 6556) "\\")
 (data $71.1 (i32.const 6568) "\02\00\00\00D\00\00\00d\00e\00c\00r\00e\00a\00s\00e\00A\00l\00l\00o\00w\00a\00n\00c\00e\00(\00a\00d\00d\00r\00e\00s\00s\00,\00u\00i\00n\00t\002\005\006\00)")
 (data $72 (i32.const 6652) ",")
 (data $72.1 (i32.const 6664) "\02\00\00\00\1a\00\00\00b\00u\00r\00n\00(\00u\00i\00n\00t\002\005\006\00)")
 (data $73 (i32.const 6700) ",")
 (data $73.1 (i32.const 6712) "\02\00\00\00\14\00\00\00S\00t\00o\00r\00e\00d\00U\002\005\006")
 (data $74 (i32.const 6748) "l")
 (data $74.1 (i32.const 6760) "\02\00\00\00N\00\00\00P\00o\00i\00n\00t\00e\00r\00s\00 \00m\00u\00s\00t\00 \00b\00e\00 \00e\00x\00a\00c\00t\00l\00y\00 \003\000\00 \00b\00y\00t\00e\00s\00.\00 \00G\00o\00t\00 ")
 (data $75 (i32.const 6860) ",")
 (data $75.1 (i32.const 6872) "\02\00\00\00\16\00\00\00,\00 \00c\00o\00n\00t\00e\00x\00t\00:\00 ")
 (data $76 (i32.const 6908) "\1c")
 (data $76.1 (i32.const 6920) "\02\00\00\00\02\00\00\00.")
 (data $77 (i32.const 6940) ",\00\00\00\03\00\00\00\00\00\00\00\05\00\00\00\14\00\00\00p\1a\00\00\00\00\00\00\e0\1a\00\00\00\00\00\00\10\1b")
 (data $78 (i32.const 6988) "|")
 (data $78.1 (i32.const 7000) "\02\00\00\00`\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00m\00a\00t\00h\00/\00a\00b\00i\00.\00t\00s")
 (data $79 (i32.const 7116) "\1c")
 (data $79.1 (i32.const 7128) "\01")
 (data $80 (i32.const 7148) "\1c")
 (data $80.1 (i32.const 7160) "\01")
 (data $81 (i32.const 7180) "<")
 (data $81.1 (i32.const 7192) "\02\00\00\00 \00\00\00D\00i\00v\00i\00s\00i\00o\00n\00 \00b\00y\00 \00z\00e\00r\00o")
 (data $82 (i32.const 7244) "\\")
 (data $82.1 (i32.const 7256) "\02\00\00\00B\00\00\00S\00a\00f\00e\00M\00a\00t\00h\00:\00 \00m\00u\00l\00t\00i\00p\00l\00i\00c\00a\00t\00i\00o\00n\00 \00o\00v\00e\00r\00f\00l\00o\00w")
 (data $83 (i32.const 7340) "|")
 (data $83.1 (i32.const 7352) "\02\00\00\00l\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00t\00y\00p\00e\00s\00/\00S\00a\00f\00e\00M\00a\00t\00h\00.\00t\00s")
 (data $84 (i32.const 7468) "\1c")
 (data $84.1 (i32.const 7480) "2\00\00\00\08\00\00\00\01")
 (data $85 (i32.const 7500) "<")
 (data $85.1 (i32.const 7512) "\02\00\00\00(\00\00\00C\00o\00n\00t\00r\00a\00c\00t\00 \00i\00s\00 \00r\00e\00q\00u\00i\00r\00e\00d")
 (data $86 (i32.const 7564) "\8c")
 (data $86.1 (i32.const 7576) "\02\00\00\00z\00\00\00A\00t\00t\00e\00m\00p\00t\00 \00t\00o\00 \00r\00e\00a\00d\00 \00b\00e\00y\00o\00n\00d\00 \00b\00u\00f\00f\00e\00r\00 \00l\00e\00n\00g\00t\00h\00.\00 \00R\00e\00q\00u\00e\00s\00t\00e\00d\00 \00u\00p\00 \00t\00o\00 \00o\00f\00f\00s\00e\00t\00 ")
 (data $87 (i32.const 7708) "\1c")
 (data $87.1 (i32.const 7720) "\02\00\00\00\04\00\00\00,\00 ")
 (data $88 (i32.const 7740) "\1c\00\00\00\03\00\00\00\00\00\00\00\05\00\00\00\0c\00\00\00\a0\1d\00\00\00\00\00\000\1e")
 (data $89 (i32.const 7772) "<")
 (data $89.1 (i32.const 7784) "\02\00\00\00&\00\00\00b\00u\00t\00 \00b\00u\00f\00f\00e\00r\00 \00i\00s\00 \00o\00n\00l\00y\00 ")
 (data $90 (i32.const 7836) ",")
 (data $90.1 (i32.const 7848) "\02\00\00\00\0e\00\00\00 \00b\00y\00t\00e\00s\00.")
 (data $91 (i32.const 7884) "\1c\00\00\00\03\00\00\00\00\00\00\00\05\00\00\00\0c\00\00\00p\1e\00\00\00\00\00\00\b0\1e")
 (data $92 (i32.const 7916) "\8c")
 (data $92.1 (i32.const 7928) "\02\00\00\00t\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00b\00u\00f\00f\00e\00r\00/\00B\00y\00t\00e\00s\00R\00e\00a\00d\00e\00r\00.\00t\00s")
 (data $93 (i32.const 8060) "\1c")
 (data $93.1 (i32.const 8072) "\01")
 (data $94 (i32.const 8092) "L")
 (data $94.1 (i32.const 8104) "\02\00\00\006\00\00\00C\00a\00n\00n\00o\00t\00 \00m\00o\00d\00i\00f\00y\00 \00a\00d\00d\00r\00e\00s\00s\00 \00d\00a\00t\00a\00.")
 (data $95 (i32.const 8172) "<")
 (data $95.1 (i32.const 8184) "\02\00\00\00(\00\00\00C\00h\00a\00i\00n\00 \00i\00d\00 \00i\00s\00 \00r\00e\00q\00u\00i\00r\00e\00d")
 (data $96 (i32.const 8236) "|")
 (data $96.1 (i32.const 8248) "\02\00\00\00^\00\00\00U\00n\00e\00x\00p\00e\00c\00t\00e\00d\00 \00\'\00n\00u\00l\00l\00\'\00 \00(\00n\00o\00t\00 \00a\00s\00s\00i\00g\00n\00e\00d\00 \00o\00r\00 \00f\00a\00i\00l\00e\00d\00 \00c\00a\00s\00t\00)")
 (data $97 (i32.const 8364) "L")
 (data $97.1 (i32.const 8376) "\02\00\00\00.\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00c\00h\00a\00i\00n\00 \00i\00d\00 \00l\00e\00n\00g\00t\00h")
 (data $98 (i32.const 8444) "\8c")
 (data $98.1 (i32.const 8456) "\02\00\00\00n\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00s\00c\00r\00i\00p\00t\00/\00N\00e\00t\00w\00o\00r\00k\00s\00.\00t\00s")
 (data $99 (i32.const 8588) "<")
 (data $99.1 (i32.const 8600) "\02\00\00\00 \00\00\00U\00n\00k\00n\00o\00w\00n\00 \00c\00h\00a\00i\00n\00 \00i\00d")
 (data $100 (i32.const 8652) ",")
 (data $100.1 (i32.const 8664) "\02\00\00\00\14\00\00\00d\00e\00p\00l\00o\00y\00e\00r\00(\00)")
 (data $101 (i32.const 8700) "l")
 (data $101.1 (i32.const 8712) "\02\00\00\00T\00\00\00b\00y\00t\00e\00s\00T\00o\00U\003\002\00:\00 \00i\00n\00p\00u\00t\00 \00m\00u\00s\00t\00 \00b\00e\00 \00a\00t\00 \00l\00e\00a\00s\00t\00 \004\00 \00b\00y\00t\00e\00s")
 (data $102 (i32.const 8812) "|")
 (data $102.1 (i32.const 8824) "\02\00\00\00d\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00m\00a\00t\00h\00/\00b\00y\00t\00e\00s\00.\00t\00s")
 (data $103 (i32.const 8940) "<")
 (data $103.1 (i32.const 8952) "\02\00\00\00(\00\00\00D\00e\00p\00l\00o\00y\00e\00r\00 \00i\00s\00 \00r\00e\00q\00u\00i\00r\00e\00d")
 (data $104 (i32.const 9004) "<")
 (data $104.1 (i32.const 9016) "\02\00\00\00(\00\00\00A\00d\00d\00r\00e\00s\00s\00 \00i\00s\00 \00t\00o\00o\00 \00l\00o\00n\00g\00 ")
 (data $105 (i32.const 9068) "\1c")
 (data $105.1 (i32.const 9080) "\02\00\00\00\06\00\00\00 \00>\00 ")
 (data $106 (i32.const 9100) "\1c")
 (data $106.1 (i32.const 9112) "\02\00\00\00\0c\00\00\00 \00b\00y\00t\00e\00s")
 (data $107 (i32.const 9132) ",\00\00\00\03\00\00\00\00\00\00\00\05\00\00\00\14\00\00\00@#\00\00\00\00\00\00\80#\00\00\00\00\00\00\a0#")
 (data $108 (i32.const 9180) "\8c")
 (data $108.1 (i32.const 9192) "\02\00\00\00t\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00b\00u\00f\00f\00e\00r\00/\00B\00y\00t\00e\00s\00W\00r\00i\00t\00e\00r\00.\00t\00s")
 (data $109 (i32.const 9324) "\8c")
 (data $109.1 (i32.const 9336) "\02\00\00\00p\00\00\00B\00u\00f\00f\00e\00r\00 \00i\00s\00 \00g\00e\00t\00t\00i\00n\00g\00 \00r\00e\00s\00i\00z\00e\00d\00.\00 \00T\00h\00i\00s\00 \00i\00s\00 \00b\00a\00d\00 \00f\00o\00r\00 \00p\00e\00r\00f\00o\00r\00m\00a\00n\00c\00e\00.\00 ")
 (data $110 (i32.const 9468) "<")
 (data $110.1 (i32.const 9480) "\02\00\00\00\1e\00\00\00E\00x\00p\00e\00c\00t\00e\00d\00 \00s\00i\00z\00e\00:\00 ")
 (data $111 (i32.const 9532) "\1c")
 (data $111.1 (i32.const 9544) "\02\00\00\00\06\00\00\00 \00-\00 ")
 (data $112 (i32.const 9564) "\1c\00\00\00\03\00\00\00\00\00\00\00\05\00\00\00\0c\00\00\00\10%\00\00\00\00\00\00P%")
 (data $113 (i32.const 9596) ",")
 (data $113.1 (i32.const 9608) "\02\00\00\00\1c\00\00\00C\00u\00r\00r\00e\00n\00t\00 \00s\00i\00z\00e\00:\00 ")
 (data $114 (i32.const 9644) "<")
 (data $114.1 (i32.const 9656) "\02\00\00\00$\00\00\00M\00e\00t\00h\00o\00d\00 \00n\00o\00t\00 \00f\00o\00u\00n\00d\00:\00 ")
 (data $115 (i32.const 9708) "\8c")
 (data $115.1 (i32.const 9720) "\02\00\00\00p\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00c\00o\00n\00t\00r\00a\00c\00t\00s\00/\00O\00P\00_\00N\00E\00T\00.\00t\00s")
 (data $116 (i32.const 9852) "L")
 (data $116.1 (i32.const 9864) "\02\00\00\00:\00\00\00P\00o\00i\00n\00t\00e\00r\00 \00m\00u\00s\00t\00 \00b\00e\00 \003\002\00 \00b\00y\00t\00e\00s\00 \00l\00o\00n\00g")
 (data $117 (i32.const 9932) "\\")
 (data $117.1 (i32.const 9944) "\02\00\00\00B\00\00\00K\00e\00y\00 \00n\00o\00t\00 \00f\00o\00u\00n\00d\00 \00i\00n\00 \00m\00a\00p\00 \00(\00u\00i\00n\00t\008\00a\00r\00r\00a\00y\00)")
 (data $118 (i32.const 10028) "\8c")
 (data $118.1 (i32.const 10040) "\02\00\00\00z\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00g\00e\00n\00e\00r\00i\00c\00/\00M\00a\00p\00U\00i\00n\00t\008\00A\00r\00r\00a\00y\00.\00t\00s")
 (data $119 (i32.const 10172) "L")
 (data $119.1 (i32.const 10184) "\02\00\00\00.\00\00\00R\00e\00e\00n\00t\00r\00a\00n\00c\00y\00G\00u\00a\00r\00d\00:\00 \00L\00O\00C\00K\00E\00D")
 (data $120 (i32.const 10252) "\9c")
 (data $120.1 (i32.const 10264) "\02\00\00\00\82\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00c\00o\00n\00t\00r\00a\00c\00t\00s\00/\00R\00e\00e\00n\00t\00r\00a\00n\00c\00y\00G\00u\00a\00r\00d\00.\00t\00s")
 (data $121 (i32.const 10412) "\\")
 (data $121.1 (i32.const 10424) "\02\00\00\00F\00\00\00R\00e\00e\00n\00t\00r\00a\00n\00c\00y\00G\00u\00a\00r\00d\00:\00 \00M\00a\00x\00 \00d\00e\00p\00t\00h\00 \00e\00x\00c\00e\00e\00d\00e\00d")
 (data $122 (i32.const 10508) "L")
 (data $122.1 (i32.const 10520) "\02\00\00\006\00\00\00S\00a\00f\00e\00M\00a\00t\00h\00:\00 \00a\00d\00d\00i\00t\00i\00o\00n\00 \00o\00v\00e\00r\00f\00l\00o\00w")
 (data $123 (i32.const 10588) "L")
 (data $123.1 (i32.const 10600) "\02\00\00\00.\00\00\00T\00r\00a\00n\00s\00a\00c\00t\00i\00o\00n\00 \00i\00s\00 \00r\00e\00q\00u\00i\00r\00e\00d")
 (data $124 (i32.const 10668) "\\")
 (data $124.1 (i32.const 10680) "\02\00\00\00D\00\00\00O\00n\00l\00y\00 \00d\00e\00p\00l\00o\00y\00e\00r\00 \00c\00a\00n\00 \00c\00a\00l\00l\00 \00t\00h\00i\00s\00 \00m\00e\00t\00h\00o\00d")
 (data $125 (i32.const 10764) "<")
 (data $125.1 (i32.const 10776) "\02\00\00\00\1e\00\00\00T\00o\00k\00e\00n\00 \00i\00s\00 \00p\00a\00u\00s\00e\00d")
 (data $126 (i32.const 10828) ",")
 (data $126.1 (i32.const 10840) "\02\00\00\00\18\00\00\00P\00r\00e\00d\00T\00o\00k\00e\00n\00.\00t\00s")
 (data $127 (i32.const 10876) "\1c")
 (data $127.1 (i32.const 10888) "\01")
 (data $128 (i32.const 10908) "<")
 (data $128.1 (i32.const 10920) "\02\00\00\00 \00\00\00I\00n\00v\00a\00l\00i\00d\00 \00r\00e\00c\00e\00i\00v\00e\00r")
 (data $129 (i32.const 10972) "|")
 (data $129.1 (i32.const 10984) "\02\00\00\00l\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00c\00o\00n\00t\00r\00a\00c\00t\00s\00/\00O\00P\002\000\00.\00t\00s")
 (data $130 (i32.const 11100) "<")
 (data $130.1 (i32.const 11112) "\02\00\00\00 \00\00\00A\00d\00d\00r\00e\00s\00s\00M\00e\00m\00o\00r\00y\00M\00a\00p")
 (data $131 (i32.const 11164) "<")
 (data $131.1 (i32.const 11176) "\02\00\00\00$\00\00\00M\00a\00x\00 \00s\00u\00p\00p\00l\00y\00 \00r\00e\00a\00c\00h\00e\00d")
 (data $132 (i32.const 11228) "l")
 (data $132.1 (i32.const 11240) "\02\00\00\00R\00\00\00E\00v\00e\00n\00t\00 \00d\00a\00t\00a\00 \00l\00e\00n\00g\00t\00h\00 \00e\00x\00c\00e\00e\00d\00s\00 \00m\00a\00x\00i\00m\00u\00m\00 \00l\00e\00n\00g\00t\00h\00.")
 (data $133 (i32.const 11340) "\8c")
 (data $133.1 (i32.const 11352) "\02\00\00\00n\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00e\00v\00e\00n\00t\00s\00/\00N\00e\00t\00E\00v\00e\00n\00t\00.\00t\00s")
 (data $134 (i32.const 11484) "\1c")
 (data $134.1 (i32.const 11496) "\02\00\00\00\0c\00\00\00M\00i\00n\00t\00e\00d")
 (data $135 (i32.const 11516) "<")
 (data $135.1 (i32.const 11528) "\02\00\00\00*\00\00\00B\00u\00f\00f\00e\00r\00 \00i\00s\00 \00n\00o\00t\00 \00d\00e\00f\00i\00n\00e\00d")
 (data $136 (i32.const 11580) "\\")
 (data $136.1 (i32.const 11592) "\02\00\00\00F\00\00\00b\00i\00g\00E\00n\00d\00i\00a\00n\00A\00d\00d\00:\00 \00b\00a\00s\00e\00 \00m\00u\00s\00t\00 \00b\00e\00 \003\002\00 \00b\00y\00t\00e\00s")
 (data $137 (i32.const 11676) "l")
 (data $137.1 (i32.const 11688) "\02\00\00\00N\00\00\00a\00d\00d\00U\00i\00n\00t\008\00A\00r\00r\00a\00y\00s\00B\00E\00 \00e\00x\00p\00e\00c\00t\00s\00 \003\002\00-\00b\00y\00t\00e\00 \00i\00n\00p\00u\00t\00s")
 (data $138 (i32.const 11788) "L")
 (data $138.1 (i32.const 11800) "\02\00\00\00.\00\00\00P\00r\00o\00t\00o\00c\00o\00l\00 \00i\00d\00 \00i\00s\00 \00r\00e\00q\00u\00i\00r\00e\00d")
 (data $139 (i32.const 11868) "L")
 (data $139.1 (i32.const 11880) "\02\00\00\008\00\00\00C\00o\00n\00t\00r\00a\00c\00t\00 \00a\00d\00d\00r\00e\00s\00s\00 \00i\00s\00 \00r\00e\00q\00u\00i\00r\00e\00d")
 (data $140 (i32.const 11948) "L")
 (data $140.1 (i32.const 11960) "\02\00\00\004\00\00\00K\00e\00y\00 \00n\00o\00t\00 \00f\00o\00u\00n\00d\00 \00i\00n\00 \00m\00a\00p\00 \00(\00M\00a\00p\00)")
 (data $141 (i32.const 12028) "|")
 (data $141.1 (i32.const 12040) "\02\00\00\00f\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00g\00e\00n\00e\00r\00i\00c\00/\00M\00a\00p\00.\00t\00s")
 (data $142 (i32.const 12156) ",")
 (data $142.1 (i32.const 12168) "\02\00\00\00\1c\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00s\00e\00n\00d\00e\00r")
 (data $143 (i32.const 12204) "<")
 (data $143.1 (i32.const 12216) "\02\00\00\00(\00\00\00I\00n\00s\00u\00f\00f\00i\00c\00i\00e\00n\00t\00 \00b\00a\00l\00a\00n\00c\00e")
 (data $144 (i32.const 12268) "\\")
 (data $144.1 (i32.const 12280) "\02\00\00\00>\00\00\00S\00a\00f\00e\00M\00a\00t\00h\00:\00 \00s\00u\00b\00t\00r\00a\00c\00t\00i\00o\00n\00 \00u\00n\00d\00e\00r\00f\00l\00o\00w")
 (data $145 (i32.const 12364) ",")
 (data $145.1 (i32.const 12376) "\02\00\00\00\16\00\00\00T\00r\00a\00n\00s\00f\00e\00r\00r\00e\00d")
 (data $146 (i32.const 12412) "<")
 (data $146.1 (i32.const 12424) "\02\00\00\00,\00\00\00I\00n\00s\00u\00f\00f\00i\00c\00i\00e\00n\00t\00 \00a\00l\00l\00o\00w\00a\00n\00c\00e")
 (data $147 (i32.const 12476) "<")
 (data $147.1 (i32.const 12488) "\02\00\00\00 \00\00\00i\00n\00v\00a\00l\00i\00d\00 \00d\00o\00w\00n\00c\00a\00s\00t")
 (data $148 (i32.const 12540) "\8c")
 (data $148.1 (i32.const 12552) "\02\00\00\00n\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00m\00e\00m\00o\00r\00y\00/\00M\00a\00p\00O\00f\00M\00a\00p\00.\00t\00s")
 (data $149 (i32.const 12684) "\\")
 (data $149.1 (i32.const 12696) "\02\00\00\00@\00\00\00D\00e\00s\00t\00i\00n\00a\00t\00i\00o\00n\00 \00c\00o\00n\00t\00r\00a\00c\00t\00 \00i\00s\00 \00r\00e\00q\00u\00i\00r\00e\00d")
 (data $150 (i32.const 12780) "L")
 (data $150.1 (i32.const 12792) "\02\00\00\00<\00\00\00T\00r\00a\00n\00s\00f\00e\00r\00 \00r\00e\00j\00e\00c\00t\00e\00d\00 \00b\00y\00 \00r\00e\00c\00i\00p\00i\00e\00n\00t")
 (data $151 (i32.const 12860) "<")
 (data $151.1 (i32.const 12872) "\02\00\00\00 \00\00\00I\00n\00v\00a\00l\00i\00d\00 \00a\00p\00p\00r\00o\00v\00e\00r")
 (data $152 (i32.const 12924) "<")
 (data $152.1 (i32.const 12936) "\02\00\00\00\1e\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00s\00p\00e\00n\00d\00e\00r")
 (data $153 (i32.const 12988) ",")
 (data $153.1 (i32.const 13000) "\02\00\00\00\10\00\00\00A\00p\00p\00r\00o\00v\00e\00d")
 (data $154 (i32.const 13036) "L")
 (data $154.1 (i32.const 13048) "\02\00\00\000\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00s\00i\00g\00n\00a\00t\00u\00r\00e\00 \00l\00e\00n\00g\00t\00h")
 (data $155 (i32.const 13116) "<")
 (data $155.1 (i32.const 13128) "\02\00\00\00\"\00\00\00B\00l\00o\00c\00k\00 \00i\00s\00 \00r\00e\00q\00u\00i\00r\00e\00d")
 (data $156 (i32.const 13180) "<")
 (data $156.1 (i32.const 13192) "\02\00\00\00\"\00\00\00S\00i\00g\00n\00a\00t\00u\00r\00e\00 \00e\00x\00p\00i\00r\00e\00d")
 (data $157 (i32.const 13244) "L")
 (data $157.1 (i32.const 13256) "\02\00\00\002\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00s\00i\00g\00n\00a\00t\00u\00r\00e\00 \00l\00e\00n\00g\00t\00h\00.")
 (data $158 (i32.const 13324) "<")
 (data $158.1 (i32.const 13336) "\02\00\00\00(\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00h\00a\00s\00h\00 \00l\00e\00n\00g\00t\00h\00.")
 (data $159 (i32.const 13388) "L")
 (data $159.1 (i32.const 13400) "\02\00\00\00:\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00M\00L\00-\00D\00S\00A\00 \00s\00e\00c\00u\00r\00i\00t\00y\00 \00l\00e\00v\00e\00l")
 (data $160 (i32.const 13468) "\9c")
 (data $160.1 (i32.const 13480) "\02\00\00\00\86\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00e\00n\00v\00/\00c\00o\00n\00s\00e\00n\00s\00u\00s\00/\00M\00L\00D\00S\00A\00M\00e\00t\00a\00d\00a\00t\00a\00.\00t\00s")
 (data $161 (i32.const 13628) "L")
 (data $161.1 (i32.const 13640) "\02\00\00\006\00\00\00M\00L\00-\00D\00S\00A\00 \00p\00u\00b\00l\00i\00c\00 \00k\00e\00y\00 \00n\00o\00t\00 \00f\00o\00u\00n\00d")
 (data $162 (i32.const 13708) "|")
 (data $162.1 (i32.const 13720) "\02\00\00\00d\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00e\00n\00v\00/\00g\00l\00o\00b\00a\00l\00.\00t\00s")
 (data $163 (i32.const 13836) "\\")
 (data $163.1 (i32.const 13848) "\02\00\00\00B\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00M\00L\00-\00D\00S\00A\00 \00p\00u\00b\00l\00i\00c\00 \00k\00e\00y\00 \00l\00e\00n\00g\00t\00h\00.")
 (data $164 (i32.const 13932) "\\")
 (data $164.1 (i32.const 13944) "\02\00\00\00@\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00M\00L\00-\00D\00S\00A\00 \00s\00i\00g\00n\00a\00t\00u\00r\00e\00 \00l\00e\00n\00g\00t\00h\00.")
 (data $165 (i32.const 14028) "<")
 (data $165.1 (i32.const 14040) "\02\00\00\00\"\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00s\00i\00g\00n\00a\00t\00u\00r\00e")
 (data $166 (i32.const 14092) "\1c")
 (data $166.1 (i32.const 14104) "\02\00\00\00\0c\00\00\00B\00u\00r\00n\00e\00d")
 (data $167 (i32.const 14124) "\\")
 (data $167.1 (i32.const 14136) "\02\00\00\00@\00\00\00R\00e\00e\00n\00t\00r\00a\00n\00c\00y\00G\00u\00a\00r\00d\00:\00 \00D\00e\00p\00t\00h\00 \00u\00n\00d\00e\00r\00f\00l\00o\00w")
 (data $168 (i32.const 14220) "<")
 (data $168.1 (i32.const 14232) "\02\00\00\00&\00\00\00A\00l\00r\00e\00a\00d\00y\00 \00i\00n\00i\00t\00i\00a\00l\00i\00z\00e\00d")
 (data $169 (i32.const 14284) ",")
 (data $169.1 (i32.const 14296) "\02\00\00\00\1a\00\00\00D\00e\00c\00i\00m\00a\00l\00s\00 \00>\00 \003\002")
 (data $170 (i32.const 14332) "L")
 (data $170.1 (i32.const 14344) "\02\00\00\002\00\00\00:\00 \00v\00a\00l\00u\00e\00 \00i\00s\00 \00t\00o\00o\00 \00l\00o\00n\00g\00 \00(\00m\00a\00x\00=")
 (data $171 (i32.const 14412) ",\00\00\00\03\00\00\00\00\00\00\00\05\00\00\00\10\00\00\00\00\00\00\00\108\00\00\00\00\00\00\80\n")
 (data $172 (i32.const 14460) "\9c")
 (data $172.1 (i32.const 14472) "\02\00\00\00\80\00\00\00~\00l\00i\00b\00/\00@\00b\00t\00c\00-\00v\00i\00s\00i\00o\00n\00/\00b\00t\00c\00-\00r\00u\00n\00t\00i\00m\00e\00/\00r\00u\00n\00t\00i\00m\00e\00/\00s\00t\00o\00r\00a\00g\00e\00/\00B\00a\00s\00e\00S\00t\00o\00r\00e\00d\00S\00t\00r\00i\00n\00g\00.\00t\00s")
 (data $173 (i32.const 14620) "L")
 (data $173.1 (i32.const 14632) "\02\00\00\004\00\00\00S\00a\00f\00e\00M\00a\00t\00h\00:\00 \00d\00i\00v\00i\00s\00i\00o\00n\00 \00b\00y\00 \00z\00e\00r\00o")
 (data $174 (i32.const 14700) ",")
 (data $174.1 (i32.const 14712) "\02\00\00\00\18\00\00\00S\00t\00o\00r\00e\00d\00S\00t\00r\00i\00n\00g")
 (table $0 2 2 funcref)
 (elem $0 (i32.const 1) $start:src/pred-index~anonymous|0)
 (export "abort" (func $src/pred-index/abort))
 (export "execute" (func $~lib/@btc-vision/btc-runtime/runtime/exports/index/execute))
 (export "onDeploy" (func $~lib/@btc-vision/btc-runtime/runtime/exports/index/onDeploy))
 (export "memory" (memory $0))
 (export "start" (func $~start))
 (func $~lib/util/number/decimalCount32 (param $0 i32) (result i32)
  local.get $0
  i32.const 100000
  i32.lt_u
  if (result i32)
   local.get $0
   i32.const 10
   i32.ge_u
   i32.const 1
   i32.add
   local.get $0
   i32.const 10000
   i32.ge_u
   i32.const 3
   i32.add
   local.get $0
   i32.const 1000
   i32.ge_u
   i32.add
   local.get $0
   i32.const 100
   i32.lt_u
   select
  else
   local.get $0
   i32.const 1000000
   i32.ge_u
   i32.const 6
   i32.add
   local.get $0
   i32.const 1000000000
   i32.ge_u
   i32.const 8
   i32.add
   local.get $0
   i32.const 100000000
   i32.ge_u
   i32.add
   local.get $0
   i32.const 10000000
   i32.lt_u
   select
  end
 )
 (func $~lib/util/number/utoa_dec_simple<u32> (param $0 i32) (param $1 i32) (param $2 i32)
  loop $do-loop|0
   local.get $0
   local.get $2
   i32.const 1
   i32.sub
   local.tee $2
   i32.const 1
   i32.shl
   i32.add
   local.get $1
   i32.const 10
   i32.rem_u
   i32.const 48
   i32.add
   i32.store16
   local.get $1
   i32.const 10
   i32.div_u
   local.tee $1
   br_if $do-loop|0
  end
 )
 (func $~lib/util/number/utoa32 (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  local.get $0
  i32.eqz
  if
   i32.const 1904
   return
  end
  local.get $0
  call $~lib/util/number/decimalCount32
  local.tee $1
  i32.const 1
  i32.shl
  i32.const 2
  call $~lib/rt/stub/__new
  local.tee $2
  local.get $0
  local.get $1
  call $~lib/util/number/utoa_dec_simple<u32>
  local.get $2
 )
 (func $~lib/staticarray/StaticArray<~lib/string/String>#__uset (param $0 i32) (param $1 i32) (param $2 i32)
  local.get $0
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  local.get $2
  i32.store
 )
 (func $~lib/string/String#concat (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const -2
  i32.and
  local.tee $2
  local.get $1
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const -2
  i32.and
  local.tee $3
  i32.add
  local.tee $4
  i32.eqz
  if
   i32.const 2032
   return
  end
  local.get $4
  i32.const 2
  call $~lib/rt/stub/__new
  local.tee $4
  local.get $0
  local.get $2
  memory.copy
  local.get $2
  local.get $4
  i32.add
  local.get $1
  local.get $3
  memory.copy
  local.get $4
 )
 (func $~lib/staticarray/StaticArray<~lib/string/String>#join (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  block $__inlined_func$~lib/util/string/joinReferenceArray<~lib/string/String>$13 (result i32)
   i32.const 2032
   local.get $0
   local.tee $1
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 2
   i32.shr_u
   i32.const 1
   i32.sub
   local.tee $2
   i32.const 0
   i32.lt_s
   br_if $__inlined_func$~lib/util/string/joinReferenceArray<~lib/string/String>$13
   drop
   local.get $2
   i32.eqz
   if
    local.get $0
    i32.load
    local.tee $0
    i32.const 2032
    local.get $0
    select
    br $__inlined_func$~lib/util/string/joinReferenceArray<~lib/string/String>$13
   end
   i32.const 2032
   local.set $0
   i32.const 2028
   i32.load
   i32.const 1
   i32.shr_u
   local.set $4
   loop $for-loop|0
    local.get $2
    local.get $3
    i32.gt_s
    if
     local.get $1
     local.get $3
     i32.const 2
     i32.shl
     i32.add
     i32.load
     local.tee $5
     if
      local.get $0
      local.get $5
      call $~lib/string/String#concat
      local.set $0
     end
     local.get $4
     if
      local.get $0
      i32.const 2032
      call $~lib/string/String#concat
      local.set $0
     end
     local.get $3
     i32.const 1
     i32.add
     local.set $3
     br $for-loop|0
    end
   end
   local.get $1
   local.get $2
   i32.const 2
   i32.shl
   i32.add
   i32.load
   local.tee $1
   if (result i32)
    local.get $0
    local.get $1
    call $~lib/string/String#concat
   else
    local.get $0
   end
  end
 )
 (func $~lib/string/String.UTF8.byteLength (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.add
  local.set $2
  loop $while-continue|0
   local.get $0
   local.get $2
   i32.lt_u
   if
    local.get $0
    i32.load16_u
    local.tee $3
    i32.const 128
    i32.lt_u
    if (result i32)
     local.get $1
     i32.const 1
     i32.add
    else
     local.get $3
     i32.const 2048
     i32.lt_u
     if (result i32)
      local.get $1
      i32.const 2
      i32.add
     else
      local.get $3
      i32.const 64512
      i32.and
      i32.const 55296
      i32.eq
      local.get $0
      i32.const 2
      i32.add
      local.get $2
      i32.lt_u
      i32.and
      if
       local.get $0
       i32.load16_u offset=2
       i32.const 64512
       i32.and
       i32.const 56320
       i32.eq
       if
        local.get $1
        i32.const 4
        i32.add
        local.set $1
        local.get $0
        i32.const 4
        i32.add
        local.set $0
        br $while-continue|0
       end
      end
      local.get $1
      i32.const 3
      i32.add
     end
    end
    local.set $1
    local.get $0
    i32.const 2
    i32.add
    local.set $0
    br $while-continue|0
   end
  end
  local.get $1
 )
 (func $~lib/string/String.UTF8.encodeUnsafe (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  local.get $0
  local.get $1
  i32.const 1
  i32.shl
  i32.add
  local.set $3
  local.get $2
  local.set $1
  loop $while-continue|0
   local.get $0
   local.get $3
   i32.lt_u
   if
    local.get $0
    i32.load16_u
    local.tee $2
    i32.const 128
    i32.lt_u
    if (result i32)
     local.get $1
     local.get $2
     i32.store8
     local.get $1
     i32.const 1
     i32.add
    else
     local.get $2
     i32.const 2048
     i32.lt_u
     if (result i32)
      local.get $1
      local.get $2
      i32.const 6
      i32.shr_u
      i32.const 192
      i32.or
      local.get $2
      i32.const 63
      i32.and
      i32.const 128
      i32.or
      i32.const 8
      i32.shl
      i32.or
      i32.store16
      local.get $1
      i32.const 2
      i32.add
     else
      local.get $2
      i32.const 56320
      i32.lt_u
      local.get $0
      i32.const 2
      i32.add
      local.get $3
      i32.lt_u
      i32.and
      local.get $2
      i32.const 63488
      i32.and
      i32.const 55296
      i32.eq
      i32.and
      if
       local.get $0
       i32.load16_u offset=2
       local.tee $4
       i32.const 64512
       i32.and
       i32.const 56320
       i32.eq
       if
        local.get $1
        local.get $2
        i32.const 1023
        i32.and
        i32.const 10
        i32.shl
        i32.const 65536
        i32.add
        local.get $4
        i32.const 1023
        i32.and
        i32.or
        local.tee $2
        i32.const 63
        i32.and
        i32.const 128
        i32.or
        i32.const 24
        i32.shl
        local.get $2
        i32.const 6
        i32.shr_u
        i32.const 63
        i32.and
        i32.const 128
        i32.or
        i32.const 16
        i32.shl
        i32.or
        local.get $2
        i32.const 12
        i32.shr_u
        i32.const 63
        i32.and
        i32.const 128
        i32.or
        i32.const 8
        i32.shl
        i32.or
        local.get $2
        i32.const 18
        i32.shr_u
        i32.const 240
        i32.or
        i32.or
        i32.store
        local.get $1
        i32.const 4
        i32.add
        local.set $1
        local.get $0
        i32.const 4
        i32.add
        local.set $0
        br $while-continue|0
       end
      end
      local.get $1
      local.get $2
      i32.const 12
      i32.shr_u
      i32.const 224
      i32.or
      local.get $2
      i32.const 6
      i32.shr_u
      i32.const 63
      i32.and
      i32.const 128
      i32.or
      i32.const 8
      i32.shl
      i32.or
      i32.store16
      local.get $1
      local.get $2
      i32.const 63
      i32.and
      i32.const 128
      i32.or
      i32.store8 offset=2
      local.get $1
      i32.const 3
      i32.add
     end
    end
    local.set $1
    local.get $0
    i32.const 2
    i32.add
    local.set $0
    br $while-continue|0
   end
  end
 )
 (func $~lib/string/String.UTF8.encode@varargs (param $0 i32) (result i32)
  (local $1 i32)
  block $2of2
   block $outOfRange
    global.get $~argumentsLength
    i32.const 1
    i32.sub
    br_table $2of2 $2of2 $2of2 $outOfRange
   end
   unreachable
  end
  local.get $0
  call $~lib/string/String.UTF8.byteLength
  i32.const 1
  call $~lib/rt/stub/__new
  local.set $1
  local.get $0
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  local.get $1
  call $~lib/string/String.UTF8.encodeUnsafe
  local.get $1
 )
 (func $~lib/typedarray/Uint8Array.wrap@varargs (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  block $2of2
   block $1of2
    block $outOfRange
     global.get $~argumentsLength
     i32.const 1
     i32.sub
     br_table $1of2 $1of2 $2of2 $outOfRange
    end
    unreachable
   end
   i32.const -1
   local.set $2
  end
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  local.set $1
  local.get $2
  i32.const 0
  i32.lt_s
  if
   local.get $2
   i32.const -1
   i32.ne
   if
    i32.const 2304
    i32.const 2240
    i32.const 1869
    i32.const 7
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $1
   local.set $2
  else
   local.get $1
   local.get $2
   i32.lt_s
   if
    i32.const 2304
    i32.const 2240
    i32.const 1874
    i32.const 7
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
  end
  i32.const 12
  i32.const 7
  call $~lib/rt/stub/__new
  local.tee $1
  local.get $0
  i32.store
  local.get $1
  local.get $2
  i32.store offset=8
  local.get $1
  local.get $0
  i32.store offset=4
  local.get $1
 )
 (func $~lib/arraybuffer/ArrayBuffer#constructor (param $0 i32) (result i32)
  (local $1 i32)
  local.get $0
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 2304
   i32.const 2352
   i32.const 52
   i32.const 43
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.const 1
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  local.get $0
  memory.fill
  local.get $1
 )
 (func $~lib/dataview/DataView#constructor@varargs (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  block $2of2
   block $1of2
    block $outOfRange
     global.get $~argumentsLength
     i32.const 1
     i32.sub
     br_table $1of2 $1of2 $2of2 $outOfRange
    end
    unreachable
   end
   local.get $0
   i32.const 20
   i32.sub
   i32.load offset=16
   local.set $2
  end
  i32.const 12
  i32.const 8
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  i32.const 0
  i32.store offset=8
  local.get $2
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.gt_u
  local.get $2
  i32.const 1073741820
  i32.gt_u
  i32.or
  if
   i32.const 2304
   i32.const 2416
   i32.const 25
   i32.const 7
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
  local.get $0
  i32.store
  local.get $1
  local.get $0
  i32.store offset=4
  local.get $1
  local.get $2
  i32.store offset=8
  local.get $1
 )
 (func $~lib/polyfills/bswap<u32> (param $0 i32) (result i32)
  local.get $0
  i32.const -16711936
  i32.and
  i32.const 8
  i32.rotl
  local.get $0
  i32.const 16711935
  i32.and
  i32.const 8
  i32.rotr
  i32.or
 )
 (func $~lib/dataview/DataView#setUint32 (param $0 i32) (param $1 i32) (param $2 i32)
  local.get $1
  i32.const 31
  i32.shr_u
  local.get $0
  i32.load offset=8
  local.get $1
  i32.const 4
  i32.add
  i32.lt_s
  i32.or
  if
   i32.const 2176
   i32.const 2416
   i32.const 142
   i32.const 7
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.add
  local.get $2
  call $~lib/polyfills/bswap<u32>
  i32.store
 )
 (func $~lib/typedarray/Uint8Array#__get (param $0 i32) (param $1 i32) (result i32)
  local.get $1
  local.get $0
  i32.load offset=8
  i32.ge_u
  if
   i32.const 2176
   i32.const 2240
   i32.const 167
   i32.const 45
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.add
  i32.load8_u
 )
 (func $~lib/dataview/DataView#setUint8 (param $0 i32) (param $1 i32) (param $2 i32)
  local.get $1
  local.get $0
  i32.load offset=8
  i32.ge_u
  if
   i32.const 2176
   i32.const 2416
   i32.const 128
   i32.const 50
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.add
  local.get $2
  i32.store8
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 i32)
  local.get $2
  call $~lib/util/number/utoa32
  local.set $2
  local.get $3
  call $~lib/util/number/utoa32
  local.set $3
  i32.const 1120
  i32.const 0
  local.get $0
  call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
  i32.const 1120
  i32.const 2
  local.get $1
  call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
  i32.const 1120
  i32.const 4
  local.get $2
  call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
  i32.const 1120
  i32.const 6
  local.get $3
  call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
  i32.const 1120
  call $~lib/staticarray/StaticArray<~lib/string/String>#join
  i32.const 1
  global.set $~argumentsLength
  call $~lib/string/String.UTF8.encode@varargs
  i32.const 1
  global.set $~argumentsLength
  call $~lib/typedarray/Uint8Array.wrap@varargs
  local.tee $0
  i32.load offset=8
  i32.const 8
  i32.add
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.set $1
  i32.const 1
  global.set $~argumentsLength
  local.get $1
  call $~lib/dataview/DataView#constructor@varargs
  local.tee $2
  i32.const 0
  i32.const 1668521308
  call $~lib/dataview/DataView#setUint32
  local.get $2
  i32.const 4
  local.get $0
  i32.load offset=8
  call $~lib/dataview/DataView#setUint32
  loop $for-loop|0
   local.get $4
   local.get $0
   i32.load offset=8
   i32.lt_s
   if
    local.get $2
    local.get $4
    i32.const 8
    i32.add
    local.get $0
    local.get $4
    call $~lib/typedarray/Uint8Array#__get
    call $~lib/dataview/DataView#setUint8
    local.get $4
    i32.const 1
    i32.add
    local.set $4
    br $for-loop|0
   end
  end
  i32.const 1
  local.get $1
  local.get $1
  i32.const 20
  i32.sub
  i32.load offset=16
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/env_exit
 )
 (func $src/pred-index/abort (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
 )
 (func $~lib/rt/stub/maybeGrowMemory (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  memory.size
  local.tee $1
  i32.const 16
  i32.shl
  i32.const 15
  i32.add
  i32.const -16
  i32.and
  local.tee $2
  local.get $0
  i32.lt_u
  if
   local.get $1
   local.get $0
   local.get $2
   i32.sub
   i32.const 65535
   i32.add
   i32.const -65536
   i32.and
   i32.const 16
   i32.shr_u
   local.tee $2
   local.get $1
   local.get $2
   i32.gt_s
   select
   memory.grow
   i32.const 0
   i32.lt_s
   if
    local.get $2
    memory.grow
    i32.const 0
    i32.lt_s
    if
     unreachable
    end
   end
  end
  local.get $0
  global.set $~lib/rt/stub/offset
 )
 (func $~lib/rt/stub/__alloc (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  local.get $0
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 2480
   i32.const 2544
   i32.const 33
   i32.const 29
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  global.get $~lib/rt/stub/offset
  global.get $~lib/rt/stub/offset
  i32.const 4
  i32.add
  local.tee $2
  local.get $0
  i32.const 19
  i32.add
  i32.const -16
  i32.and
  i32.const 4
  i32.sub
  local.tee $0
  i32.add
  call $~lib/rt/stub/maybeGrowMemory
  local.get $0
  i32.store
  local.get $2
 )
 (func $~lib/rt/stub/__new (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  i32.const 1073741804
  i32.gt_u
  if
   i32.const 2480
   i32.const 2544
   i32.const 86
   i32.const 30
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.const 16
  i32.add
  call $~lib/rt/stub/__alloc
  local.tee $3
  i32.const 4
  i32.sub
  local.tee $2
  i32.const 0
  i32.store offset=4
  local.get $2
  i32.const 0
  i32.store offset=8
  local.get $2
  local.get $1
  i32.store offset=12
  local.get $2
  local.get $0
  i32.store offset=16
  local.get $3
  i32.const 16
  i32.add
 )
 (func $~lib/@btc-vision/as-bignum/assembly/integer/u128/u128#constructor (param $0 i64) (param $1 i64) (result i32)
  (local $2 i32)
  i32.const 16
  i32.const 4
  call $~lib/rt/stub/__new
  local.tee $2
  local.get $0
  i64.store
  local.get $2
  local.get $1
  i64.store offset=8
  local.get $2
 )
 (func $~lib/typedarray/Uint8Array#constructor (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  local.get $0
  i32.eqz
  if
   i32.const 12
   i32.const 7
   call $~lib/rt/stub/__new
   local.set $0
  end
  local.get $0
  i32.eqz
  if
   i32.const 12
   i32.const 3
   call $~lib/rt/stub/__new
   local.set $0
  end
  local.get $0
  i32.const 0
  i32.store
  local.get $0
  i32.const 0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 2304
   i32.const 2352
   i32.const 19
   i32.const 57
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
  i32.const 1
  call $~lib/rt/stub/__new
  local.tee $2
  i32.const 0
  local.get $1
  memory.fill
  local.get $0
  local.get $2
  i32.store
  local.get $0
  local.get $2
  i32.store offset=4
  local.get $0
  local.get $1
  i32.store offset=8
  local.get $0
 )
 (func $~lib/util/number/itoa32 (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  i32.eqz
  if
   i32.const 1904
   return
  end
  i32.const 0
  local.get $0
  i32.sub
  local.get $0
  local.get $0
  i32.const 31
  i32.shr_u
  i32.const 1
  i32.shl
  local.tee $3
  select
  local.tee $1
  call $~lib/util/number/decimalCount32
  local.tee $0
  i32.const 1
  i32.shl
  local.get $3
  i32.add
  i32.const 2
  call $~lib/rt/stub/__new
  local.tee $2
  local.get $3
  i32.add
  local.get $1
  local.get $0
  call $~lib/util/number/utoa_dec_simple<u32>
  local.get $3
  if
   local.get $2
   i32.const 45
   i32.store16
  end
  local.get $2
 )
 (func $~lib/typedarray/Uint8Array#set<~lib/array/Array<u8>> (param $0 i32) (param $1 i32)
  (local $2 i32)
  local.get $1
  i32.load offset=12
  local.tee $2
  local.get $0
  i32.load offset=8
  i32.gt_s
  if
   i32.const 2176
   i32.const 2240
   i32.const 1902
   i32.const 5
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.load offset=4
  local.get $2
  memory.copy
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#constructor (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  i32.eqz
  if
   i32.const 20
   i32.const 9
   call $~lib/rt/stub/__new
   local.set $0
  end
  local.get $0
  i32.const 0
  i32.store8 offset=12
  local.get $0
  i32.const 0
  i32.store offset=16
  local.get $0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.set $0
  local.get $1
  if (result i32)
   local.get $1
   i32.load offset=12
  else
   i32.const 0
  end
  if
   local.get $1
   i32.load offset=12
   i32.const 32
   i32.ne
   if
    i32.const 2720
    i32.const 1
    local.get $1
    i32.load offset=12
    call $~lib/util/number/itoa32
    call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
    i32.const 2720
    call $~lib/staticarray/StaticArray<~lib/string/String>#join
    i32.const 2752
    i32.const 335
    i32.const 13
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $0
   local.get $1
   call $~lib/typedarray/Uint8Array#set<~lib/array/Array<u8>>
   local.get $0
   i32.const 1
   i32.store8 offset=12
  end
  local.get $0
 )
 (func $~lib/rt/__newArray (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (result i32)
  (local $4 i32)
  local.get $0
  local.get $1
  i32.shl
  local.tee $4
  i32.const 1
  call $~lib/rt/stub/__new
  local.set $1
  local.get $3
  if
   local.get $1
   local.get $3
   local.get $4
   memory.copy
  end
  i32.const 16
  local.get $2
  call $~lib/rt/stub/__new
  local.tee $2
  local.get $1
  i32.store
  local.get $2
  local.get $1
  i32.store offset=4
  local.get $2
  local.get $4
  i32.store offset=8
  local.get $2
  local.get $0
  i32.store offset=12
  local.get $2
 )
 (func $~lib/typedarray/Uint8Array#__set (param $0 i32) (param $1 i32) (param $2 i32)
  local.get $1
  local.get $0
  i32.load offset=8
  i32.ge_u
  if
   i32.const 2176
   i32.const 2240
   i32.const 178
   i32.const 45
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.add
  local.get $2
  i32.store8
 )
 (func $~lib/typedarray/Uint8Array#set<~lib/array/Array<i32>> (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $1
  i32.load offset=12
  local.tee $3
  local.get $0
  i32.load offset=8
  i32.gt_s
  if
   i32.const 2176
   i32.const 2240
   i32.const 1902
   i32.const 5
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.set $0
  local.get $1
  i32.load offset=4
  local.set $1
  loop $for-loop|0
   local.get $2
   local.get $3
   i32.lt_s
   if
    local.get $0
    local.get $2
    i32.add
    local.get $1
    local.get $2
    i32.const 2
    i32.shl
    i32.add
    i32.load
    i32.store8
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/ExtendedAddress#constructor (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  i32.const 24
  i32.const 15
  call $~lib/rt/stub/__new
  local.tee $2
  i32.const 0
  i32.store offset=20
  local.get $2
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#constructor
  local.set $1
  local.get $0
  i32.load offset=12
  i32.const 32
  i32.ne
  if
   i32.const 3712
   i32.const 3824
   i32.const 62
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  i32.store offset=20
  local.get $1
  i32.load offset=20
  local.get $0
  call $~lib/typedarray/Uint8Array#set<~lib/array/Array<u8>>
  local.get $1
 )
 (func $~lib/array/Array<u8>#constructor (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  i32.const 16
  i32.const 10
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 0
  i32.store offset=12
  local.get $0
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 2304
   i32.const 4224
   i32.const 70
   i32.const 60
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  i32.const 8
  local.get $0
  local.get $0
  i32.const 8
  i32.le_u
  select
  local.tee $2
  i32.const 1
  call $~lib/rt/stub/__new
  local.tee $3
  i32.const 0
  local.get $2
  memory.fill
  local.get $1
  local.get $3
  i32.store
  local.get $1
  local.get $3
  i32.store offset=4
  local.get $1
  local.get $2
  i32.store offset=8
  local.get $1
  local.get $0
  i32.store offset=12
  local.get $1
 )
 (func $~lib/rt/stub/__realloc (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $0
  i32.const 15
  i32.and
  i32.const 1
  local.get $0
  select
  if
   i32.const 0
   i32.const 2544
   i32.const 45
   i32.const 3
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  global.get $~lib/rt/stub/offset
  local.get $0
  i32.const 4
  i32.sub
  local.tee $4
  i32.load
  local.tee $3
  local.get $0
  i32.add
  i32.eq
  local.set $5
  local.get $1
  i32.const 19
  i32.add
  i32.const -16
  i32.and
  i32.const 4
  i32.sub
  local.set $2
  local.get $1
  local.get $3
  i32.gt_u
  if
   local.get $5
   if
    local.get $1
    i32.const 1073741820
    i32.gt_u
    if
     i32.const 2480
     i32.const 2544
     i32.const 52
     i32.const 33
     call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
     unreachable
    end
    local.get $0
    local.get $2
    i32.add
    call $~lib/rt/stub/maybeGrowMemory
    local.get $4
    local.get $2
    i32.store
   else
    local.get $2
    local.get $3
    i32.const 1
    i32.shl
    local.tee $1
    local.get $1
    local.get $2
    i32.lt_u
    select
    call $~lib/rt/stub/__alloc
    local.tee $1
    local.get $0
    local.get $3
    memory.copy
    local.get $1
    local.set $0
   end
  else
   local.get $5
   if
    local.get $0
    local.get $2
    i32.add
    global.set $~lib/rt/stub/offset
    local.get $4
    local.get $2
    i32.store
   end
  end
  local.get $0
 )
 (func $~lib/rt/stub/__renew (param $0 i32) (param $1 i32) (result i32)
  local.get $1
  i32.const 1073741804
  i32.gt_u
  if
   i32.const 2480
   i32.const 2544
   i32.const 99
   i32.const 30
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.const 16
  i32.sub
  local.get $1
  i32.const 16
  i32.add
  call $~lib/rt/stub/__realloc
  local.tee $0
  i32.const 4
  i32.sub
  local.get $1
  i32.store offset=16
  local.get $0
  i32.const 16
  i32.add
 )
 (func $~lib/array/ensureCapacity (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $1
  local.get $0
  i32.load offset=8
  local.tee $3
  local.get $2
  i32.shr_u
  i32.gt_u
  if
   local.get $1
   i32.const 1073741820
   local.get $2
   i32.shr_u
   i32.gt_u
   if
    i32.const 2304
    i32.const 4224
    i32.const 19
    i32.const 48
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $0
   i32.load
   local.tee $4
   i32.const 1073741820
   local.get $3
   i32.const 1
   i32.shl
   local.tee $5
   local.get $5
   i32.const 1073741820
   i32.ge_u
   select
   local.tee $5
   i32.const 8
   local.get $1
   local.get $1
   i32.const 8
   i32.le_u
   select
   local.get $2
   i32.shl
   local.tee $1
   local.get $1
   local.get $5
   i32.lt_u
   select
   local.tee $1
   call $~lib/rt/stub/__renew
   local.tee $2
   local.get $3
   i32.add
   i32.const 0
   local.get $1
   local.get $3
   i32.sub
   memory.fill
   local.get $2
   local.get $4
   i32.ne
   if
    local.get $0
    local.get $2
    i32.store
    local.get $0
    local.get $2
    i32.store offset=4
   end
   local.get $0
   local.get $1
   i32.store offset=8
  end
 )
 (func $~lib/array/Array<u8>#__set (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   local.get $1
   i32.const 0
   i32.lt_s
   if
    i32.const 2176
    i32.const 4224
    i32.const 130
    i32.const 22
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $0
   local.get $1
   i32.const 1
   i32.add
   local.tee $3
   i32.const 0
   call $~lib/array/ensureCapacity
   local.get $0
   local.get $3
   i32.store offset=12
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.add
  local.get $2
  i32.store8
 )
 (func $~lib/typedarray/Uint8Array#slice (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  local.get $0
  i32.load offset=8
  local.set $3
  local.get $1
  i32.const 0
  i32.lt_s
  if (result i32)
   local.get $1
   local.get $3
   i32.add
   local.tee $1
   i32.const 0
   local.get $1
   i32.const 0
   i32.gt_s
   select
  else
   local.get $1
   local.get $3
   local.get $1
   local.get $3
   i32.lt_s
   select
  end
  local.set $1
  i32.const 0
  local.get $2
  i32.const 0
  i32.lt_s
  if (result i32)
   local.get $2
   local.get $3
   i32.add
   local.tee $2
   i32.const 0
   local.get $2
   i32.const 0
   i32.gt_s
   select
  else
   local.get $2
   local.get $3
   local.get $2
   local.get $3
   i32.lt_s
   select
  end
  local.get $1
  i32.sub
  local.tee $2
  i32.const 0
  local.get $2
  i32.const 0
  i32.gt_s
  select
  local.tee $2
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $3
  i32.load offset=4
  local.get $0
  i32.load offset=4
  local.get $1
  i32.add
  local.get $2
  memory.copy
  local.get $3
 )
 (func $~lib/typedarray/Uint8Array#slice@varargs (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  block $2of2
   block $1of2
    block $0of2
     block $outOfRange
      global.get $~argumentsLength
      br_table $0of2 $1of2 $2of2 $outOfRange
     end
     unreachable
    end
    i32.const 0
    local.set $1
   end
   i32.const 2147483647
   local.set $2
  end
  local.get $0
  local.get $1
  local.get $2
  call $~lib/typedarray/Uint8Array#slice
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/ExtendedAddress#clone (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  local.get $0
  i32.load offset=20
  i32.load offset=8
  call $~lib/array/Array<u8>#constructor
  local.set $3
  loop $for-loop|0
   local.get $1
   local.get $0
   i32.load offset=20
   i32.load offset=8
   i32.lt_s
   if
    local.get $3
    local.get $1
    local.get $0
    i32.load offset=20
    local.get $1
    call $~lib/typedarray/Uint8Array#__get
    call $~lib/array/Array<u8>#__set
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|0
   end
  end
  i32.const 1
  global.set $~argumentsLength
  local.get $0
  i32.const 0
  call $~lib/typedarray/Uint8Array#slice@varargs
  local.tee $1
  i32.load offset=8
  call $~lib/array/Array<u8>#constructor
  local.set $4
  loop $for-loop|1
   local.get $2
   local.get $1
   i32.load offset=8
   i32.lt_s
   if
    local.get $4
    local.get $2
    local.get $1
    local.get $2
    call $~lib/typedarray/Uint8Array#__get
    call $~lib/array/Array<u8>#__set
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|1
   end
  end
  local.get $3
  local.get $4
  call $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/ExtendedAddress#constructor
  local.tee $1
  local.get $0
  i32.load8_u offset=12
  i32.store8 offset=12
  local.get $1
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/generic/MapUint8Array/MapUint8Array#constructor (result i32)
  (local $0 i32)
  i32.const 12
  i32.const 17
  call $~lib/rt/stub/__new
  local.tee $0
  i32.eqz
  if
   i32.const 0
   i32.const 0
   call $~lib/rt/stub/__new
   local.set $0
  end
  local.get $0
  i32.const 0
  i32.const 2
  i32.const 19
  i32.const 4272
  call $~lib/rt/__newArray
  i32.store
  local.get $0
  i32.const 0
  i32.const 2
  i32.const 19
  i32.const 4304
  call $~lib/rt/__newArray
  i32.store offset=4
  local.get $0
  i32.const -1
  i32.store offset=8
  local.get $0
 )
 (func $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor (param $0 i64) (param $1 i64) (param $2 i64) (param $3 i64) (result i32)
  (local $4 i32)
  i32.const 32
  i32.const 25
  call $~lib/rt/stub/__new
  local.tee $4
  local.get $0
  i64.store
  local.get $4
  local.get $1
  i64.store offset=8
  local.get $4
  local.get $2
  i64.store offset=16
  local.get $4
  local.get $3
  i64.store offset=24
  local.get $4
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer (param $0 i32) (result i32)
  local.get $0
  i32.load16_u offset=36
  i32.const 65535
  i32.eq
  if
   i32.const 5376
   i32.const 5456
   i32.const 190
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  local.get $0
  i32.load16_u offset=36
  i32.const 1
  i32.add
  i32.store16 offset=36
  local.get $0
  i32.load16_u offset=36
 )
 (func $start:~lib/@btc-vision/btc-runtime/runtime/contracts/OP20
  i64.const 0
  i64.const 0
  i64.const 0
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  drop
  i64.const 1
  i64.const 0
  i64.const 0
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  drop
  i64.const 2
  i64.const 0
  i64.const 0
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  drop
  i64.const 3
  i64.const 0
  i64.const 0
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  drop
  i64.const 10
  i64.const 0
  i64.const 0
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  drop
  i64.const 65535
  i64.const 0
  i64.const 0
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  global.set $~lib/@btc-vision/btc-runtime/runtime/storage/StoredString/StoredString.MAX_LENGTH_U256
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  i32.const 65535
  i32.and
  global.set $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/statusPointer
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  i32.const 65535
  i32.and
  global.set $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/depthPointer
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  i32.const 65535
  i32.and
  global.set $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/nonceMapPointer
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  i32.const 65535
  i32.and
  global.set $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/maxSupplyPointer
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  i32.const 65535
  i32.and
  global.set $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/decimalsPointer
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  i32.const 65535
  i32.and
  global.set $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/stringPointer
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  i32.const 65535
  i32.and
  global.set $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/totalSupplyPointer
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  i32.const 65535
  i32.and
  global.set $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/allowanceMapPointer
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  i32.const 65535
  i32.and
  global.set $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/balanceOfMapPointer
 )
 (func $~lib/@btc-vision/as-bignum/assembly/integer/i128/i128#constructor (param $0 i64) (param $1 i64)
  (local $2 i32)
  i32.const 16
  i32.const 33
  call $~lib/rt/stub/__new
  local.tee $2
  local.get $0
  i64.store
  local.get $2
  local.get $1
  i64.store offset=8
 )
 (func $start:~lib/@btc-vision/btc-runtime/runtime/index
  (local $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  i32.const 14748
  global.set $~lib/rt/stub/offset
  i64.const 0
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u128/u128#constructor
  drop
  i64.const 1
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u128/u128#constructor
  drop
  i64.const -1
  i64.const -1
  call $~lib/@btc-vision/as-bignum/assembly/integer/u128/u128#constructor
  drop
  i32.const 0
  i32.const 0
  i32.const 0
  i32.const 10
  i32.const 2880
  call $~lib/rt/__newArray
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#constructor
  global.set $~lib/@btc-vision/btc-runtime/runtime/types/Address/ZERO_ADDRESS
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  global.set $~lib/@btc-vision/btc-runtime/runtime/math/bytes/EMPTY_BUFFER
  i32.const 0
  i32.const 30
  call $~lib/typedarray/Uint8Array#constructor
  global.set $~lib/@btc-vision/btc-runtime/runtime/math/bytes/EMPTY_POINTER
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  global.set $~lib/@btc-vision/btc-runtime/runtime/math/bytes/ONE_BUFFER
  global.get $~lib/@btc-vision/btc-runtime/runtime/math/bytes/ONE_BUFFER
  i32.const 31
  i32.const 1
  call $~lib/typedarray/Uint8Array#__set
  i32.const 16
  i32.const 12
  call $~lib/rt/stub/__new
  local.tee $3
  i32.const 0
  i32.store
  local.get $3
  i32.const 0
  i32.store offset=4
  local.get $3
  i32.const 0
  i32.store offset=8
  local.get $3
  i32.const 0
  i32.store offset=12
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $4
  i32.const 32
  i32.const 2
  i32.const 11
  i32.const 2976
  call $~lib/rt/__newArray
  call $~lib/typedarray/Uint8Array#set<~lib/array/Array<i32>>
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $0
  i32.const 32
  i32.const 2
  i32.const 11
  i32.const 3136
  call $~lib/rt/__newArray
  call $~lib/typedarray/Uint8Array#set<~lib/array/Array<i32>>
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $1
  i32.const 32
  i32.const 2
  i32.const 11
  i32.const 3296
  call $~lib/rt/__newArray
  call $~lib/typedarray/Uint8Array#set<~lib/array/Array<i32>>
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $2
  i32.const 32
  i32.const 2
  i32.const 11
  i32.const 3456
  call $~lib/rt/__newArray
  call $~lib/typedarray/Uint8Array#set<~lib/array/Array<i32>>
  local.get $3
  local.get $4
  i32.store
  local.get $3
  local.get $0
  i32.store offset=4
  local.get $3
  local.get $1
  i32.store offset=8
  local.get $3
  local.get $2
  i32.store offset=12
  local.get $3
  global.set $~lib/@btc-vision/btc-runtime/runtime/script/Networks/Network
  i32.const 32
  i32.const 0
  i32.const 10
  i32.const 3968
  call $~lib/rt/__newArray
  i32.const 32
  i32.const 0
  i32.const 10
  i32.const 4032
  call $~lib/rt/__newArray
  call $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/ExtendedAddress#constructor
  drop
  i32.const 32
  i32.const 0
  i32.const 10
  i32.const 4096
  call $~lib/rt/__newArray
  i32.const 32
  i32.const 0
  i32.const 10
  i32.const 4160
  call $~lib/rt/__newArray
  call $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/ExtendedAddress#constructor
  global.set $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/DEAD_ADDRESS
  i32.const 256
  call $~lib/arraybuffer/ArrayBuffer#constructor
  global.set $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/SCRATCH_BUF
  i32.const 1
  global.set $~argumentsLength
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/SCRATCH_BUF
  call $~lib/typedarray/Uint8Array.wrap@varargs
  drop
  i32.const 0
  i32.const 4
  call $~lib/typedarray/Uint8Array#constructor
  global.set $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/FOUR_BYTES_UINT8ARRAY_MEMORY_CACHE
  i32.const 56
  i32.const 16
  call $~lib/rt/stub/__new
  local.tee $0
  i32.eqz
  if
   i32.const 0
   i32.const 0
   call $~lib/rt/stub/__new
   local.set $0
  end
  local.get $0
  global.get $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/DEAD_ADDRESS
  call $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/ExtendedAddress#clone
  i32.store
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/generic/MapUint8Array/MapUint8Array#constructor
  i32.store offset=4
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/generic/MapUint8Array/MapUint8Array#constructor
  i32.store offset=8
  local.get $0
  i32.const 0
  i32.store offset=12
  local.get $0
  i32.const 0
  i32.const 2
  i32.const 23
  i32.const 4336
  call $~lib/rt/__newArray
  i32.store offset=16
  local.get $0
  i32.const -1
  i32.store offset=20
  local.get $0
  i32.const 0
  i32.store offset=24
  local.get $0
  i32.const 0
  i32.store offset=28
  local.get $0
  i32.const 0
  i32.store offset=32
  local.get $0
  i32.const 0
  i32.store16 offset=36
  local.get $0
  i32.const 0
  i32.store offset=40
  local.get $0
  i32.const 0
  i32.store offset=44
  local.get $0
  i32.const 0
  i32.store offset=48
  local.get $0
  i32.const 0
  i32.store offset=52
  local.get $0
  global.set $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $start:~lib/@btc-vision/btc-runtime/runtime/contracts/OP20
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  i64.const 0
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/i128/i128#constructor
  i64.const 1
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/i128/i128#constructor
  i64.const -1
  i64.const -1
  call $~lib/@btc-vision/as-bignum/assembly/integer/i128/i128#constructor
  i64.const 0
  i64.const -9223372036854775808
  call $~lib/@btc-vision/as-bignum/assembly/integer/i128/i128#constructor
  i64.const -1
  i64.const 9223372036854775807
  call $~lib/@btc-vision/as-bignum/assembly/integer/i128/i128#constructor
  block $__inlined_func$start:~lib/@btc-vision/btc-runtime/runtime/secp256k1/ECPoint$41
   block $folding-inner0
    i32.const 5692
    i32.load
    i32.const 32
    i32.ne
    br_if $folding-inner0
    i32.const 5684
    i32.load
    local.tee $0
    i64.load
    local.get $0
    i64.load offset=8
    local.get $0
    i64.load offset=16
    local.get $0
    i64.load offset=24
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
    drop
    i32.const 5804
    i32.load
    i32.const 32
    i32.ne
    br_if $folding-inner0
    i32.const 5796
    i32.load
    local.tee $0
    i64.load
    local.get $0
    i64.load offset=8
    local.get $0
    i64.load offset=16
    local.get $0
    i64.load offset=24
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
    drop
    i32.const 5916
    i32.load
    i32.const 32
    i32.ne
    br_if $folding-inner0
    i32.const 5908
    i32.load
    local.tee $0
    i64.load
    local.get $0
    i64.load offset=8
    local.get $0
    i64.load offset=16
    local.get $0
    i64.load offset=24
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
    drop
    br $__inlined_func$start:~lib/@btc-vision/btc-runtime/runtime/secp256k1/ECPoint$41
   end
   i32.const 2304
   i32.const 5952
   i32.const 169
   i32.const 30
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  drop
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/storage/StoredBoolean/StoredBoolean#constructor (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  i32.const 12
  i32.const 37
  call $~lib/rt/stub/__new
  local.tee $1
  local.get $0
  i32.store16 offset=4
  local.get $1
  i32.const 0
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=8
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $2
  i32.const 0
  local.get $0
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  local.get $2
  i32.const 1
  local.get $0
  i32.const 65535
  i32.and
  i32.const 8
  i32.shr_u
  call $~lib/typedarray/Uint8Array#__set
  local.get $1
  local.get $2
  i32.store
  local.get $1
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  i32.store offset=8
  local.get $1
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/math/abi/encodePointer (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (result i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  local.get $1
  i32.load offset=8
  i32.const 30
  i32.lt_s
  if
   i32.const 0
   i32.const 30
   call $~lib/typedarray/Uint8Array#constructor
   local.set $4
   loop $for-loop|0
    local.get $5
    local.get $1
    i32.load offset=8
    i32.lt_s
    if
     local.get $4
     local.get $5
     local.get $1
     local.get $5
     call $~lib/typedarray/Uint8Array#__get
     call $~lib/typedarray/Uint8Array#__set
     local.get $5
     i32.const 1
     i32.add
     local.set $5
     br $for-loop|0
    end
   end
   local.get $4
   local.set $1
  end
  local.get $2
  if
   local.get $1
   i32.load offset=8
   i32.const 30
   i32.ne
   if
    i32.const 6960
    i32.const 1
    local.get $1
    i32.load offset=8
    call $~lib/util/number/itoa32
    call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
    i32.const 6960
    i32.const 3
    local.get $3
    call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
    i32.const 6960
    call $~lib/staticarray/StaticArray<~lib/string/String>#join
    i32.const 7008
    i32.const 101
    i32.const 9
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
  end
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $2
  i32.const 0
  local.get $0
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  local.get $2
  i32.const 1
  local.get $0
  i32.const 65535
  i32.and
  i32.const 8
  i32.shr_u
  call $~lib/typedarray/Uint8Array#__set
  loop $for-loop|1
   local.get $6
   i32.const 30
   i32.lt_s
   if
    local.get $2
    local.get $6
    i32.const 2
    i32.add
    local.get $1
    local.get $6
    call $~lib/typedarray/Uint8Array#__get
    call $~lib/typedarray/Uint8Array#__set
    local.get $6
    i32.const 1
    i32.add
    local.set $6
    br $for-loop|1
   end
  end
  local.get $2
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#constructor (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  i32.const 16
  i32.const 38
  call $~lib/rt/stub/__new
  local.tee $2
  local.get $0
  i32.store16 offset=4
  local.get $2
  local.get $1
  i32.store offset=8
  local.get $2
  i32.const 0
  i32.store
  local.get $2
  i64.const 0
  i64.const 0
  i64.const 0
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  i32.store offset=12
  local.get $2
  local.get $0
  local.get $1
  i32.const 1
  i32.const 6720
  call $~lib/@btc-vision/btc-runtime/runtime/math/abi/encodePointer
  i32.store
  local.get $2
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#constructor (param $0 i32) (result i32)
  (local $1 i32)
  i32.const 2
  i32.const 46
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  i32.store16
  local.get $1
  local.get $0
  i32.store16
  local.get $1
 )
 (func $~lib/array/Array<u64>#__set (param $0 i32) (param $1 i32) (param $2 i64)
  (local $3 i32)
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   local.get $1
   i32.const 0
   i32.lt_s
   if
    i32.const 2176
    i32.const 4224
    i32.const 130
    i32.const 22
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $0
   local.get $1
   i32.const 1
   i32.add
   local.tee $3
   i32.const 3
   call $~lib/array/ensureCapacity
   local.get $0
   local.get $3
   i32.store offset=12
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 3
  i32.shl
  i32.add
  local.get $2
  i64.store
 )
 (func $~lib/array/Array<u64>#__get (param $0 i32) (param $1 i32) (result i64)
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   i32.const 2176
   i32.const 4224
   i32.const 114
   i32.const 42
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 3
  i32.shl
  i32.add
  i64.load
 )
 (func $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#clone (param $0 i32) (result i32)
  local.get $0
  i64.load
  local.get $0
  i64.load offset=8
  local.get $0
  i64.load offset=16
  local.get $0
  i64.load offset=24
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
 )
 (func $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.shl (param $0 i32) (param $1 i32) (result i32)
  (local $2 i64)
  (local $3 i64)
  (local $4 i64)
  (local $5 i64)
  (local $6 i64)
  (local $7 i32)
  (local $8 i64)
  (local $9 i32)
  (local $10 i64)
  local.get $1
  i32.const 0
  i32.le_s
  if
   local.get $1
   if (result i32)
    i64.const 0
    i64.const 0
    i64.const 0
    i64.const 0
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
   else
    local.get $0
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#clone
   end
   return
  end
  local.get $1
  i32.const 256
  i32.ge_s
  if
   i64.const 0
   i64.const 0
   i64.const 0
   i64.const 0
   call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
   return
  end
  local.get $1
  i32.const 255
  i32.and
  local.tee $7
  i32.const 6
  i32.shr_u
  local.set $1
  i32.const 64
  local.get $7
  i32.const 63
  i32.and
  local.tee $7
  i32.sub
  local.set $9
  local.get $0
  i64.load
  local.set $8
  local.get $0
  i64.load offset=8
  local.set $10
  local.get $0
  i64.load offset=16
  local.set $2
  local.get $0
  i64.load offset=24
  local.set $5
  local.get $1
  if (result i64)
   local.get $1
   i32.const 1
   i32.eq
   if (result i64)
    local.get $8
    local.get $7
    i64.extend_i32_s
    i64.shl
    local.set $4
    local.get $10
    local.get $7
    i64.extend_i32_s
    i64.shl
    local.get $8
    local.get $9
    i64.extend_i32_s
    i64.shr_u
    i64.const 0
    local.get $7
    select
    i64.or
    local.set $3
    local.get $2
    local.get $7
    i64.extend_i32_s
    i64.shl
    local.get $10
    local.get $9
    i64.extend_i32_s
    i64.shr_u
    i64.const 0
    local.get $7
    select
    i64.or
   else
    local.get $1
    i32.const 2
    i32.eq
    if (result i64)
     local.get $8
     local.get $7
     i64.extend_i32_s
     i64.shl
     local.set $3
     local.get $10
     local.get $7
     i64.extend_i32_s
     i64.shl
     local.get $8
     local.get $9
     i64.extend_i32_s
     i64.shr_u
     i64.const 0
     local.get $7
     select
     i64.or
    else
     local.get $8
     local.get $7
     i64.extend_i32_s
     i64.shl
     i64.const 0
     local.get $1
     i32.const 3
     i32.eq
     select
    end
   end
  else
   local.get $8
   local.get $7
   i64.extend_i32_s
   i64.shl
   local.set $6
   local.get $10
   local.get $7
   i64.extend_i32_s
   i64.shl
   local.get $8
   local.get $9
   i64.extend_i32_s
   i64.shr_u
   i64.const 0
   local.get $7
   select
   i64.or
   local.set $4
   local.get $2
   local.get $7
   i64.extend_i32_s
   i64.shl
   local.get $10
   local.get $9
   i64.extend_i32_s
   i64.shr_u
   i64.const 0
   local.get $7
   select
   i64.or
   local.set $3
   local.get $5
   local.get $7
   i64.extend_i32_s
   i64.shl
   local.get $2
   local.get $9
   i64.extend_i32_s
   i64.shr_u
   i64.const 0
   local.get $7
   select
   i64.or
  end
  local.set $2
  local.get $6
  local.get $4
  local.get $3
  local.get $2
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
 )
 (func $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.add (param $0 i32) (param $1 i32) (result i32)
  (local $2 i64)
  (local $3 i64)
  (local $4 i64)
  (local $5 i64)
  (local $6 i64)
  (local $7 i64)
  local.get $0
  i64.load
  local.tee $3
  local.get $1
  i64.load
  i64.add
  local.set $2
  local.get $2
  local.get $3
  i64.lt_u
  i64.extend_i32_s
  global.set $~lib/@btc-vision/as-bignum/assembly/globals/__u256carry
  local.get $0
  i64.load offset=8
  local.tee $3
  global.get $~lib/@btc-vision/as-bignum/assembly/globals/__u256carry
  i64.add
  local.tee $4
  local.get $1
  i64.load offset=8
  i64.add
  local.set $5
  local.get $3
  local.get $4
  i64.gt_u
  local.get $4
  local.get $5
  i64.gt_u
  i32.add
  i64.extend_i32_s
  global.set $~lib/@btc-vision/as-bignum/assembly/globals/__u256carry
  local.get $0
  i64.load offset=16
  local.tee $3
  global.get $~lib/@btc-vision/as-bignum/assembly/globals/__u256carry
  i64.add
  local.tee $4
  local.get $1
  i64.load offset=16
  i64.add
  local.set $6
  local.get $3
  local.get $4
  i64.gt_u
  local.get $4
  local.get $6
  i64.gt_u
  i32.add
  i64.extend_i32_s
  global.set $~lib/@btc-vision/as-bignum/assembly/globals/__u256carry
  local.get $0
  i64.load offset=24
  local.tee $4
  global.get $~lib/@btc-vision/as-bignum/assembly/globals/__u256carry
  i64.add
  local.tee $3
  local.get $1
  i64.load offset=24
  i64.add
  local.set $7
  local.get $3
  local.get $4
  i64.lt_u
  local.get $3
  local.get $7
  i64.gt_u
  i32.add
  i64.extend_i32_s
  global.set $~lib/@btc-vision/as-bignum/assembly/globals/__u256carry
  local.get $2
  local.get $5
  local.get $6
  local.get $7
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
 )
 (func $~lib/@btc-vision/as-bignum/assembly/globals/__mul256 (param $0 i64) (param $1 i64) (param $2 i64) (param $3 i64) (param $4 i64) (param $5 i64) (param $6 i64) (param $7 i64) (result i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  (local $12 i32)
  (local $13 i32)
  (local $14 i32)
  i64.const 0
  i64.const 0
  i64.const 0
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  local.set $8
  i32.const 4
  i32.const 3
  i32.const 49
  i32.const 0
  call $~lib/rt/__newArray
  local.tee $10
  i32.const 0
  local.get $0
  call $~lib/array/Array<u64>#__set
  local.get $10
  i32.const 1
  local.get $1
  call $~lib/array/Array<u64>#__set
  local.get $10
  i32.const 2
  local.get $2
  call $~lib/array/Array<u64>#__set
  local.get $10
  i32.const 3
  local.get $3
  call $~lib/array/Array<u64>#__set
  i32.const 4
  i32.const 3
  i32.const 49
  i32.const 0
  call $~lib/rt/__newArray
  local.tee $11
  i32.const 0
  local.get $4
  call $~lib/array/Array<u64>#__set
  local.get $11
  i32.const 1
  local.get $5
  call $~lib/array/Array<u64>#__set
  local.get $11
  i32.const 2
  local.get $6
  call $~lib/array/Array<u64>#__set
  local.get $11
  i32.const 3
  local.get $7
  call $~lib/array/Array<u64>#__set
  loop $for-loop|0
   local.get $12
   i32.const 4
   i32.lt_s
   if
    i32.const 0
    local.set $9
    loop $for-loop|1
     local.get $9
     i32.const 4
     i32.lt_s
     if
      local.get $9
      local.get $12
      i32.add
      i32.const 6
      i32.shl
      local.tee $13
      i32.const 256
      i32.lt_s
      if
       local.get $10
       local.get $12
       call $~lib/array/Array<u64>#__get
       local.tee $0
       i64.const 32
       i64.shr_u
       local.set $1
       local.get $11
       local.get $9
       call $~lib/array/Array<u64>#__get
       local.tee $2
       i64.const 4294967295
       i64.and
       local.tee $3
       local.get $0
       i64.const 4294967295
       i64.and
       local.tee $0
       i64.mul
       local.set $4
       local.get $2
       i64.const 32
       i64.shr_u
       local.tee $2
       local.get $0
       i64.mul
       local.get $1
       local.get $3
       i64.mul
       local.get $4
       i64.const 32
       i64.shr_u
       i64.add
       local.tee $0
       i64.const 4294967295
       i64.and
       i64.add
       local.set $3
       local.get $1
       local.get $2
       i64.mul
       local.get $0
       i64.const 32
       i64.shr_u
       i64.add
       local.get $3
       i64.const 32
       i64.shr_u
       i64.add
       global.set $~lib/@btc-vision/as-bignum/assembly/globals/__res128_hi
       local.get $4
       i64.const 4294967295
       i64.and
       local.get $3
       i64.const 32
       i64.shl
       i64.or
       global.get $~lib/@btc-vision/as-bignum/assembly/globals/__res128_hi
       call $~lib/@btc-vision/as-bignum/assembly/integer/u128/u128#constructor
       local.tee $14
       i64.load
       local.get $14
       i64.load offset=8
       i64.const 0
       i64.const 0
       call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
       local.set $14
       local.get $8
       local.get $13
       if (result i32)
        local.get $14
        local.get $13
        call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.shl
       else
        local.get $14
       end
       call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.add
       local.set $8
      end
      local.get $9
      i32.const 1
      i32.add
      local.set $9
      br $for-loop|1
     end
    end
    local.get $12
    i32.const 1
    i32.add
    local.set $12
    br $for-loop|0
   end
  end
  local.get $8
 )
 (func $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.lt (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  i64.load offset=24
  local.get $1
  i64.load offset=24
  i64.ne
  if
   local.get $0
   i64.load offset=24
   local.get $1
   i64.load offset=24
   i64.lt_u
   return
  end
  local.get $0
  i64.load offset=16
  local.get $1
  i64.load offset=16
  i64.ne
  if
   local.get $0
   i64.load offset=16
   local.get $1
   i64.load offset=16
   i64.lt_u
   return
  end
  local.get $0
  i64.load offset=8
  local.get $1
  i64.load offset=8
  i64.ne
  if
   local.get $0
   i64.load offset=8
   local.get $1
   i64.load offset=8
   i64.lt_u
   return
  end
  local.get $0
  i64.load
  local.get $1
  i64.load
  i64.lt_u
 )
 (func $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.div (param $0 i32) (param $1 i32) (result i32)
  (local $2 i64)
  (local $3 i32)
  (local $4 i32)
  (local $5 i64)
  (local $6 i32)
  (local $7 i64)
  (local $8 i64)
  (local $9 i64)
  (local $10 i64)
  local.get $1
  i64.load offset=24
  local.get $1
  i64.load offset=16
  local.get $1
  i64.load
  local.get $1
  i64.load offset=8
  i64.or
  i64.or
  i64.or
  i64.eqz
  if
   i32.const 7200
   i32.const 5952
   i32.const 353
   i32.const 21
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i64.load offset=24
  local.get $0
  i64.load offset=16
  local.get $0
  i64.load
  local.get $0
  i64.load offset=8
  i64.or
  i64.or
  i64.or
  i64.eqz
  if (result i32)
   i32.const 1
  else
   local.get $0
   local.get $1
   call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.lt
  end
  if
   i64.const 0
   i64.const 0
   i64.const 0
   i64.const 0
   call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
   return
  end
  local.get $0
  i64.load
  local.get $1
  i64.load
  i64.eq
  if (result i32)
   local.get $0
   i64.load offset=8
   local.get $1
   i64.load offset=8
   i64.eq
  else
   i32.const 0
  end
  if (result i32)
   local.get $0
   i64.load offset=16
   local.get $1
   i64.load offset=16
   i64.eq
  else
   i32.const 0
  end
  if (result i32)
   local.get $0
   i64.load offset=24
   local.get $1
   i64.load offset=24
   i64.eq
  else
   i32.const 0
  end
  if
   i64.const 1
   i64.const 0
   i64.const 0
   i64.const 0
   call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
   return
  end
  local.get $0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#clone
  local.set $6
  local.get $1
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#clone
  local.set $1
  i64.const 0
  i64.const 0
  i64.const 0
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#clone
  local.set $0
  local.get $1
  block $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.clz|inlined.0 (result i32)
   local.get $1
   i64.load offset=24
   i64.const 0
   i64.ne
   if
    local.get $1
    i64.load offset=24
    i64.clz
    i32.wrap_i64
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.clz|inlined.0
   end
   local.get $1
   i64.load offset=16
   i64.const 0
   i64.ne
   if
    local.get $1
    i64.load offset=16
    i64.clz
    i64.const -64
    i64.sub
    i32.wrap_i64
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.clz|inlined.0
   end
   local.get $1
   i64.load offset=8
   i64.const 0
   i64.ne
   if
    local.get $1
    i64.load offset=8
    i64.clz
    i64.const 128
    i64.add
    i32.wrap_i64
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.clz|inlined.0
   end
   local.get $1
   i64.load
   i64.const 0
   i64.ne
   if
    local.get $1
    i64.load
    i64.clz
    i64.const 192
    i64.add
    i32.wrap_i64
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.clz|inlined.0
   end
   i32.const 256
  end
  block $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.clz|inlined.1 (result i32)
   local.get $6
   i64.load offset=24
   i64.const 0
   i64.ne
   if
    local.get $6
    i64.load offset=24
    i64.clz
    i32.wrap_i64
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.clz|inlined.1
   end
   local.get $6
   i64.load offset=16
   i64.const 0
   i64.ne
   if
    local.get $6
    i64.load offset=16
    i64.clz
    i64.const -64
    i64.sub
    i32.wrap_i64
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.clz|inlined.1
   end
   local.get $6
   i64.load offset=8
   i64.const 0
   i64.ne
   if
    local.get $6
    i64.load offset=8
    i64.clz
    i64.const 128
    i64.add
    i32.wrap_i64
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.clz|inlined.1
   end
   local.get $6
   i64.load
   i64.const 0
   i64.ne
   if
    local.get $6
    i64.load
    i64.clz
    i64.const 192
    i64.add
    i32.wrap_i64
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.clz|inlined.1
   end
   i32.const 256
  end
  i32.sub
  local.tee $1
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.shl
  local.set $4
  loop $for-loop|0
   local.get $1
   i32.const 0
   i32.ge_s
   if
    local.get $6
    local.get $4
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.lt
    i32.eqz
    if
     local.get $6
     i64.load
     local.tee $5
     local.get $4
     i64.load
     i64.sub
     local.tee $2
     local.get $5
     i64.gt_u
     i64.extend_i32_s
     global.set $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
     local.get $6
     i64.load offset=8
     local.tee $5
     local.get $4
     i64.load offset=8
     i64.sub
     local.tee $7
     global.get $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
     i64.sub
     local.set $8
     local.get $7
     local.get $8
     i64.lt_u
     local.get $5
     local.get $7
     i64.lt_u
     i32.add
     i64.extend_i32_s
     global.set $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
     local.get $6
     i64.load offset=16
     local.tee $5
     local.get $4
     i64.load offset=16
     i64.sub
     local.tee $7
     global.get $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
     i64.sub
     local.set $9
     local.get $7
     local.get $9
     i64.lt_u
     local.get $5
     local.get $7
     i64.lt_u
     i32.add
     i64.extend_i32_s
     global.set $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
     local.get $6
     i64.load offset=24
     local.tee $7
     local.get $4
     i64.load offset=24
     i64.sub
     local.tee $5
     global.get $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
     i64.sub
     local.set $10
     local.get $5
     local.get $10
     i64.lt_u
     local.get $5
     local.get $7
     i64.gt_u
     i32.add
     i64.extend_i32_s
     global.set $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
     local.get $6
     local.get $2
     i64.store
     local.get $6
     local.get $8
     i64.store offset=8
     local.get $6
     local.get $9
     i64.store offset=16
     local.get $6
     local.get $10
     i64.store offset=24
     i64.const 1
     local.get $1
     i32.const 64
     i32.rem_s
     i64.extend_i32_s
     i64.shl
     local.set $2
     local.get $1
     i32.const 64
     i32.div_s
     local.tee $3
     if
      local.get $3
      i32.const 1
      i32.eq
      if
       local.get $0
       local.get $0
       i64.load offset=8
       local.get $2
       i64.or
       i64.store offset=8
      else
       local.get $3
       i32.const 2
       i32.eq
       if
        local.get $0
        local.get $0
        i64.load offset=16
        local.get $2
        i64.or
        i64.store offset=16
       else
        local.get $3
        i32.const 3
        i32.eq
        if
         local.get $0
         local.get $0
         i64.load offset=24
         local.get $2
         i64.or
         i64.store offset=24
        end
       end
      end
     else
      local.get $0
      local.get $0
      i64.load
      local.get $2
      i64.or
      i64.store
     end
    end
    local.get $4
    local.get $4
    i64.load offset=8
    i64.const 63
    i64.shl
    local.get $4
    i64.load
    i64.const 1
    i64.shr_u
    i64.or
    i64.store
    local.get $4
    local.get $4
    i64.load offset=16
    i64.const 63
    i64.shl
    local.get $4
    i64.load offset=8
    i64.const 1
    i64.shr_u
    i64.or
    i64.store offset=8
    local.get $4
    local.get $4
    i64.load offset=24
    i64.const 63
    i64.shl
    local.get $4
    i64.load offset=16
    i64.const 1
    i64.shr_u
    i64.or
    i64.store offset=16
    local.get $4
    local.get $4
    i64.load offset=24
    i64.const 1
    i64.shr_u
    i64.store offset=24
    local.get $1
    i32.const 1
    i32.sub
    local.set $1
    br $for-loop|0
   end
  end
  local.get $0
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.mul (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  local.get $0
  i64.load offset=24
  local.get $0
  i64.load offset=16
  local.get $0
  i64.load
  local.get $0
  i64.load offset=8
  i64.or
  i64.or
  i64.or
  i64.eqz
  if (result i64)
   i64.const 0
  else
   local.get $1
   i64.load offset=24
   local.get $1
   i64.load offset=16
   local.get $1
   i64.load
   local.get $1
   i64.load offset=8
   i64.or
   i64.or
   i64.or
  end
  i64.eqz
  if
   i64.const 0
   i64.const 0
   i64.const 0
   i64.const 0
   call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
   return
  end
  local.get $0
  i64.load
  local.get $0
  i64.load offset=8
  local.get $0
  i64.load offset=16
  local.get $0
  i64.load offset=24
  local.get $1
  i64.load
  local.get $1
  i64.load offset=8
  local.get $1
  i64.load offset=16
  local.get $1
  i64.load offset=24
  call $~lib/@btc-vision/as-bignum/assembly/globals/__mul256
  local.tee $2
  local.get $0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.div
  local.tee $0
  i64.load
  local.get $1
  i64.load
  i64.eq
  if (result i32)
   local.get $0
   i64.load offset=8
   local.get $1
   i64.load offset=8
   i64.eq
  else
   i32.const 0
  end
  if (result i32)
   local.get $0
   i64.load offset=16
   local.get $1
   i64.load offset=16
   i64.eq
  else
   i32.const 0
  end
  if (result i32)
   local.get $0
   i64.load offset=24
   local.get $1
   i64.load offset=24
   i64.eq
  else
   i32.const 0
  end
  i32.eqz
  if
   i32.const 7264
   i32.const 7360
   i32.const 190
   i32.const 28
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $2
 )
 (func $~lib/polyfills/bswap<u64> (param $0 i64) (result i64)
  local.get $0
  i64.const 8
  i64.shr_u
  i64.const 71777214294589695
  i64.and
  local.get $0
  i64.const 71777214294589695
  i64.and
  i64.const 8
  i64.shl
  i64.or
  local.tee $0
  i64.const 16
  i64.shr_u
  i64.const 281470681808895
  i64.and
  local.get $0
  i64.const 281470681808895
  i64.and
  i64.const 16
  i64.shl
  i64.or
  i64.const 32
  i64.rotr
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/storage/StoredString/StoredString#constructor (param $0 i32) (param $1 i64) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  i32.const 16
  i32.const 47
  call $~lib/rt/stub/__new
  local.set $2
  block $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.fromU64|inlined.0 (result i32)
   local.get $1
   i64.eqz
   if
    i64.const 0
    i64.const 0
    i64.const 0
    i64.const 0
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.fromU64|inlined.0
   end
   local.get $1
   i64.const 1
   i64.eq
   if
    i64.const 1
    i64.const 0
    i64.const 0
    i64.const 0
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.fromU64|inlined.0
   end
   local.get $1
   i64.const 0
   i64.const 0
   i64.const 0
   call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  end
  global.get $~lib/@btc-vision/btc-runtime/runtime/storage/StoredString/StoredString.MAX_LENGTH_U256
  call $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.mul
  local.set $4
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $3
  i32.load offset=4
  local.tee $5
  local.get $4
  i64.load offset=24
  call $~lib/polyfills/bswap<u64>
  i64.store
  local.get $5
  local.get $4
  i64.load offset=16
  call $~lib/polyfills/bswap<u64>
  i64.store offset=8
  local.get $5
  local.get $4
  i64.load offset=8
  call $~lib/polyfills/bswap<u64>
  i64.store offset=16
  local.get $5
  local.get $4
  i64.load
  call $~lib/polyfills/bswap<u64>
  i64.store offset=24
  local.get $3
  i32.const 2
  i32.const 32
  call $~lib/typedarray/Uint8Array#slice
  local.set $3
  local.get $2
  i32.eqz
  if
   i32.const 16
   i32.const 48
   call $~lib/rt/stub/__new
   local.set $2
  end
  local.get $2
  local.get $0
  i32.store16 offset=8
  local.get $2
  i32.const 0
  i32.store
  local.get $2
  i32.const 0
  i32.store offset=4
  local.get $2
  i32.const 2032
  i32.store offset=12
  local.get $2
  local.get $3
  i32.store offset=4
  local.get $2
  i32.const 65535
  i32.store
  local.get $2
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#constructor (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  local.get $0
  i32.eqz
  if
   i32.const 48
   i32.const 35
   call $~lib/rt/stub/__new
   local.set $0
  end
  local.get $0
  i32.const 1
  i32.store offset=8
  local.get $0
  i32.const 0
  i32.store offset=12
  local.get $0
  i32.const 0
  i32.store offset=16
  local.get $0
  i32.const 0
  i32.store offset=20
  local.get $0
  i32.const 0
  i32.store offset=24
  local.get $0
  i32.const 0
  i32.store offset=28
  local.get $0
  i32.const 0
  i32.store offset=32
  local.get $0
  i32.const 0
  i32.store offset=36
  local.get $0
  i32.const 0
  i32.store offset=40
  local.get $0
  i32.const 0
  i32.store offset=44
  local.get $0
  i32.eqz
  if
   i32.const 12
   i32.const 36
   call $~lib/rt/stub/__new
   local.set $0
  end
  local.get $0
  i32.const 0
  i32.store
  local.get $0
  i32.const 0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  local.get $0
  i32.eqz
  if
   i32.const 0
   i32.const 20
   call $~lib/rt/stub/__new
   local.set $0
  end
  local.get $0
  if (result i32)
   local.get $0
  else
   i32.const 0
   i32.const 0
   call $~lib/rt/stub/__new
  end
  local.tee $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/statusPointer
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredBoolean/StoredBoolean#constructor
  i32.store
  local.get $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/depthPointer
  global.get $~lib/@btc-vision/btc-runtime/runtime/math/bytes/EMPTY_POINTER
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#constructor
  i32.store offset=4
  global.get $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/allowanceMapPointer
  local.set $2
  i32.const 14
  i32.const 40
  call $~lib/rt/stub/__new
  local.tee $0
  i32.const 0
  i32.store16 offset=12
  local.get $0
  i32.eqz
  if
   i32.const 12
   i32.const 42
   call $~lib/rt/stub/__new
   local.set $0
  end
  local.get $0
  i32.eqz
  if
   i32.const 0
   i32.const 0
   call $~lib/rt/stub/__new
   local.set $0
  end
  local.get $0
  i32.const 0
  i32.const 2
  i32.const 44
  i32.const 7136
  call $~lib/rt/__newArray
  i32.store
  local.get $0
  i32.const 0
  i32.const 2
  i32.const 45
  i32.const 7168
  call $~lib/rt/__newArray
  i32.store offset=4
  local.get $0
  i32.const -1
  i32.store offset=8
  local.get $0
  local.get $2
  i32.store16 offset=12
  local.get $1
  local.get $0
  i32.store offset=16
  local.get $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/balanceOfMapPointer
  call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#constructor
  i32.store offset=20
  local.get $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/nonceMapPointer
  call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#constructor
  i32.store offset=44
  local.get $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/totalSupplyPointer
  global.get $~lib/@btc-vision/btc-runtime/runtime/math/bytes/EMPTY_POINTER
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#constructor
  i32.store offset=12
  local.get $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/maxSupplyPointer
  global.get $~lib/@btc-vision/btc-runtime/runtime/math/bytes/EMPTY_POINTER
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#constructor
  i32.store offset=24
  local.get $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/decimalsPointer
  global.get $~lib/@btc-vision/btc-runtime/runtime/math/bytes/EMPTY_POINTER
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#constructor
  i32.store offset=28
  local.get $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/stringPointer
  i64.const 0
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredString/StoredString#constructor
  i32.store offset=32
  local.get $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/stringPointer
  i64.const 1
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredString/StoredString#constructor
  i32.store offset=40
  local.get $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/stringPointer
  i64.const 2
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredString/StoredString#constructor
  i32.store offset=36
  local.get $1
 )
 (func $start:src/pred-index~anonymous|0 (result i32)
  (local $0 i32)
  i32.const 52
  i32.const 34
  call $~lib/rt/stub/__new
  local.tee $0
  i32.const 0
  i32.store offset=48
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#constructor
  local.tee $0
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:nextPointer
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredBoolean/StoredBoolean#constructor
  i32.store offset=48
  local.get $0
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#createContractIfNotExists (param $0 i32)
  local.get $0
  i32.load offset=32
  i32.eqz
  if
   i32.const 7520
   i32.const 5456
   i32.const 1037
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=12
  i32.eqz
  if
   i32.const 0
   global.set $~argumentsLength
   local.get $0
   local.get $0
   i32.load offset=32
   i32.load
   call_indirect $0 (type $8)
   i32.store offset=12
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#constructor (param $0 i32) (result i32)
  (local $1 i32)
  i32.const 8
  i32.const 51
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $0
  i32.load
  local.set $0
  i32.const 1
  global.set $~argumentsLength
  local.get $1
  local.get $0
  call $~lib/dataview/DataView#constructor@varargs
  i32.store
  local.get $1
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#verifyEnd (param $0 i32) (param $1 i32)
  local.get $1
  local.get $0
  i32.load
  i32.load offset=8
  i32.gt_s
  if
   i32.const 7760
   i32.const 1
   local.get $1
   call $~lib/util/number/itoa32
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   i32.const 7760
   call $~lib/staticarray/StaticArray<~lib/string/String>#join
   i32.const 7904
   i32.const 1
   local.get $0
   i32.load
   i32.load offset=8
   call $~lib/util/number/itoa32
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   i32.const 7904
   call $~lib/staticarray/StaticArray<~lib/string/String>#join
   call $~lib/string/String#concat
   i32.const 7936
   i32.const 353
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU8 (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  local.get $0
  local.get $0
  i32.load offset=4
  i32.const 1
  i32.add
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#verifyEnd
  local.get $0
  i32.load offset=4
  local.tee $1
  local.get $0
  i32.load
  local.tee $2
  i32.load offset=8
  i32.ge_u
  if
   i32.const 2176
   i32.const 2416
   i32.const 72
   i32.const 50
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
  local.get $2
  i32.load offset=4
  i32.add
  i32.load8_u
  local.get $0
  local.get $0
  i32.load offset=4
  i32.const 1
  i32.add
  i32.store offset=4
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readBytes (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  i32.const 0
  local.get $1
  call $~lib/typedarray/Uint8Array#constructor
  local.set $3
  loop $for-loop|0
   local.get $1
   local.get $4
   i32.gt_u
   if
    block $for-break0
     local.get $0
     call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU8
     local.tee $5
     i32.const 1
     local.get $2
     select
     i32.eqz
     if
      local.get $3
      local.tee $0
      i32.load offset=8
      local.tee $1
      i32.const 0
      local.get $1
      i32.const 0
      i32.le_s
      select
      local.set $2
      i32.const 12
      i32.const 7
      call $~lib/rt/stub/__new
      local.tee $3
      local.get $0
      i32.load
      i32.store
      local.get $3
      local.get $0
      i32.load offset=4
      local.get $2
      i32.add
      i32.store offset=4
      local.get $3
      local.get $4
      i32.const 0
      i32.lt_s
      if (result i32)
       local.get $1
       local.get $4
       i32.add
       local.tee $0
       i32.const 0
       local.get $0
       i32.const 0
       i32.gt_s
       select
      else
       local.get $4
       local.get $1
       local.get $1
       local.get $4
       i32.gt_s
       select
      end
      local.tee $0
      local.get $2
      local.get $0
      local.get $2
      i32.gt_s
      select
      local.get $2
      i32.sub
      i32.store offset=8
      br $for-break0
     end
     local.get $3
     local.get $4
     local.get $5
     call $~lib/typedarray/Uint8Array#__set
     local.get $4
     i32.const 1
     i32.add
     local.set $4
     br $for-loop|0
    end
   end
  end
  local.get $3
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU64 (param $0 i32) (result i64)
  (local $1 i32)
  (local $2 i32)
  (local $3 i64)
  local.get $0
  local.get $0
  i32.load offset=4
  i32.const 8
  i32.add
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#verifyEnd
  local.get $0
  i32.load offset=4
  local.tee $1
  i32.const 31
  i32.shr_u
  local.get $0
  i32.load
  local.tee $2
  i32.load offset=8
  local.get $1
  i32.const 8
  i32.add
  i32.lt_s
  i32.or
  if
   i32.const 2176
   i32.const 2416
   i32.const 159
   i32.const 7
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
  local.get $2
  i32.load offset=4
  i32.add
  i64.load
  call $~lib/polyfills/bswap<u64>
  local.get $0
  local.get $0
  i32.load offset=4
  i32.const 8
  i32.add
  i32.store offset=4
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  local.get $0
  i32.load offset=4
  i32.const 32
  i32.add
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#verifyEnd
  i32.const 0
  i32.const 0
  i32.const 0
  i32.const 10
  i32.const 8080
  call $~lib/rt/__newArray
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#constructor
  local.set $1
  loop $for-loop|0
   local.get $2
   i32.const 32
   i32.lt_s
   if
    local.get $0
    call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU8
    local.set $3
    local.get $1
    i32.load8_u offset=12
    if
     i32.const 8112
     i32.const 2752
     i32.const 376
     i32.const 13
     call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
     unreachable
    end
    local.get $2
    local.get $1
    i32.load offset=8
    i32.ge_u
    if
     i32.const 2176
     i32.const 2752
     i32.const 380
     i32.const 13
     call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
     unreachable
    end
    local.get $2
    local.get $1
    i32.load offset=4
    i32.add
    local.get $3
    i32.store8
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  local.get $1
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:chainId (param $0 i32) (result i32)
  local.get $0
  i32.load offset=48
  i32.eqz
  if
   i32.const 8192
   i32.const 5456
   i32.const 250
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=48
  local.tee $0
  i32.eqz
  if
   i32.const 8256
   i32.const 5456
   i32.const 252
   i32.const 16
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/script/Networks/NetworkManager#equals (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  local.get $0
  i32.load offset=8
  local.get $1
  i32.load offset=8
  i32.ne
  if
   i32.const 0
   return
  end
  loop $for-loop|0
   local.get $2
   local.get $0
   i32.load offset=8
   i32.lt_s
   if
    local.get $0
    local.get $2
    call $~lib/typedarray/Uint8Array#__get
    local.get $1
    local.get $2
    call $~lib/typedarray/Uint8Array#__get
    i32.ne
    if
     i32.const 0
     return
    end
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  i32.const 1
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#setEnvironmentVariables (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i64)
  (local $4 i64)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i64)
  (local $12 i32)
  (local $13 i32)
  (local $14 i32)
  (local $15 i32)
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#constructor
  local.tee $12
  i32.const 32
  i32.const 0
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readBytes
  local.set $1
  local.get $12
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU64
  local.set $3
  local.get $12
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU64
  local.set $4
  local.get $12
  i32.const 32
  i32.const 0
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readBytes
  local.set $14
  local.get $12
  i32.const 32
  i32.const 0
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readBytes
  local.set $5
  local.get $12
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
  local.set $6
  local.get $12
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
  local.set $7
  local.get $12
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
  local.set $8
  i32.const 32
  call $~lib/array/Array<u8>#constructor
  local.set $13
  loop $for-loop|0
   local.get $2
   i32.const 32
   i32.lt_s
   if
    local.get $13
    local.get $2
    local.get $12
    call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU8
    call $~lib/array/Array<u8>#__set
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  local.get $12
  i32.const 32
  i32.const 0
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readBytes
  local.set $9
  local.get $12
  i32.const 32
  i32.const 0
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readBytes
  local.set $10
  i32.const 32
  call $~lib/array/Array<u8>#constructor
  local.set $15
  i32.const 0
  local.set $2
  loop $for-loop|1
   local.get $2
   i32.const 32
   i32.lt_s
   if
    local.get $15
    local.get $2
    local.get $12
    call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU8
    call $~lib/array/Array<u8>#__set
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|1
   end
  end
  local.get $12
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU64
  local.set $11
  local.get $15
  local.get $13
  call $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/ExtendedAddress#constructor
  local.set $2
  i32.const 32
  i32.const 26
  call $~lib/rt/stub/__new
  local.tee $12
  local.get $14
  i32.store offset=16
  local.get $12
  local.get $5
  i32.store offset=20
  local.get $12
  i32.const 0
  i32.store
  local.get $12
  i32.const 0
  i32.store offset=4
  local.get $12
  i32.const 0
  i32.store offset=8
  local.get $12
  i32.const 0
  i32.const 28
  call $~lib/rt/stub/__new
  local.tee $5
  if (result i32)
   local.get $5
  else
   i32.const 0
   i32.const 0
   call $~lib/rt/stub/__new
  end
  i32.store offset=12
  local.get $12
  i32.const 0
  i32.store offset=24
  local.get $12
  i32.const 0
  i32.store offset=28
  local.get $12
  local.get $8
  i32.store offset=4
  local.get $12
  local.get $2
  i32.store offset=8
  i32.const 8
  i32.const 27
  call $~lib/rt/stub/__new
  local.tee $2
  i64.const 0
  i64.store
  local.get $2
  local.get $11
  i64.store
  local.get $12
  local.get $2
  i32.store
  local.get $0
  local.get $12
  i32.store offset=28
  local.get $0
  local.get $7
  i32.store offset=40
  local.get $0
  local.get $6
  i32.store offset=44
  local.get $0
  local.get $9
  i32.store offset=48
  local.get $0
  local.get $10
  i32.store offset=52
  global.get $~lib/@btc-vision/btc-runtime/runtime/script/Networks/Network
  local.set $5
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:chainId
  local.tee $6
  i32.load offset=8
  i32.const 32
  i32.ne
  if
   i32.const 8384
   i32.const 8464
   i32.const 89
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  i32.const 0
  local.set $2
  block $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/script/Networks/NetworkManager#fromChainId$99
   local.get $6
   local.get $5
   i32.load
   call $~lib/@btc-vision/btc-runtime/runtime/script/Networks/NetworkManager#equals
   br_if $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/script/Networks/NetworkManager#fromChainId$99
   i32.const 1
   local.set $2
   local.get $6
   local.get $5
   i32.load offset=4
   call $~lib/@btc-vision/btc-runtime/runtime/script/Networks/NetworkManager#equals
   br_if $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/script/Networks/NetworkManager#fromChainId$99
   i32.const 3
   local.set $2
   local.get $6
   local.get $5
   i32.load offset=12
   call $~lib/@btc-vision/btc-runtime/runtime/script/Networks/NetworkManager#equals
   br_if $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/script/Networks/NetworkManager#fromChainId$99
   i32.const 2
   local.set $2
   local.get $6
   local.get $5
   i32.load offset=8
   call $~lib/@btc-vision/btc-runtime/runtime/script/Networks/NetworkManager#equals
   br_if $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/script/Networks/NetworkManager#fromChainId$99
   i32.const 8608
   i32.const 8464
   i32.const 97
   i32.const 9
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  local.get $2
  i32.store offset=20
  i32.const 24
  i32.const 24
  call $~lib/rt/stub/__new
  local.tee $2
  local.get $1
  i32.store offset=4
  local.get $2
  local.get $3
  i64.store offset=8
  local.get $2
  local.get $4
  i64.store offset=16
  local.get $2
  i32.const 0
  i32.store
  local.get $2
  block $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.fromU64|inlined.1 (result i32)
   local.get $3
   i64.eqz
   if
    i64.const 0
    i64.const 0
    i64.const 0
    i64.const 0
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.fromU64|inlined.1
   end
   local.get $3
   i64.const 1
   i64.eq
   if
    i64.const 1
    i64.const 0
    i64.const 0
    i64.const 0
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.fromU64|inlined.1
   end
   local.get $3
   i64.const 0
   i64.const 0
   i64.const 0
   call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  end
  i32.store
  local.get $0
  local.get $2
  i32.store offset=24
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#createContractIfNotExists
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU32 (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  local.get $0
  local.get $0
  i32.load offset=4
  i32.const 4
  i32.add
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#verifyEnd
  local.get $0
  i32.load offset=4
  local.tee $1
  i32.const 31
  i32.shr_u
  local.get $0
  i32.load
  local.tee $2
  i32.load offset=8
  local.get $1
  i32.const 4
  i32.add
  i32.lt_s
  i32.or
  if
   i32.const 2176
   i32.const 2416
   i32.const 87
   i32.const 7
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
  local.get $2
  i32.load offset=4
  i32.add
  i32.load
  call $~lib/polyfills/bswap<u32>
  local.get $0
  local.get $0
  i32.load offset=4
  i32.const 4
  i32.add
  i32.store offset=4
 )
 (func $~lib/array/Array<~lib/@btc-vision/btc-runtime/runtime/plugins/Plugin/Plugin>#__uget (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  i32.load
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:contract (param $0 i32) (result i32)
  local.get $0
  i32.load offset=12
  local.tee $0
  i32.eqz
  if
   i32.const 8256
   i32.const 5456
   i32.const 159
   i32.const 16
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#onExecutionStarted (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  i32.load offset=16
  i32.load offset=12
  local.set $3
  loop $for-loop|0
   local.get $2
   local.get $3
   i32.lt_s
   if
    local.get $0
    i32.load offset=16
    local.get $2
    call $~lib/array/Array<~lib/@btc-vision/btc-runtime/runtime/plugins/Plugin/Plugin>#__uget
    drop
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:contract
  local.tee $0
  i32.const 8
  i32.sub
  i32.load
  local.tee $2
  i32.const 36
  i32.eq
  local.get $2
  i32.const 35
  i32.eq
  i32.or
  local.get $2
  i32.const 34
  i32.eq
  i32.or
  if
   local.get $0
   local.get $1
   call $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/ReentrancyGuard#isSelectorExcluded@override
   i32.eqz
   if
    local.get $0
    call $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/ReentrancyGuard#nonReentrantBefore
   end
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/global/sha256 (param $0 i32) (result i32)
  (local $1 i32)
  i32.const 32
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.set $1
  local.get $0
  i32.load
  local.get $0
  i32.load offset=8
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/_sha256
  i32.const 1
  global.set $~argumentsLength
  local.get $1
  call $~lib/typedarray/Uint8Array.wrap@varargs
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor (param $0 i32) (result i32)
  (local $1 i32)
  i32.const 12
  i32.const 52
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 0
  local.get $0
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $0
  i32.store offset=8
  local.get $0
  i32.load
  local.set $0
  i32.const 1
  global.set $~argumentsLength
  local.get $1
  local.get $0
  call $~lib/dataview/DataView#constructor@varargs
  i32.store offset=4
  local.get $1
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:contractDeployer (param $0 i32) (result i32)
  local.get $0
  i32.load offset=40
  i32.eqz
  if
   i32.const 8960
   i32.const 5456
   i32.const 209
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=40
  local.tee $0
  i32.eqz
  if
   i32.const 8256
   i32.const 5456
   i32.const 211
   i32.const 16
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#allocSafe (param $0 i32) (param $1 i32)
  (local $2 i32)
  local.get $0
  i32.load offset=4
  i32.load offset=8
  local.tee $2
  local.get $0
  i32.load
  local.get $1
  i32.add
  local.tee $1
  i32.lt_u
  if
   i32.const 9584
   i32.const 1
   local.get $1
   local.get $2
   i32.sub
   local.get $2
   i32.add
   call $~lib/util/number/itoa32
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   i32.const 9344
   i32.const 9584
   call $~lib/staticarray/StaticArray<~lib/string/String>#join
   call $~lib/string/String#concat
   i32.const 9616
   local.get $0
   i32.load offset=4
   i32.load offset=8
   call $~lib/util/number/itoa32
   call $~lib/string/String#concat
   call $~lib/string/String#concat
   i32.const 9200
   i32.const 427
   i32.const 9
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU8 (param $0 i32) (param $1 i32)
  local.get $0
  i32.const 1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#allocSafe
  local.get $0
  i32.load offset=4
  local.get $0
  i32.load
  local.get $1
  call $~lib/dataview/DataView#setUint8
  local.get $0
  local.get $0
  i32.load
  i32.const 1
  i32.add
  i32.store
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytes (param $0 i32) (param $1 i32)
  (local $2 i32)
  local.get $0
  local.get $1
  i32.load offset=8
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#allocSafe
  loop $for-loop|0
   local.get $2
   local.get $1
   i32.load offset=8
   i32.lt_s
   if
    local.get $0
    local.get $1
    local.get $2
    call $~lib/typedarray/Uint8Array#__get
    call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU8
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress (param $0 i32) (param $1 i32)
  local.get $1
  i32.load offset=8
  i32.const 32
  i32.gt_s
  if
   local.get $1
   i32.load offset=8
   call $~lib/util/number/itoa32
   local.set $0
   i32.const 32
   call $~lib/util/number/itoa32
   local.set $1
   i32.const 9152
   i32.const 1
   local.get $0
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   i32.const 9152
   i32.const 3
   local.get $1
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   i32.const 9152
   call $~lib/staticarray/StaticArray<~lib/string/String>#join
   i32.const 9200
   i32.const 414
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytes
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#execute (param $0 i32) (result i32)
  (local $1 i32)
  i32.const 1
  global.set $~argumentsLength
  i32.const 8672
  call $~lib/string/String.UTF8.encode@varargs
  i32.const 1
  global.set $~argumentsLength
  call $~lib/typedarray/Uint8Array.wrap@varargs
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/sha256
  local.tee $1
  i32.load offset=8
  i32.const 4
  i32.lt_s
  if
   i32.const 8720
   i32.const 8832
   i32.const 12
   i32.const 9
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  block $break|0
   local.get $0
   local.get $1
   i32.const 0
   call $~lib/typedarray/Uint8Array#__get
   i32.const 24
   i32.shl
   local.get $1
   i32.const 1
   call $~lib/typedarray/Uint8Array#__get
   i32.const 16
   i32.shl
   i32.or
   local.get $1
   i32.const 2
   call $~lib/typedarray/Uint8Array#__get
   i32.const 8
   i32.shl
   i32.or
   local.get $1
   i32.const 3
   call $~lib/typedarray/Uint8Array#__get
   i32.or
   i32.eq
   if
    i32.const 32
    call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
    local.tee $0
    global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
    call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:contractDeployer
    call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
    br $break|0
   end
   i32.const 9664
   local.get $0
   call $~lib/util/number/utoa32
   call $~lib/string/String#concat
   i32.const 9728
   i32.const 35
   i32.const 17
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#onExecutionCompleted (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  i32.load offset=16
  i32.load offset=12
  local.set $3
  loop $for-loop|0
   local.get $2
   local.get $3
   i32.lt_s
   if
    local.get $0
    i32.load offset=16
    local.get $2
    call $~lib/array/Array<~lib/@btc-vision/btc-runtime/runtime/plugins/Plugin/Plugin>#__uget
    drop
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:contract
  local.tee $0
  i32.const 8
  i32.sub
  i32.load
  local.tee $2
  i32.const 36
  i32.eq
  local.get $2
  i32.const 35
  i32.eq
  i32.or
  local.get $2
  i32.const 34
  i32.eq
  i32.or
  if
   local.get $0
   local.get $1
   call $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/ReentrancyGuard#isSelectorExcluded@override
   i32.eqz
   if
    local.get $0
    i32.load offset=8
    if
     local.get $0
     i32.load offset=8
     i32.const 1
     i32.eq
     if
      local.get $0
      i32.load offset=4
      local.tee $1
      call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue
      local.get $1
      i32.load offset=12
      local.tee $1
      i64.load offset=24
      local.get $1
      i64.load offset=16
      local.get $1
      i64.load
      local.get $1
      i64.load offset=8
      i64.or
      i64.or
      i64.or
      i64.eqz
      if
       i32.const 14144
       i32.const 10272
       i32.const 100
       i32.const 17
       call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
       unreachable
      end
      local.get $1
      i64.const 1
      i64.const 0
      i64.const 0
      i64.const 0
      call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
      call $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.sub
      local.set $1
      local.get $0
      i32.load offset=4
      local.get $1
      call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#set:value
      local.get $1
      i64.load offset=24
      local.get $1
      i64.load offset=16
      local.get $1
      i64.load
      local.get $1
      i64.load offset=8
      i64.or
      i64.or
      i64.or
      i64.eqz
      if
       local.get $0
       i32.load
       i32.const 0
       call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredBoolean/StoredBoolean#set:value
      end
     end
    else
     local.get $0
     i32.load
     i32.const 0
     call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredBoolean/StoredBoolean#set:value
    end
   end
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/exports/index/execute (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  i32.const 0
  i32.const 512
  i32.const 512
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.tee $1
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/getEnvironmentVariables
  i32.const 1
  global.set $~argumentsLength
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $1
  call $~lib/typedarray/Uint8Array.wrap@varargs
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#setEnvironmentVariables
  i32.const 0
  local.get $0
  local.get $0
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.tee $0
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/getCalldata
  i32.const 1
  global.set $~argumentsLength
  local.get $0
  call $~lib/typedarray/Uint8Array.wrap@varargs
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#constructor
  local.tee $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU32
  local.set $2
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#onExecutionStarted
  block $folding-inner1
   block $folding-inner0
    block $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#execute@override$412 (result i32)
     block $default
      block $case1
       global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
       call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:contract
       local.tee $0
       i32.const 8
       i32.sub
       i32.load
       local.tee $3
       i32.const 34
       i32.ne
       if
        local.get $3
        i32.const 35
        i32.eq
        br_if $case1
        br $default
       end
       block $__inlined_func$PredToken/PredToken#execute$983 (result i32)
        local.get $2
        i32.const 961601633
        i32.eq
        if
         global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
         local.tee $3
         i32.load offset=28
         i32.eqz
         br_if $folding-inner0
         local.get $3
         i32.load offset=28
         local.tee $3
         i32.eqz
         br_if $folding-inner1
         local.get $3
         i32.load offset=4
         call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#onlyDeployer
         local.get $0
         call $PredToken/PredToken#whenNotPaused
         local.get $0
         local.get $1
         call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
         local.get $1
         call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU256
         call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_mint
         i32.const 0
         call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
         br $__inlined_func$PredToken/PredToken#execute$983
        end
        local.get $2
        i32.const 557378572
        i32.eq
        if
         global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
         local.tee $1
         i32.load offset=28
         i32.eqz
         br_if $folding-inner0
         local.get $1
         i32.load offset=28
         local.tee $1
         i32.eqz
         br_if $folding-inner1
         local.get $1
         i32.load offset=4
         call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#onlyDeployer
         local.get $0
         i32.load offset=48
         i32.const 1
         call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredBoolean/StoredBoolean#set:value
         i32.const 0
         call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
         br $__inlined_func$PredToken/PredToken#execute$983
        end
        local.get $2
        i32.const -2126221029
        i32.eq
        if
         global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
         local.tee $1
         i32.load offset=28
         i32.eqz
         br_if $folding-inner0
         local.get $1
         i32.load offset=28
         local.tee $1
         i32.eqz
         br_if $folding-inner1
         local.get $1
         i32.load offset=4
         call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#onlyDeployer
         local.get $0
         i32.load offset=48
         i32.const 0
         call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredBoolean/StoredBoolean#set:value
         i32.const 0
         call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
         br $__inlined_func$PredToken/PredToken#execute$983
        end
        local.get $0
        local.get $2
        local.get $1
        call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#execute
       end
       br $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#execute@override$412
      end
      local.get $0
      local.get $2
      local.get $1
      call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#execute
      br $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#execute@override$412
     end
     local.get $2
     call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#execute
    end
    global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
    local.get $2
    call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#onExecutionCompleted
    i32.load offset=8
    i32.load
    local.tee $0
    i32.const 20
    i32.sub
    i32.load offset=16
    local.tee $1
    i32.const 0
    i32.gt_s
    if
     i32.const 0
     local.get $0
     local.get $1
     call $~lib/@btc-vision/btc-runtime/runtime/env/global/env_exit
    end
    i32.const 0
    return
   end
   i32.const 10608
   i32.const 5456
   i32.const 146
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  i32.const 8256
  i32.const 5456
  i32.const 148
  i32.const 16
  call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
  unreachable
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/exports/index/onDeploy (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  i32.const 0
  i32.const 512
  i32.const 512
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.tee $1
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/getEnvironmentVariables
  i32.const 1
  global.set $~argumentsLength
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $1
  call $~lib/typedarray/Uint8Array.wrap@varargs
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#setEnvironmentVariables
  i32.const 0
  local.get $0
  local.get $0
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.tee $0
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/getCalldata
  i32.const 1
  global.set $~argumentsLength
  local.get $0
  call $~lib/typedarray/Uint8Array.wrap@varargs
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#constructor
  local.set $3
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  i32.const 0
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#onExecutionStarted
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.tee $2
  i32.load offset=16
  i32.load offset=12
  local.set $1
  i32.const 0
  local.set $0
  loop $for-loop|0
   local.get $0
   local.get $1
   i32.lt_s
   if
    local.get $2
    i32.load offset=16
    local.get $0
    call $~lib/array/Array<~lib/@btc-vision/btc-runtime/runtime/plugins/Plugin/Plugin>#__uget
    drop
    local.get $0
    i32.const 1
    i32.add
    local.set $0
    br $for-loop|0
   end
  end
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:contract
  local.tee $0
  i32.const 8
  i32.sub
  i32.load
  i32.const 34
  i32.eq
  if
   local.get $0
   local.get $3
   call $PredToken/PredToken#onDeployment
  end
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  i32.const 0
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#onExecutionCompleted
  i32.const 0
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/ReentrancyGuard#isSelectorExcluded (param $0 i32) (result i32)
  local.get $0
  i32.const 1397356254
  i32.eq
  local.get $0
  i32.const -666993220
  i32.eq
  i32.or
  local.get $0
  i32.const -824401953
  i32.eq
  i32.or
  local.get $0
  i32.const 1570067551
  i32.eq
  i32.or
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/generic/MapUint8Array/MapUint8Array#indexOf (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i64)
  local.get $0
  i32.load
  i32.load offset=12
  local.tee $2
  i32.eqz
  if
   i32.const -1
   return
  end
  local.get $1
  i32.load offset=4
  local.set $4
  local.get $1
  i32.load offset=8
  local.tee $3
  i32.const 8
  i32.ge_s
  if
   local.get $4
   i64.load
   local.set $10
   local.get $2
   i32.const 1
   i32.sub
   local.set $9
   loop $for-loop|0
    local.get $9
    i32.const 0
    i32.ge_s
    if
     block $for-continue|0
      local.get $0
      i32.load
      local.get $9
      call $~lib/array/Array<~lib/@btc-vision/btc-runtime/runtime/plugins/Plugin/Plugin>#__uget
      local.tee $2
      i32.load offset=8
      local.get $3
      i32.ne
      br_if $for-continue|0
      local.get $2
      i32.load offset=4
      i64.load
      local.get $10
      i64.ne
      br_if $for-continue|0
      local.get $3
      local.set $1
      i32.const 0
      local.set $8
      block $~lib/util/memory/memcmp|inlined.0
       local.get $2
       i32.load offset=4
       local.tee $7
       local.get $4
       local.tee $2
       i32.eq
       br_if $~lib/util/memory/memcmp|inlined.0
       local.get $7
       i32.const 7
       i32.and
       local.get $2
       i32.const 7
       i32.and
       i32.eq
       if
        loop $while-continue|1
         local.get $7
         i32.const 7
         i32.and
         if
          i32.const 0
          local.set $8
          local.get $1
          i32.eqz
          br_if $~lib/util/memory/memcmp|inlined.0
          local.get $7
          i32.load8_u
          local.tee $6
          local.get $2
          i32.load8_u
          local.tee $5
          i32.sub
          local.set $8
          local.get $5
          local.get $6
          i32.ne
          br_if $~lib/util/memory/memcmp|inlined.0
          local.get $1
          i32.const 1
          i32.sub
          local.set $1
          local.get $7
          i32.const 1
          i32.add
          local.set $7
          local.get $2
          i32.const 1
          i32.add
          local.set $2
          br $while-continue|1
         end
        end
        loop $while-continue|2
         local.get $1
         i32.const 8
         i32.ge_u
         if
          local.get $7
          i64.load
          local.get $2
          i64.load
          i64.eq
          if
           local.get $7
           i32.const 8
           i32.add
           local.set $7
           local.get $2
           i32.const 8
           i32.add
           local.set $2
           local.get $1
           i32.const 8
           i32.sub
           local.set $1
           br $while-continue|2
          end
         end
        end
       end
       loop $while-continue|3
        local.get $1
        local.tee $5
        i32.const 1
        i32.sub
        local.set $1
        local.get $5
        if
         local.get $7
         i32.load8_u
         local.tee $6
         local.get $2
         i32.load8_u
         local.tee $5
         i32.sub
         local.set $8
         local.get $5
         local.get $6
         i32.ne
         br_if $~lib/util/memory/memcmp|inlined.0
         local.get $7
         i32.const 1
         i32.add
         local.set $7
         local.get $2
         i32.const 1
         i32.add
         local.set $2
         br $while-continue|3
        end
       end
       i32.const 0
       local.set $8
      end
      local.get $8
      i32.eqz
      if
       local.get $0
       local.get $9
       i32.store offset=8
       local.get $9
       return
      end
     end
     local.get $9
     i32.const 1
     i32.sub
     local.set $9
     br $for-loop|0
    end
   end
  else
   local.get $2
   i32.const 1
   i32.sub
   local.set $9
   loop $for-loop|4
    local.get $9
    i32.const 0
    i32.ge_s
    if
     local.get $3
     local.get $0
     i32.load
     local.get $9
     call $~lib/array/Array<~lib/@btc-vision/btc-runtime/runtime/plugins/Plugin/Plugin>#__uget
     local.tee $2
     i32.load offset=8
     i32.eq
     if
      local.get $3
      local.set $1
      i32.const 0
      local.set $8
      block $~lib/util/memory/memcmp|inlined.1
       local.get $2
       i32.load offset=4
       local.tee $7
       local.get $4
       local.tee $2
       i32.eq
       br_if $~lib/util/memory/memcmp|inlined.1
       local.get $7
       i32.const 7
       i32.and
       local.get $2
       i32.const 7
       i32.and
       i32.eq
       if
        loop $while-continue|5
         local.get $7
         i32.const 7
         i32.and
         if
          i32.const 0
          local.set $8
          local.get $1
          i32.eqz
          br_if $~lib/util/memory/memcmp|inlined.1
          local.get $7
          i32.load8_u
          local.tee $6
          local.get $2
          i32.load8_u
          local.tee $5
          i32.sub
          local.set $8
          local.get $5
          local.get $6
          i32.ne
          br_if $~lib/util/memory/memcmp|inlined.1
          local.get $1
          i32.const 1
          i32.sub
          local.set $1
          local.get $7
          i32.const 1
          i32.add
          local.set $7
          local.get $2
          i32.const 1
          i32.add
          local.set $2
          br $while-continue|5
         end
        end
        loop $while-continue|6
         local.get $1
         i32.const 8
         i32.ge_u
         if
          local.get $7
          i64.load
          local.get $2
          i64.load
          i64.eq
          if
           local.get $7
           i32.const 8
           i32.add
           local.set $7
           local.get $2
           i32.const 8
           i32.add
           local.set $2
           local.get $1
           i32.const 8
           i32.sub
           local.set $1
           br $while-continue|6
          end
         end
        end
       end
       loop $while-continue|7
        local.get $1
        local.tee $5
        i32.const 1
        i32.sub
        local.set $1
        local.get $5
        if
         local.get $7
         i32.load8_u
         local.tee $6
         local.get $2
         i32.load8_u
         local.tee $5
         i32.sub
         local.set $8
         local.get $5
         local.get $6
         i32.ne
         br_if $~lib/util/memory/memcmp|inlined.1
         local.get $7
         i32.const 1
         i32.add
         local.set $7
         local.get $2
         i32.const 1
         i32.add
         local.set $2
         br $while-continue|7
        end
       end
       i32.const 0
       local.set $8
      end
      local.get $8
      i32.eqz
      if
       local.get $0
       local.get $9
       i32.store offset=8
       local.get $9
       return
      end
     end
     local.get $9
     i32.const 1
     i32.sub
     local.set $9
     br $for-loop|4
    end
   end
  end
  i32.const -1
 )
 (func $~lib/array/Array<~lib/typedarray/Uint8Array>#push (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  local.get $0
  i32.load offset=12
  local.tee $2
  i32.const 1
  i32.add
  local.tee $3
  i32.const 2
  call $~lib/array/ensureCapacity
  local.get $0
  i32.load offset=4
  local.get $2
  i32.const 2
  i32.shl
  i32.add
  local.get $1
  i32.store
  local.get $0
  local.get $3
  i32.store offset=12
 )
 (func $~lib/array/Array<~lib/typedarray/Uint8Array>#__set (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   local.get $1
   i32.const 0
   i32.lt_s
   if
    i32.const 2176
    i32.const 4224
    i32.const 130
    i32.const 22
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $0
   local.get $1
   i32.const 1
   i32.add
   local.tee $3
   i32.const 2
   call $~lib/array/ensureCapacity
   local.get $0
   local.get $3
   i32.store offset=12
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  local.get $2
  i32.store
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/generic/MapUint8Array/MapUint8Array#set (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  local.get $0
  i32.load offset=8
  i32.const -1
  i32.ne
  if (result i32)
   local.get $0
   i32.load
   local.get $0
   i32.load offset=8
   call $~lib/array/Array<~lib/@btc-vision/btc-runtime/runtime/plugins/Plugin/Plugin>#__uget
   local.tee $5
   i32.load offset=8
   local.get $1
   i32.load offset=8
   i32.eq
   if (result i32)
    local.get $1
    i32.load offset=8
    local.set $3
    block $~lib/util/memory/memcmp|inlined.2
     local.get $5
     i32.load offset=4
     local.tee $6
     local.get $1
     i32.load offset=4
     local.tee $5
     i32.eq
     br_if $~lib/util/memory/memcmp|inlined.2
     local.get $6
     i32.const 7
     i32.and
     local.get $5
     i32.const 7
     i32.and
     i32.eq
     if
      loop $while-continue|0
       local.get $6
       i32.const 7
       i32.and
       if
        i32.const 0
        local.set $4
        local.get $3
        i32.eqz
        br_if $~lib/util/memory/memcmp|inlined.2
        local.get $6
        i32.load8_u
        local.tee $7
        local.get $5
        i32.load8_u
        local.tee $8
        i32.sub
        local.set $4
        local.get $7
        local.get $8
        i32.ne
        br_if $~lib/util/memory/memcmp|inlined.2
        local.get $3
        i32.const 1
        i32.sub
        local.set $3
        local.get $6
        i32.const 1
        i32.add
        local.set $6
        local.get $5
        i32.const 1
        i32.add
        local.set $5
        br $while-continue|0
       end
      end
      loop $while-continue|1
       local.get $3
       i32.const 8
       i32.ge_u
       if
        local.get $6
        i64.load
        local.get $5
        i64.load
        i64.eq
        if
         local.get $6
         i32.const 8
         i32.add
         local.set $6
         local.get $5
         i32.const 8
         i32.add
         local.set $5
         local.get $3
         i32.const 8
         i32.sub
         local.set $3
         br $while-continue|1
        end
       end
      end
     end
     loop $while-continue|2
      local.get $3
      local.tee $4
      i32.const 1
      i32.sub
      local.set $3
      local.get $4
      if
       local.get $6
       i32.load8_u
       local.tee $7
       local.get $5
       i32.load8_u
       local.tee $8
       i32.sub
       local.set $4
       local.get $7
       local.get $8
       i32.ne
       br_if $~lib/util/memory/memcmp|inlined.2
       local.get $6
       i32.const 1
       i32.add
       local.set $6
       local.get $5
       i32.const 1
       i32.add
       local.set $5
       br $while-continue|2
      end
     end
     i32.const 0
     local.set $4
    end
    local.get $4
    if (result i32)
     i32.const -1
    else
     local.get $0
     i32.load offset=8
    end
   else
    i32.const -1
   end
  else
   i32.const -1
  end
  local.tee $3
  i32.const -1
  i32.eq
  if
   local.get $0
   local.get $1
   call $~lib/@btc-vision/btc-runtime/runtime/generic/MapUint8Array/MapUint8Array#indexOf
   local.set $3
  end
  local.get $3
  i32.const -1
  i32.eq
  if
   local.get $0
   i32.load
   local.get $1
   call $~lib/array/Array<~lib/typedarray/Uint8Array>#push
   local.get $0
   i32.load offset=4
   local.get $2
   call $~lib/array/Array<~lib/typedarray/Uint8Array>#push
   local.get $0
   local.get $0
   i32.load
   i32.load offset=12
   i32.const 1
   i32.sub
   i32.store offset=8
  else
   local.get $0
   i32.load offset=4
   local.get $3
   local.get $2
   call $~lib/array/Array<~lib/typedarray/Uint8Array>#__set
   local.get $0
   local.get $3
   i32.store offset=8
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#hasPointerStorageHash (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $1
  i32.load
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 32
  i32.ne
  if
   i32.const 9872
   i32.const 5456
   i32.const 1074
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/generic/MapUint8Array/MapUint8Array#indexOf
  i32.const -1
  i32.ne
  if
   return
  end
  i32.const 32
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.set $2
  local.get $1
  i32.load
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/loadPointer
  i32.const 1
  global.set $~argumentsLength
  local.get $2
  call $~lib/typedarray/Uint8Array.wrap@varargs
  local.set $2
  local.get $0
  i32.load offset=4
  local.get $1
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/generic/MapUint8Array/MapUint8Array#set
  local.get $2
  i32.load offset=8
  global.get $~lib/@btc-vision/btc-runtime/runtime/math/bytes/EMPTY_BUFFER
  local.tee $1
  i32.load offset=8
  i32.eq
  if
   local.get $2
   i32.load offset=8
   local.set $0
   block $~lib/util/memory/memcmp|inlined.3
    local.get $2
    i32.load offset=4
    local.tee $2
    local.get $1
    i32.load offset=4
    local.tee $3
    i32.eq
    br_if $~lib/util/memory/memcmp|inlined.3
    local.get $2
    i32.const 7
    i32.and
    local.get $3
    i32.const 7
    i32.and
    i32.eq
    if
     loop $while-continue|0
      local.get $2
      i32.const 7
      i32.and
      if
       local.get $0
       i32.eqz
       br_if $~lib/util/memory/memcmp|inlined.3
       local.get $3
       i32.load8_u
       local.get $2
       i32.load8_u
       i32.ne
       br_if $~lib/util/memory/memcmp|inlined.3
       local.get $0
       i32.const 1
       i32.sub
       local.set $0
       local.get $2
       i32.const 1
       i32.add
       local.set $2
       local.get $3
       i32.const 1
       i32.add
       local.set $3
       br $while-continue|0
      end
     end
     loop $while-continue|1
      local.get $0
      i32.const 8
      i32.ge_u
      if
       local.get $2
       i64.load
       local.get $3
       i64.load
       i64.eq
       if
        local.get $2
        i32.const 8
        i32.add
        local.set $2
        local.get $3
        i32.const 8
        i32.add
        local.set $3
        local.get $0
        i32.const 8
        i32.sub
        local.set $0
        br $while-continue|1
       end
      end
     end
    end
    loop $while-continue|2
     local.get $0
     local.tee $1
     i32.const 1
     i32.sub
     local.set $0
     local.get $1
     if
      local.get $3
      i32.load8_u
      local.get $2
      i32.load8_u
      i32.ne
      br_if $~lib/util/memory/memcmp|inlined.3
      local.get $2
      i32.const 1
      i32.add
      local.set $2
      local.get $3
      i32.const 1
      i32.add
      local.set $3
      br $while-continue|2
     end
    end
   end
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#getStorageAt (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#hasPointerStorageHash
  local.get $0
  i32.load offset=4
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/generic/MapUint8Array/MapUint8Array#indexOf
  i32.const -1
  i32.ne
  if
   local.get $0
   i32.load offset=4
   local.tee $0
   local.get $1
   call $~lib/@btc-vision/btc-runtime/runtime/generic/MapUint8Array/MapUint8Array#indexOf
   local.tee $1
   i32.const -1
   i32.eq
   if
    i32.const 9952
    i32.const 10048
    i32.const 130
    i32.const 13
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $0
   i32.load offset=4
   local.get $1
   call $~lib/array/Array<~lib/@btc-vision/btc-runtime/runtime/plugins/Plugin/Plugin>#__uget
   return
  end
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#_internalSetStorageAt (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  local.get $1
  i32.load offset=8
  i32.const 32
  i32.ne
  if
   i32.const 9872
   i32.const 5456
   i32.const 1047
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $2
  local.set $3
  local.get $2
  i32.load offset=8
  i32.const 32
  i32.ne
  if
   i32.const 0
   i32.const 32
   call $~lib/typedarray/Uint8Array#constructor
   local.tee $3
   i32.load offset=4
   local.get $2
   i32.load offset=4
   local.get $2
   i32.load offset=8
   i32.const 32
   i32.lt_s
   if (result i32)
    local.get $2
    i32.load offset=8
   else
    i32.const 32
   end
   memory.copy
  end
  local.get $0
  i32.load offset=4
  local.get $1
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/generic/MapUint8Array/MapUint8Array#set
  local.get $1
  i32.load
  local.get $3
  i32.load
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/storePointer
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/storage/StoredBoolean/StoredBoolean#set:value (param $0 i32) (param $1 i32)
  local.get $0
  i32.load offset=8
  i32.const 0
  local.get $1
  i32.eqz
  i32.eqz
  call $~lib/typedarray/Uint8Array#__set
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $0
  i32.load
  local.get $0
  i32.load offset=8
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#_internalSetStorageAt
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue (param $0 i32)
  (local $1 i32)
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $0
  i32.load
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#getStorageAt
  local.tee $1
  i32.load offset=8
  i32.const 32
  i32.ne
  if
   i32.const 2304
   i32.const 5952
   i32.const 220
   i32.const 30
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  local.get $1
  i32.load offset=4
  local.tee $0
  i64.load offset=24
  call $~lib/polyfills/bswap<u64>
  local.get $0
  i64.load offset=16
  call $~lib/polyfills/bswap<u64>
  local.get $0
  i64.load offset=8
  call $~lib/polyfills/bswap<u64>
  local.get $0
  i64.load
  call $~lib/polyfills/bswap<u64>
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  i32.store offset=12
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.add (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.add
  local.tee $1
  local.get $0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.lt
  if
   i32.const 10528
   i32.const 7360
   i32.const 55
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#get:__value (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  local.get $0
  i32.load offset=12
  local.set $1
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $0
  i32.load offset=4
  local.tee $2
  local.get $1
  i64.load offset=24
  call $~lib/polyfills/bswap<u64>
  i64.store
  local.get $2
  local.get $1
  i64.load offset=16
  call $~lib/polyfills/bswap<u64>
  i64.store offset=8
  local.get $2
  local.get $1
  i64.load offset=8
  call $~lib/polyfills/bswap<u64>
  i64.store offset=16
  local.get $2
  local.get $1
  i64.load
  call $~lib/polyfills/bswap<u64>
  i64.store offset=24
  local.get $0
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#set:value (param $0 i32) (param $1 i32)
  (local $2 i32)
  local.get $1
  i64.load
  local.get $0
  i32.load offset=12
  local.tee $2
  i64.load
  i64.eq
  if (result i32)
   local.get $1
   i64.load offset=8
   local.get $2
   i64.load offset=8
   i64.eq
  else
   i32.const 0
  end
  if (result i32)
   local.get $1
   i64.load offset=16
   local.get $2
   i64.load offset=16
   i64.eq
  else
   i32.const 0
  end
  if (result i32)
   local.get $1
   i64.load offset=24
   local.get $2
   i64.load offset=24
   i64.eq
  else
   i32.const 0
  end
  if
   return
  end
  local.get $0
  local.get $1
  i32.store offset=12
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $0
  i32.load
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#get:__value
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#_internalSetStorageAt
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/ReentrancyGuard#nonReentrantBefore (param $0 i32)
  (local $1 i32)
  local.get $0
  i32.load offset=8
  if
   local.get $0
   i32.load offset=8
   i32.const 1
   i32.eq
   if
    local.get $0
    i32.load offset=4
    local.tee $1
    call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue
    local.get $1
    i32.load offset=12
    local.tee $1
    i64.const 1
    i64.const 0
    i64.const 0
    i64.const 0
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.lt
    i32.eqz
    if
     i32.const 10432
     i32.const 10272
     i32.const 80
     i32.const 17
     call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
     unreachable
    end
    local.get $0
    i32.load offset=4
    local.get $1
    i64.const 1
    i64.const 0
    i64.const 0
    i64.const 0
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
    call $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.add
    call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#set:value
    local.get $1
    i64.load offset=24
    local.get $1
    i64.load offset=16
    local.get $1
    i64.load
    local.get $1
    i64.load offset=8
    i64.or
    i64.or
    i64.or
    i64.eqz
    if
     local.get $0
     i32.load
     i32.const 1
     call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredBoolean/StoredBoolean#set:value
    end
   end
  else
   local.get $0
   i32.load
   local.tee $1
   global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
   local.get $1
   i32.load
   call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#getStorageAt
   i32.store offset=8
   local.get $1
   i32.load offset=8
   i32.const 0
   call $~lib/typedarray/Uint8Array#__get
   i32.const 1
   i32.eq
   if
    i32.const 10192
    i32.const 10272
    i32.const 125
    i32.const 9
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $0
   i32.load
   i32.const 1
   call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredBoolean/StoredBoolean#set:value
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#___get (param $0 i32) (param $1 i32) (result i32)
  local.get $1
  local.get $0
  i32.load offset=8
  i32.ge_u
  if
   i32.const 2176
   i32.const 2752
   i32.const 356
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.add
  i32.load8_u
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  local.get $1
  i32.load offset=8
  local.get $0
  i32.load offset=8
  i32.ne
  if
   i32.const 0
   return
  end
  loop $for-loop|0
   local.get $2
   local.get $0
   i32.load offset=8
   i32.lt_s
   if
    local.get $0
    local.get $2
    call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#___get
    local.get $1
    local.get $2
    call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#___get
    i32.ne
    if
     i32.const 0
     return
    end
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  i32.const 1
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#onlyDeployer (param $0 i32)
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:contractDeployer
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
  i32.eqz
  if
   i32.const 10688
   i32.const 9728
   i32.const 60
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
 )
 (func $PredToken/PredToken#whenNotPaused (param $0 i32)
  local.get $0
  i32.load offset=48
  local.tee $0
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $0
  i32.load
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#getStorageAt
  i32.store offset=8
  local.get $0
  i32.load offset=8
  i32.const 0
  call $~lib/typedarray/Uint8Array#__get
  i32.const 1
  i32.eq
  if
   i32.const 10784
   i32.const 10848
   i32.const 76
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU256 (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  local.get $0
  local.get $0
  i32.load offset=4
  i32.const 32
  i32.add
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#verifyEnd
  i32.const 32
  call $~lib/array/Array<u8>#constructor
  local.set $1
  loop $for-loop|0
   local.get $2
   i32.const 32
   i32.lt_s
   if
    local.get $1
    local.get $2
    local.get $0
    call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU8
    call $~lib/array/Array<u8>#__set
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  local.get $1
  i32.load offset=12
  i32.const 32
  i32.ne
  if
   i32.const 2304
   i32.const 5952
   i32.const 186
   i32.const 30
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
  i32.load offset=4
  local.tee $0
  i64.load offset=24
  call $~lib/polyfills/bswap<u64>
  local.get $0
  i64.load offset=16
  call $~lib/polyfills/bswap<u64>
  local.get $0
  i64.load offset=8
  call $~lib/polyfills/bswap<u64>
  local.get $0
  i64.load
  call $~lib/polyfills/bswap<u64>
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address.zero (result i32)
  (local $0 i32)
  (local $1 i32)
  block $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#clone@override$526
   global.get $~lib/@btc-vision/btc-runtime/runtime/types/Address/ZERO_ADDRESS
   local.tee $0
   i32.const 8
   i32.sub
   i32.load
   i32.const 15
   i32.eq
   if
    local.get $0
    call $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/ExtendedAddress#clone
    local.set $1
    br $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#clone@override$526
   end
   i32.const 0
   i32.const 0
   i32.const 0
   i32.const 10
   i32.const 10896
   call $~lib/rt/__newArray
   call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#constructor
   local.tee $1
   i32.load offset=4
   local.get $0
   i32.load offset=4
   i32.const 32
   memory.copy
   local.get $1
   local.get $0
   i32.load8_u offset=12
   i32.store8 offset=12
  end
  local.get $1
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#encodePointer (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  i32.load16_u
  local.get $1
  i32.const 0
  i32.const 30
  call $~lib/typedarray/Uint8Array#slice
  i32.const 1
  i32.const 11120
  call $~lib/@btc-vision/btc-runtime/runtime/math/abi/encodePointer
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#get (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#encodePointer
  local.set $0
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#getStorageAt
  local.tee $0
  i32.load offset=8
  i32.const 32
  i32.ne
  if
   i32.const 2304
   i32.const 5952
   i32.const 220
   i32.const 30
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.tee $0
  i64.load offset=24
  call $~lib/polyfills/bswap<u64>
  local.get $0
  i64.load offset=16
  call $~lib/polyfills/bswap<u64>
  local.get $0
  i64.load offset=8
  call $~lib/polyfills/bswap<u64>
  local.get $0
  i64.load
  call $~lib/polyfills/bswap<u64>
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#set (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $4
  i32.load offset=4
  local.tee $3
  local.get $2
  i64.load offset=24
  call $~lib/polyfills/bswap<u64>
  i64.store
  local.get $3
  local.get $2
  i64.load offset=16
  call $~lib/polyfills/bswap<u64>
  i64.store offset=8
  local.get $3
  local.get $2
  i64.load offset=8
  call $~lib/polyfills/bswap<u64>
  i64.store offset=16
  local.get $3
  local.get $2
  i64.load
  call $~lib/polyfills/bswap<u64>
  i64.store offset=24
  local.get $0
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#encodePointer
  local.set $0
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $0
  local.get $4
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#_internalSetStorageAt
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256 (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  i32.const 32
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#allocSafe
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $3
  i32.load offset=4
  local.tee $2
  local.get $1
  i64.load offset=24
  call $~lib/polyfills/bswap<u64>
  i64.store
  local.get $2
  local.get $1
  i64.load offset=16
  call $~lib/polyfills/bswap<u64>
  i64.store offset=8
  local.get $2
  local.get $1
  i64.load offset=8
  call $~lib/polyfills/bswap<u64>
  i64.store offset=16
  local.get $2
  local.get $1
  i64.load
  call $~lib/polyfills/bswap<u64>
  i64.store offset=24
  i32.const 0
  local.set $1
  loop $for-loop|0
   local.get $1
   i32.const 32
   i32.lt_s
   if
    local.get $0
    local.get $3
    local.get $1
    call $~lib/typedarray/Uint8Array#__get
    call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU8
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|0
   end
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/events/NetEvent/NetEvent#constructor (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  local.get $0
  i32.eqz
  if
   i32.const 12
   i32.const 53
   call $~lib/rt/stub/__new
   local.set $0
  end
  local.get $0
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $2
  i32.store offset=8
  local.get $0
  i32.const 0
  i32.store
  local.get $2
  i32.load offset=4
  i32.load offset=8
  i32.const 352
  i32.gt_u
  if
   i32.const 11248
   i32.const 11360
   i32.const 14
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  local.get $2
  i32.load offset=8
  i32.store
  local.get $0
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#emitEvent (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  local.get $0
  i32.load
  i32.eqz
  if
   i32.const 11536
   i32.const 11360
   i32.const 22
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load
  i32.load offset=8
  i32.const 352
  i32.gt_u
  if
   i32.const 11248
   i32.const 9728
   i32.const 43
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load
  i32.eqz
  if
   i32.const 11536
   i32.const 11360
   i32.const 30
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load
  local.set $1
  local.get $0
  i32.load offset=4
  local.tee $5
  call $~lib/string/String.UTF8.byteLength
  local.set $6
  i32.const 0
  local.get $1
  i32.load offset=8
  local.get $6
  i32.const 8
  i32.add
  i32.add
  local.tee $2
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $3
  i32.load offset=4
  local.tee $0
  local.get $6
  call $~lib/polyfills/bswap<u32>
  i32.store
  local.get $5
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  local.set $4
  i32.const 3
  global.set $~argumentsLength
  local.get $5
  local.get $4
  local.get $0
  i32.const 4
  i32.add
  call $~lib/string/String.UTF8.encodeUnsafe
  local.get $6
  i32.const 4
  i32.add
  local.get $0
  i32.add
  local.tee $0
  local.get $1
  i32.load offset=8
  call $~lib/polyfills/bswap<u32>
  i32.store
  local.get $0
  i32.const 4
  i32.add
  local.get $1
  i32.load offset=4
  local.get $1
  i32.load offset=8
  memory.copy
  local.get $3
  i32.load
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/emit
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_mint (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address.zero
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
  if
   i32.const 10928
   i32.const 10992
   i32.const 913
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=20
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#get
  local.set $3
  local.get $0
  i32.load offset=20
  local.get $1
  local.get $3
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.add
  call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#set
  local.get $0
  i32.load offset=12
  local.tee $3
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue
  local.get $3
  local.get $3
  i32.load offset=12
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.add
  i32.store offset=12
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $3
  i32.load
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#get:__value
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#_internalSetStorageAt
  local.get $0
  local.get $3
  i32.store offset=12
  local.get $0
  i32.load offset=12
  local.tee $3
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue
  local.get $3
  i32.load offset=12
  local.set $3
  local.get $0
  i32.load offset=24
  local.tee $0
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue
  local.get $0
  i32.load offset=12
  local.get $3
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.lt
  if
   i32.const 11184
   i32.const 10992
   i32.const 923
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  i32.const 12
  i32.const 54
  call $~lib/rt/stub/__new
  i32.const 64
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
  local.tee $3
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
  local.get $3
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256
  i32.const 11504
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/events/NetEvent/NetEvent#constructor
  call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#emitEvent
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#getPointer (param $0 i32) (param $1 i64) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#getClassName@override
  local.get $0
  i32.load16_u offset=8
  local.get $0
  i32.load offset=4
  i32.const 1
  i32.const 14720
  call $~lib/@btc-vision/btc-runtime/runtime/math/abi/encodePointer
  local.tee $4
  i32.load offset=8
  i32.const 32
  i32.ne
  if
   i32.const 11600
   i32.const 8832
   i32.const 163
   i32.const 9
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.set $5
  loop $for-loop|0
   local.get $2
   i32.const 8
   i32.lt_s
   if
    local.get $5
    i32.const 31
    local.get $2
    i32.sub
    local.get $1
    i64.const 255
    i64.and
    i32.wrap_i64
    call $~lib/typedarray/Uint8Array#__set
    local.get $1
    i64.const 8
    i64.shr_u
    local.set $1
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  local.get $4
  i32.load offset=8
  i32.const 32
  i32.ne
  if (result i32)
   i32.const 1
  else
   local.get $5
   i32.load offset=8
   i32.const 32
   i32.ne
  end
  if
   i32.const 11696
   i32.const 8832
   i32.const 48
   i32.const 9
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.set $0
  i32.const 31
  local.set $2
  loop $for-loop|1
   local.get $2
   i32.const 0
   i32.ge_s
   if
    local.get $0
    local.get $2
    local.get $4
    local.get $2
    call $~lib/typedarray/Uint8Array#__get
    local.get $5
    local.get $2
    call $~lib/typedarray/Uint8Array#__get
    i32.add
    local.get $3
    i32.add
    local.tee $3
    i32.const 255
    i32.and
    call $~lib/typedarray/Uint8Array#__set
    local.get $3
    i32.const 8
    i32.shr_u
    local.set $3
    local.get $2
    i32.const 1
    i32.sub
    local.set $2
    br $for-loop|1
   end
  end
  local.get $0
 )
 (func $~lib/string/String.UTF8.decodeUnsafe (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  local.get $0
  local.get $1
  i32.add
  local.tee $3
  local.get $0
  i32.lt_u
  if
   i32.const 0
   i32.const 2128
   i32.const 770
   i32.const 7
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
  i32.const 1
  i32.shl
  i32.const 2
  call $~lib/rt/stub/__new
  local.tee $4
  local.set $1
  loop $while-continue|0
   local.get $0
   local.get $3
   i32.lt_u
   if
    block $while-break|0
     local.get $0
     i32.load8_u
     local.set $5
     local.get $0
     i32.const 1
     i32.add
     local.set $0
     local.get $5
     i32.const 128
     i32.and
     if
      local.get $0
      local.get $3
      i32.eq
      br_if $while-break|0
      local.get $0
      i32.load8_u
      i32.const 63
      i32.and
      local.set $6
      local.get $0
      i32.const 1
      i32.add
      local.set $0
      local.get $5
      i32.const 224
      i32.and
      i32.const 192
      i32.eq
      if
       local.get $1
       local.get $5
       i32.const 31
       i32.and
       i32.const 6
       i32.shl
       local.get $6
       i32.or
       i32.store16
      else
       local.get $0
       local.get $3
       i32.eq
       br_if $while-break|0
       local.get $0
       i32.load8_u
       i32.const 63
       i32.and
       local.set $2
       local.get $0
       i32.const 1
       i32.add
       local.set $0
       local.get $5
       i32.const 240
       i32.and
       i32.const 224
       i32.eq
       if
        local.get $5
        i32.const 15
        i32.and
        i32.const 12
        i32.shl
        local.get $6
        i32.const 6
        i32.shl
        i32.or
        local.get $2
        i32.or
        local.set $2
       else
        local.get $0
        local.get $3
        i32.eq
        br_if $while-break|0
        local.get $0
        i32.load8_u
        i32.const 63
        i32.and
        local.get $5
        i32.const 7
        i32.and
        i32.const 18
        i32.shl
        local.get $6
        i32.const 12
        i32.shl
        i32.or
        local.get $2
        i32.const 6
        i32.shl
        i32.or
        i32.or
        local.set $2
        local.get $0
        i32.const 1
        i32.add
        local.set $0
       end
       local.get $2
       i32.const 65536
       i32.lt_u
       if
        local.get $1
        local.get $2
        i32.store16
       else
        local.get $1
        local.get $2
        i32.const 65536
        i32.sub
        local.tee $2
        i32.const 10
        i32.shr_u
        i32.const 55296
        i32.or
        local.get $2
        i32.const 1023
        i32.and
        i32.const 56320
        i32.or
        i32.const 16
        i32.shl
        i32.or
        i32.store
        local.get $1
        i32.const 2
        i32.add
        local.set $1
       end
      end
     else
      local.get $1
      local.get $5
      i32.store16
     end
     local.get $1
     i32.const 2
     i32.add
     local.set $1
     br $while-continue|0
    end
   end
  end
  local.get $4
  local.get $1
  local.get $4
  i32.sub
  call $~lib/rt/stub/__renew
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#load (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i64)
  (local $6 i32)
  (local $7 i32)
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $0
  i64.const 0
  call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#getPointer
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#getStorageAt
  local.tee $2
  i32.const 0
  call $~lib/typedarray/Uint8Array#__get
  i32.const 24
  i32.shl
  local.get $2
  i32.const 1
  call $~lib/typedarray/Uint8Array#__get
  i32.const 16
  i32.shl
  i32.or
  local.get $2
  i32.const 2
  call $~lib/typedarray/Uint8Array#__get
  i32.const 8
  i32.shl
  i32.or
  local.get $2
  i32.const 3
  call $~lib/typedarray/Uint8Array#__get
  i32.or
  local.tee $6
  i32.eqz
  if
   local.get $0
   i32.const 2032
   i32.store offset=12
   return
  end
  i32.const 0
  local.get $6
  call $~lib/typedarray/Uint8Array#constructor
  local.set $4
  i32.const 28
  local.get $6
  local.get $6
  i32.const 28
  i32.ge_u
  select
  local.set $3
  loop $for-loop|0
   local.get $1
   local.get $3
   i32.lt_u
   if
    local.get $4
    local.get $1
    local.get $2
    local.get $1
    i32.const 4
    i32.add
    call $~lib/typedarray/Uint8Array#__get
    call $~lib/typedarray/Uint8Array#__set
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|0
   end
  end
  local.get $6
  local.get $3
  i32.sub
  local.set $1
  i64.const 1
  local.set $5
  loop $while-continue|1
   local.get $1
   if
    global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
    local.get $0
    local.get $5
    call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#getPointer
    call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#getStorageAt
    local.set $7
    i32.const 32
    local.get $1
    local.get $1
    i32.const 32
    i32.ge_u
    select
    local.set $6
    i32.const 0
    local.set $2
    loop $for-loop|2
     local.get $2
     local.get $6
     i32.lt_u
     if
      local.get $4
      local.get $2
      local.get $3
      i32.add
      local.get $7
      local.get $2
      call $~lib/typedarray/Uint8Array#__get
      call $~lib/typedarray/Uint8Array#__set
      local.get $2
      i32.const 1
      i32.add
      local.set $2
      br $for-loop|2
     end
    end
    local.get $1
    local.get $6
    i32.sub
    local.set $1
    local.get $3
    local.get $6
    i32.add
    local.set $3
    local.get $5
    i64.const 1
    i64.add
    local.set $5
    br $while-continue|1
   end
  end
  local.get $0
  local.get $4
  i32.load
  local.tee $0
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  call $~lib/string/String.UTF8.decodeUnsafe
  i32.store offset=12
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#get:value (param $0 i32) (result i32)
  (local $1 i32)
  local.get $0
  i32.load offset=12
  local.tee $1
  if (result i32)
   local.get $1
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
  else
   i32.const 0
  end
  i32.eqz
  if
   local.get $0
   call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#load
  end
  local.get $0
  i32.load offset=12
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU32 (param $0 i32) (param $1 i32)
  local.get $0
  i32.const 4
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#allocSafe
  local.get $0
  i32.load offset=4
  local.get $0
  i32.load
  local.get $1
  call $~lib/dataview/DataView#setUint32
  local.get $0
  local.get $0
  i32.load
  i32.const 4
  i32.add
  i32.store
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeStringWithLength (param $0 i32) (param $1 i32)
  i32.const 1
  global.set $~argumentsLength
  local.get $0
  local.get $1
  call $~lib/string/String.UTF8.encode@varargs
  local.tee $1
  i32.const 20
  i32.sub
  i32.load offset=16
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU32
  i32.const 1
  global.set $~argumentsLength
  local.get $0
  local.get $1
  call $~lib/typedarray/Uint8Array.wrap@varargs
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytes
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytesU8Array (param $0 i32) (param $1 i32)
  (local $2 i32)
  local.get $0
  local.get $1
  i32.load offset=12
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#allocSafe
  loop $for-loop|0
   local.get $2
   local.get $1
   i32.load offset=12
   i32.lt_s
   if
    local.get $2
    local.get $1
    i32.load offset=12
    i32.ge_u
    if
     i32.const 2176
     i32.const 4224
     i32.const 114
     i32.const 42
     call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
     unreachable
    end
    local.get $0
    local.get $1
    i32.load offset=4
    local.get $2
    i32.add
    i32.load8_u
    call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU8
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_buildDomainSeparator (param $0 i32) (result i32)
  (local $1 i32)
  i32.const 192
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
  local.tee $1
  i32.const 4880
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytesU8Array
  local.get $0
  i32.load offset=32
  call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#get:value
  i32.const 1
  global.set $~argumentsLength
  call $~lib/string/String.UTF8.encode@varargs
  local.set $0
  i32.const 1
  global.set $~argumentsLength
  local.get $1
  local.get $0
  call $~lib/typedarray/Uint8Array.wrap@varargs
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/sha256
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytes
  local.get $1
  i32.const 4992
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytesU8Array
  local.get $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#get:chainId
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytes
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.tee $0
  i32.load offset=52
  i32.eqz
  if
   i32.const 11808
   i32.const 5456
   i32.const 265
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=52
  local.tee $0
  i32.eqz
  if
   i32.const 8256
   i32.const 5456
   i32.const 267
   i32.const 16
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytes
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.tee $0
  i32.load offset=44
  i32.eqz
  if
   i32.const 11888
   i32.const 5456
   i32.const 232
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=44
  local.tee $0
  i32.eqz
  if
   i32.const 8256
   i32.const 5456
   i32.const 234
   i32.const 16
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
  local.get $1
  i32.load offset=8
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/sha256
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#hasStorageAt (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $0
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#getStorageAt
  local.tee $2
  i32.load offset=8
  global.get $~lib/@btc-vision/btc-runtime/runtime/math/bytes/EMPTY_BUFFER
  local.tee $3
  i32.load offset=8
  i32.ne
  if (result i32)
   i32.const 0
  else
   local.get $2
   i32.load offset=8
   local.set $0
   i32.const 0
   local.set $1
   block $~lib/util/memory/memcmp|inlined.4
    local.get $2
    i32.load offset=4
    local.tee $2
    local.get $3
    i32.load offset=4
    local.tee $3
    i32.eq
    br_if $~lib/util/memory/memcmp|inlined.4
    local.get $2
    i32.const 7
    i32.and
    local.get $3
    i32.const 7
    i32.and
    i32.eq
    if
     loop $while-continue|0
      local.get $2
      i32.const 7
      i32.and
      if
       i32.const 0
       local.set $1
       local.get $0
       i32.eqz
       br_if $~lib/util/memory/memcmp|inlined.4
       local.get $2
       i32.load8_u
       local.tee $4
       local.get $3
       i32.load8_u
       local.tee $5
       i32.sub
       local.set $1
       local.get $4
       local.get $5
       i32.ne
       br_if $~lib/util/memory/memcmp|inlined.4
       local.get $0
       i32.const 1
       i32.sub
       local.set $0
       local.get $2
       i32.const 1
       i32.add
       local.set $2
       local.get $3
       i32.const 1
       i32.add
       local.set $3
       br $while-continue|0
      end
     end
     loop $while-continue|1
      local.get $0
      i32.const 8
      i32.ge_u
      if
       local.get $2
       i64.load
       local.get $3
       i64.load
       i64.eq
       if
        local.get $2
        i32.const 8
        i32.add
        local.set $2
        local.get $3
        i32.const 8
        i32.add
        local.set $3
        local.get $0
        i32.const 8
        i32.sub
        local.set $0
        br $while-continue|1
       end
      end
     end
    end
    loop $while-continue|2
     local.get $0
     local.tee $1
     i32.const 1
     i32.sub
     local.set $0
     local.get $1
     if
      local.get $2
      i32.load8_u
      local.tee $4
      local.get $3
      i32.load8_u
      local.tee $5
      i32.sub
      local.set $1
      local.get $4
      local.get $5
      i32.ne
      br_if $~lib/util/memory/memcmp|inlined.4
      local.get $2
      i32.const 1
      i32.add
      local.set $2
      local.get $3
      i32.const 1
      i32.add
      local.set $3
      br $while-continue|2
     end
    end
    i32.const 0
    local.set $1
   end
   local.get $1
   i32.eqz
  end
  i32.eqz
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#constructor (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  i32.const 6
  i32.const 41
  call $~lib/rt/stub/__new
  local.tee $2
  i32.const 0
  i32.store
  local.get $2
  i32.const 0
  i32.store16 offset=4
  local.get $2
  local.get $1
  i32.store16 offset=4
  local.get $2
  local.get $0
  i32.store
  local.get $2
 )
 (func $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#set" (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  local.get $0
  i32.load offset=8
  i32.const -1
  i32.ne
  if
   local.get $0
   i32.load
   local.get $0
   i32.load offset=8
   call $~lib/array/Array<~lib/@btc-vision/btc-runtime/runtime/plugins/Plugin/Plugin>#__uget
   local.get $1
   call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
   if
    local.get $0
    i32.load offset=4
    local.get $0
    i32.load offset=8
    local.get $2
    call $~lib/array/Array<~lib/typedarray/Uint8Array>#__set
    local.get $0
    return
   end
  end
  local.get $0
  local.get $1
  call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#indexOf@override"
  local.tee $3
  i32.const -1
  i32.eq
  if
   local.get $0
   i32.load
   local.get $1
   call $~lib/array/Array<~lib/typedarray/Uint8Array>#push
   local.get $0
   i32.load offset=4
   local.get $2
   call $~lib/array/Array<~lib/typedarray/Uint8Array>#push
   local.get $0
   local.get $0
   i32.load
   i32.load offset=12
   i32.const 1
   i32.sub
   i32.store offset=8
  else
   local.get $0
   i32.load offset=4
   local.get $3
   local.get $2
   call $~lib/array/Array<~lib/typedarray/Uint8Array>#__set
   local.get $0
   local.get $3
   i32.store offset=8
  end
  local.get $0
 )
 (func $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#get" (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#indexOf@override"
  local.tee $1
  i32.const -1
  i32.eq
  if
   i32.const 11968
   i32.const 12048
   i32.const 92
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  call $~lib/array/Array<~lib/@btc-vision/btc-runtime/runtime/plugins/Plugin/Plugin>#__uget
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#getKeyHash (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  local.get $1
  i32.load offset=8
  local.get $0
  i32.load
  i32.load offset=8
  i32.add
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
  local.tee $2
  local.get $0
  i32.load
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytes
  local.get $2
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytes
  local.get $0
  i32.load16_u offset=4
  local.get $2
  i32.load offset=8
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/sha256
  i32.const 0
  i32.const 2032
  call $~lib/@btc-vision/btc-runtime/runtime/math/abi/encodePointer
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#get (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#getKeyHash
  local.set $0
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#getStorageAt
  local.tee $0
  i32.load offset=8
  i32.const 32
  i32.ne
  if
   i32.const 2304
   i32.const 5952
   i32.const 220
   i32.const 30
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.tee $0
  i64.load offset=24
  call $~lib/polyfills/bswap<u64>
  local.get $0
  i64.load offset=16
  call $~lib/polyfills/bswap<u64>
  local.get $0
  i64.load offset=8
  call $~lib/polyfills/bswap<u64>
  local.get $0
  i64.load
  call $~lib/polyfills/bswap<u64>
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.sub (param $0 i32) (param $1 i32) (result i32)
  (local $2 i64)
  (local $3 i64)
  (local $4 i64)
  (local $5 i64)
  (local $6 i64)
  (local $7 i64)
  local.get $0
  local.get $1
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.lt
  if
   i32.const 12288
   i32.const 7360
   i32.const 125
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i64.load
  local.tee $3
  local.get $1
  i64.load
  i64.sub
  local.set $2
  local.get $2
  local.get $3
  i64.gt_u
  i64.extend_i32_s
  global.set $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
  local.get $0
  i64.load offset=8
  local.tee $3
  local.get $1
  i64.load offset=8
  i64.sub
  local.tee $4
  global.get $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
  i64.sub
  local.set $5
  local.get $4
  local.get $5
  i64.lt_u
  local.get $3
  local.get $4
  i64.lt_u
  i32.add
  i64.extend_i32_s
  global.set $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
  local.get $0
  i64.load offset=16
  local.tee $3
  local.get $1
  i64.load offset=16
  i64.sub
  local.tee $4
  global.get $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
  i64.sub
  local.set $6
  local.get $4
  local.get $6
  i64.lt_u
  local.get $3
  local.get $4
  i64.lt_u
  i32.add
  i64.extend_i32_s
  global.set $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
  local.get $0
  i64.load offset=24
  local.tee $4
  local.get $1
  i64.load offset=24
  i64.sub
  local.tee $3
  global.get $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
  i64.sub
  local.set $7
  local.get $3
  local.get $7
  i64.lt_u
  local.get $3
  local.get $4
  i64.gt_u
  i32.add
  i64.extend_i32_s
  global.set $~lib/@btc-vision/as-bignum/assembly/globals/__u256carrySub
  local.get $2
  local.get $5
  local.get $6
  local.get $7
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_transfer (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address.zero
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
  if
   i32.const 12176
   i32.const 10992
   i32.const 634
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address.zero
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
  if
   i32.const 10928
   i32.const 10992
   i32.const 638
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=20
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#get
  local.tee $4
  local.get $3
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.lt
  if
   i32.const 12224
   i32.const 10992
   i32.const 643
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=20
  local.get $1
  local.get $4
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.sub
  call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#set
  local.get $0
  i32.load offset=20
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#get
  local.set $4
  local.get $0
  i32.load offset=20
  local.get $2
  local.get $4
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.add
  call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#set
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.tee $0
  i32.load offset=28
  i32.eqz
  if
   i32.const 10608
   i32.const 5456
   i32.const 146
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=28
  local.tee $0
  i32.eqz
  if
   i32.const 8256
   i32.const 5456
   i32.const 148
   i32.const 16
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.set $4
  i32.const 12
  i32.const 55
  call $~lib/rt/stub/__new
  i32.const 128
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
  local.tee $0
  local.get $4
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
  local.get $0
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
  local.get $0
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
  local.get $0
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256
  i32.const 12384
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/events/NetEvent/NetEvent#constructor
  call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#emitEvent
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#set (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  local.get $0
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#getKeyHash
  local.set $3
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $0
  i32.load offset=4
  local.tee $1
  local.get $2
  i64.load offset=24
  call $~lib/polyfills/bswap<u64>
  i64.store
  local.get $1
  local.get $2
  i64.load offset=16
  call $~lib/polyfills/bswap<u64>
  i64.store offset=8
  local.get $1
  local.get $2
  i64.load offset=8
  call $~lib/polyfills/bswap<u64>
  i64.store offset=16
  local.get $1
  local.get $2
  i64.load
  call $~lib/polyfills/bswap<u64>
  i64.store offset=24
  local.get $3
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#_internalSetStorageAt
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_spendAllowance (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  local.get $1
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
  if
   return
  end
  local.get $0
  i32.load offset=16
  local.tee $4
  local.get $1
  call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#indexOf@override"
  i32.const -1
  i32.eq
  if
   local.get $4
   local.get $1
   local.get $1
   local.get $4
   i32.load16_u offset=12
   call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#constructor
   call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#set"
   drop
  end
  local.get $4
  local.get $1
  call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#get"
  local.tee $4
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#get
  local.set $5
  i64.const -1
  i64.const -1
  i64.const -1
  i64.const -1
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  local.set $6
  local.get $5
  i64.load
  local.get $6
  i64.load
  i64.eq
  if (result i32)
   local.get $5
   i64.load offset=8
   local.get $6
   i64.load offset=8
   i64.eq
  else
   i32.const 0
  end
  if (result i32)
   local.get $5
   i64.load offset=16
   local.get $6
   i64.load offset=16
   i64.eq
  else
   i32.const 0
  end
  if (result i32)
   local.get $5
   i64.load offset=24
   local.get $6
   i64.load offset=24
   i64.eq
  else
   i32.const 0
  end
  if
   return
  end
  local.get $5
  local.get $3
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.lt
  if
   i32.const 12432
   i32.const 10992
   i32.const 681
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $4
  local.get $2
  local.get $5
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.sub
  call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#set
  local.get $0
  i32.load offset=16
  local.tee $0
  local.get $1
  call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#indexOf@override"
  i32.const -1
  i32.eq
  if
   local.get $0
   local.get $1
   local.get $1
   local.get $0
   i32.load16_u offset=12
   call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#constructor
   call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#set"
   drop
  end
  local.get $0
  local.get $1
  local.get $4
  call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#set"
  i32.const 8
  i32.sub
  i32.load
  i32.const 40
  i32.ne
  if
   i32.const 12496
   i32.const 12560
   i32.const 26
   i32.const 22
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytesWithLength (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  local.get $1
  i32.load offset=8
  local.tee $3
  i32.const 4
  i32.add
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#allocSafe
  local.get $0
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU32
  loop $for-loop|0
   local.get $2
   local.get $3
   i32.lt_u
   if
    local.get $0
    local.get $1
    local.get $2
    call $~lib/typedarray/Uint8Array#__get
    call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU8
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_callOnOP20Received (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 i32)
  (local $5 i32)
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.tee $4
  i32.load offset=28
  i32.eqz
  if
   i32.const 10608
   i32.const 5456
   i32.const 146
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $4
  i32.load offset=28
  local.tee $4
  i32.eqz
  if
   i32.const 8256
   i32.const 5456
   i32.const 148
   i32.const 16
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $4
  i32.load offset=4
  local.set $5
  local.get $3
  i32.load offset=8
  i32.const 104
  i32.add
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
  local.tee $4
  i32.const -666993220
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU32
  local.get $4
  local.get $5
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
  local.get $4
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
  local.get $4
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256
  local.get $4
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytesWithLength
  local.get $1
  i32.eqz
  if
   i32.const 12704
   i32.const 5456
   i32.const 412
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
  i32.load
  local.get $4
  i32.load offset=8
  i32.load
  local.get $4
  i32.load offset=4
  i32.load offset=8
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/FOUR_BYTES_UINT8ARRAY_MEMORY_CACHE
  i32.load
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/callContract
  local.set $0
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/FOUR_BYTES_UINT8ARRAY_MEMORY_CACHE
  i32.load offset=4
  i32.load
  call $~lib/polyfills/bswap<u32>
  local.tee $1
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.set $2
  i32.const 0
  local.get $1
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/getCallResult
  local.get $0
  if
   local.get $0
   local.get $2
   local.get $1
   call $~lib/@btc-vision/btc-runtime/runtime/env/global/env_exit
  end
  i32.const 1
  global.set $~argumentsLength
  local.get $2
  call $~lib/typedarray/Uint8Array.wrap@varargs
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#constructor
  local.set $1
  i32.const 8
  i32.const 56
  call $~lib/rt/stub/__new
  local.tee $2
  local.get $0
  i32.eqz
  i32.store8
  local.get $2
  local.get $1
  i32.store offset=4
  local.get $2
  i32.load offset=4
  i32.load
  i32.load offset=8
  i32.const 4
  i32.lt_s
  if
   i32.const 12800
   i32.const 10992
   i32.const 714
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $2
  i32.load offset=4
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU32
  i32.const -666993220
  i32.ne
  if
   i32.const 12800
   i32.const 10992
   i32.const 719
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_safeTransfer (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32)
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_transfer
  local.get $2
  i32.load
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/getAccountType
  if
   local.get $1
   local.get $2
   local.get $3
   local.get $4
   call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_callOnOP20Received
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#createApprovedEvent (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  i32.const 12
  i32.const 57
  call $~lib/rt/stub/__new
  i32.const 96
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
  local.tee $3
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
  local.get $3
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
  local.get $3
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256
  i32.const 13008
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/events/NetEvent/NetEvent#constructor
  call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#emitEvent
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_increaseAllowance (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address.zero
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
  if
   i32.const 12880
   i32.const 10992
   i32.const 860
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address.zero
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
  if
   i32.const 12944
   i32.const 10992
   i32.const 863
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=16
  local.tee $0
  local.get $1
  call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#indexOf@override"
  i32.const -1
  i32.eq
  if
   local.get $0
   local.get $1
   local.get $1
   local.get $0
   i32.load16_u offset=12
   call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#constructor
   call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#set"
   drop
  end
  local.get $0
  local.get $1
  call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#get"
  local.tee $4
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#get
  local.tee $5
  local.get $3
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.add
  local.tee $0
  local.get $5
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.lt
  if
   i64.const -1
   i64.const -1
   i64.const -1
   i64.const -1
   call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
   local.set $0
  end
  local.get $4
  local.get $2
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#set
  local.get $1
  local.get $2
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#createApprovedEvent
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_decreaseAllowance (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 i32)
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address.zero
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
  if
   i32.const 12880
   i32.const 10992
   i32.const 885
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address.zero
  call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
  if
   i32.const 12944
   i32.const 10992
   i32.const 888
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=16
  local.tee $0
  local.get $1
  call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#indexOf@override"
  i32.const -1
  i32.eq
  if
   local.get $0
   local.get $1
   local.get $1
   local.get $0
   i32.load16_u offset=12
   call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#constructor
   call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#set"
   drop
  end
  local.get $0
  local.get $1
  call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#get"
  local.tee $0
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#get
  local.tee $4
  local.get $3
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.lt
  if (result i32)
   i64.const 0
   i64.const 0
   i64.const 0
   i64.const 0
   call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  else
   local.get $4
   local.get $3
   call $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.sub
  end
  local.set $3
  local.get $0
  local.get $2
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#set
  local.get $1
  local.get $2
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#createApprovedEvent
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#verifySignature (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (result i32)
  (local $4 i32)
  local.get $0
  i32.load offset=28
  i32.eqz
  if
   i32.const 10608
   i32.const 5456
   i32.const 146
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=28
  local.tee $0
  i32.eqz
  if
   i32.const 8256
   i32.const 5456
   i32.const 148
   i32.const 16
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load
  i64.load
  i64.const 1
  i64.and
  i32.wrap_i64
  if (result i32)
   local.get $2
   i32.load offset=8
   i32.const 64
   i32.ne
   if
    i32.const 13264
    i32.const 5456
    i32.const 1020
    i32.const 38
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $3
   i32.load offset=8
   i32.const 32
   i32.ne
   if
    i32.const 13344
    i32.const 5456
    i32.const 1021
    i32.const 33
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   i32.const 0
   i32.const 33
   call $~lib/typedarray/Uint8Array#constructor
   local.tee $0
   i32.load offset=4
   local.tee $4
   i32.const 0
   i32.store8
   local.get $4
   i32.const 1
   i32.add
   local.get $1
   i32.load offset=20
   i32.load offset=4
   i32.const 32
   memory.copy
   local.get $0
   i32.load
   local.get $2
   i32.load
   local.get $3
   i32.load
   call $~lib/@btc-vision/btc-runtime/runtime/env/global/verifySignature
   i32.const 1
   i32.eq
  else
   local.get $1
   i32.load offset=16
   i32.eqz
   if
    i32.const 0
    i32.const 33
    call $~lib/typedarray/Uint8Array#constructor
    local.tee $0
    i32.load offset=4
    local.tee $4
    i32.const 0
    i32.store8
    local.get $4
    i32.const 1
    i32.add
    local.get $1
    i32.load offset=4
    i32.const 32
    memory.copy
    i32.const 0
    i32.const 1313
    call $~lib/typedarray/Uint8Array#constructor
    local.set $4
    local.get $0
    i32.load
    local.get $4
    i32.load
    call $~lib/@btc-vision/btc-runtime/runtime/env/global/loadMLDSA
    local.get $4
    i32.load offset=4
    i32.load8_u
    i32.eqz
    if
     i32.const 13648
     i32.const 13728
     i32.const 352
     i32.const 9
     call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
     unreachable
    end
    i32.const 1
    global.set $~argumentsLength
    local.get $1
    local.get $4
    i32.const 1
    call $~lib/typedarray/Uint8Array#slice@varargs
    i32.store offset=16
   end
   local.get $1
   i32.load offset=16
   local.tee $0
   i32.eqz
   if
    i32.const 8256
    i32.const 2752
    i32.const 87
    i32.const 16
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $0
   i32.load offset=8
   i32.const 1312
   i32.ne
   if
    i32.const 13856
    i32.const 5456
    i32.const 770
    i32.const 13
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $2
   i32.load offset=8
   i32.const 2420
   i32.ne
   if
    i32.const 13952
    i32.const 5456
    i32.const 774
    i32.const 13
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $3
   i32.load offset=8
   i32.const 32
   i32.ne
   if
    i32.const 13344
    i32.const 5456
    i32.const 778
    i32.const 13
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   i32.const 0
   local.get $0
   i32.load offset=8
   i32.const 2
   i32.add
   call $~lib/typedarray/Uint8Array#constructor
   local.tee $1
   i32.load offset=4
   local.tee $4
   i32.const 1
   i32.store8
   local.get $4
   i32.const 0
   i32.store8 offset=1
   local.get $4
   i32.const 2
   i32.add
   local.get $0
   i32.load offset=4
   local.get $0
   i32.load offset=8
   memory.copy
   local.get $1
   i32.load
   local.get $2
   i32.load
   local.get $3
   i32.load
   call $~lib/@btc-vision/btc-runtime/runtime/env/global/verifySignature
   i32.const 1
   i32.eq
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_verifySignature (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i64) (param $6 i32)
  (local $7 i32)
  (local $8 i32)
  local.get $6
  i32.load offset=8
  i32.const 64
  i32.ne
  if
   i32.const 13056
   i32.const 10992
   i32.const 804
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.tee $7
  i32.load offset=24
  i32.eqz
  if
   i32.const 13136
   i32.const 5456
   i32.const 119
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $7
  i32.load offset=24
  local.tee $7
  i32.eqz
  if
   i32.const 8256
   i32.const 5456
   i32.const 121
   i32.const 16
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $5
  local.get $7
  i64.load offset=8
  i64.lt_u
  if
   i32.const 13200
   i32.const 10992
   i32.const 807
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=44
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#get
  local.set $7
  i32.const 168
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
  local.tee $8
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytesU8Array
  local.get $8
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
  local.get $8
  local.get $3
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
  local.get $8
  local.get $4
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256
  local.get $8
  local.get $7
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256
  local.get $8
  i32.const 8
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#allocSafe
  local.get $8
  i32.load
  local.tee $1
  i32.const 31
  i32.shr_u
  local.get $8
  i32.load offset=4
  local.tee $3
  i32.load offset=8
  local.get $1
  i32.const 8
  i32.add
  i32.lt_s
  i32.or
  if
   i32.const 2176
   i32.const 2416
   i32.const 174
   i32.const 7
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $1
  local.get $3
  i32.load offset=4
  i32.add
  local.get $5
  call $~lib/polyfills/bswap<u64>
  i64.store
  local.get $8
  local.get $8
  i32.load
  i32.const 8
  i32.add
  i32.store
  local.get $8
  i32.load offset=8
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/sha256
  local.set $1
  i32.const 66
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
  local.tee $3
  i32.const 2
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#allocSafe
  local.get $3
  i32.load
  local.tee $4
  i32.const 31
  i32.shr_u
  local.get $3
  i32.load offset=4
  local.tee $8
  i32.load offset=8
  local.get $4
  i32.const 2
  i32.add
  i32.lt_s
  i32.or
  if
   i32.const 2176
   i32.const 2416
   i32.const 135
   i32.const 7
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $4
  local.get $8
  i32.load offset=4
  i32.add
  i32.const 281
  i32.store16
  local.get $3
  local.get $3
  i32.load
  i32.const 2
  i32.add
  i32.store
  local.get $3
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_buildDomainSeparator
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytes
  local.get $3
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytes
  local.get $3
  i32.load offset=8
  call $~lib/@btc-vision/btc-runtime/runtime/env/global/sha256
  local.set $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $2
  local.get $6
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#verifySignature
  i32.eqz
  if
   i32.const 14048
   i32.const 10992
   i32.const 832
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=44
  local.get $2
  local.get $7
  i64.const 1
  i64.const 0
  i64.const 0
  i64.const 0
  call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  call $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.add
  call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#set
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#execute (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  block $folding-inner7
   block $folding-inner6
    block $folding-inner5
     block $folding-inner4
      block $folding-inner3
       local.get $1
       i32.const 360839196
       i32.eq
       if
        local.get $0
        i32.load offset=32
        call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#get:value
        call $~lib/string/String.UTF8.byteLength
        i32.const 4
        i32.add
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
        local.tee $1
        local.get $0
        i32.load offset=32
        call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#get:value
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeStringWithLength
        br $folding-inner3
       end
       local.get $1
       i32.const 630619301
       i32.eq
       if
        local.get $0
        i32.load offset=40
        call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#get:value
        call $~lib/string/String.UTF8.byteLength
        i32.const 4
        i32.add
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
        local.tee $1
        local.get $0
        i32.load offset=40
        call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#get:value
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeStringWithLength
        br $folding-inner3
       end
       local.get $1
       i32.const -1431678779
       i32.eq
       if
        local.get $0
        i32.load offset=36
        call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#get:value
        call $~lib/string/String.UTF8.byteLength
        i32.const 4
        i32.add
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
        local.tee $1
        local.get $0
        i32.load offset=36
        call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#get:value
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeStringWithLength
        br $folding-inner3
       end
       local.get $1
       i32.const -1148959680
       i32.eq
       if
        i32.const 1
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
        local.set $1
        local.get $0
        i32.load offset=28
        local.tee $0
        call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue
        local.get $1
        local.get $0
        i32.load offset=12
        i64.load
        i32.wrap_i64
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU8
        br $folding-inner3
       end
       local.get $1
       i32.const -1553464786
       i32.eq
       if
        i32.const 32
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
        local.set $1
        local.get $0
        i32.load offset=12
        local.tee $0
        call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue
        local.get $1
        local.get $0
        i32.load offset=12
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256
        br $folding-inner3
       end
       local.get $1
       i32.const 2106413081
       i32.eq
       if
        i32.const 32
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
        local.set $1
        local.get $0
        i32.load offset=24
        local.tee $0
        call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue
        local.get $1
        local.get $0
        i32.load offset=12
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256
        br $folding-inner3
       end
       local.get $1
       i32.const -239107872
       i32.eq
       if
        i32.const 32
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
        local.tee $1
        local.get $0
        call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_buildDomainSeparator
        call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytes
        br $folding-inner3
       end
       block $folding-inner2
        local.get $1
        i32.const 1531377910
        i32.eq
        if
         block $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_balanceOf$1065 (result i32)
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
          local.set $1
          local.get $0
          i32.load offset=20
          local.get $1
          call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#encodePointer
          local.set $2
          global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#hasStorageAt
          i32.eqz
          if
           i64.const 0
           i64.const 0
           i64.const 0
           i64.const 0
           call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
           br $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_balanceOf$1065
          end
          local.get $0
          i32.load offset=20
          local.get $1
          call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#get
         end
         local.set $0
         br $folding-inner2
        end
        local.get $1
        i32.const -159233179
        i32.eq
        if
         local.get $0
         i32.load offset=44
         local.get $2
         call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
         call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#get
         local.set $0
         br $folding-inner2
        end
        local.get $1
        i32.const -664487990
        i32.eq
        if
         i32.const 32
         call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
         local.set $1
         local.get $2
         call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
         local.set $3
         local.get $2
         call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
         local.set $2
         local.get $0
         i32.load offset=16
         local.tee $0
         local.get $3
         call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#indexOf@override"
         i32.const -1
         i32.eq
         if
          local.get $0
          local.get $3
          local.get $3
          local.get $0
          i32.load16_u offset=12
          call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#constructor
          call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#set"
          drop
         end
         local.get $1
         local.get $0
         local.get $3
         call $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#get"
         local.get $2
         call $~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>#get
         call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256
         local.get $1
         return
        end
        local.get $1
        i32.const 998829911
        i32.eq
        if
         local.get $0
         i32.const 8
         i32.sub
         i32.load
         i32.const 34
         i32.eq
         if
          local.get $0
          call $PredToken/PredToken#whenNotPaused
         end
         global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
         local.tee $1
         i32.load offset=28
         i32.eqz
         br_if $folding-inner5
         local.get $1
         i32.load offset=28
         local.tee $1
         i32.eqz
         br_if $folding-inner6
         local.get $0
         local.get $1
         i32.load offset=4
         local.get $2
         call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
         local.get $2
         call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU256
         call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_transfer
         br $folding-inner7
        end
        block $folding-inner1
         local.get $1
         i32.const 1265010151
         i32.eq
         if
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
          local.set $1
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
          local.set $3
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU256
          local.set $2
          global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
          local.tee $4
          i32.load offset=28
          i32.eqz
          br_if $folding-inner5
          local.get $4
          i32.load offset=28
          local.tee $4
          i32.eqz
          br_if $folding-inner1
          local.get $0
          local.get $1
          local.get $4
          i32.load offset=4
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_spendAllowance
          local.get $0
          local.get $1
          local.get $3
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_transfer
          br $folding-inner4
         end
         local.get $1
         i32.const -160920984
         i32.eq
         if
          global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
          local.tee $1
          i32.load offset=28
          i32.eqz
          br_if $folding-inner5
          local.get $1
          i32.load offset=28
          local.tee $1
          i32.eqz
          br_if $folding-inner1
          local.get $0
          local.get $1
          i32.load offset=4
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU256
          local.get $2
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU32
          i32.const 0
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readBytes
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_safeTransfer
          br $folding-inner4
         end
         local.get $1
         i32.const 1769024148
         i32.eq
         if
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
          local.set $1
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
          local.set $3
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU256
          local.set $4
          local.get $2
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU32
          i32.const 0
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readBytes
          local.set $2
          global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
          local.tee $5
          i32.load offset=28
          i32.eqz
          br_if $folding-inner5
          local.get $5
          i32.load offset=28
          local.tee $5
          i32.eqz
          br_if $folding-inner6
          local.get $0
          local.get $1
          local.get $5
          i32.load offset=4
          local.get $4
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_spendAllowance
          local.get $0
          local.get $1
          local.get $3
          local.get $4
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_safeTransfer
          br $folding-inner7
         end
         local.get $1
         i32.const -1922803933
         i32.eq
         if
          global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
          local.tee $1
          i32.load offset=28
          i32.eqz
          br_if $folding-inner5
          local.get $1
          i32.load offset=28
          local.tee $1
          i32.eqz
          br_if $folding-inner1
          local.get $0
          local.get $1
          i32.load offset=4
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU256
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_increaseAllowance
          br $folding-inner4
         end
         local.get $1
         i32.const -1509908001
         i32.eq
         if
          global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
          local.tee $1
          i32.load offset=28
          i32.eqz
          br_if $folding-inner5
          local.get $1
          i32.load offset=28
          local.tee $1
          i32.eqz
          br_if $folding-inner1
          local.get $0
          local.get $1
          i32.load offset=4
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU256
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_decreaseAllowance
          br $folding-inner4
         end
         local.get $1
         i32.const 930580552
         i32.eq
         if
          i32.const 32
          call $~lib/array/Array<u8>#constructor
          local.set $1
          loop $for-loop|0
           local.get $3
           i32.const 32
           i32.lt_s
           if
            local.get $1
            local.get $3
            local.get $2
            call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU8
            call $~lib/array/Array<u8>#__set
            local.get $3
            i32.const 1
            i32.add
            local.set $3
            br $for-loop|0
           end
          end
          i32.const 32
          call $~lib/array/Array<u8>#constructor
          local.set $4
          i32.const 0
          local.set $3
          loop $for-loop|1
           local.get $3
           i32.const 32
           i32.lt_s
           if
            local.get $4
            local.get $3
            local.get $2
            call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU8
            call $~lib/array/Array<u8>#__set
            local.get $3
            i32.const 1
            i32.add
            local.set $3
            br $for-loop|1
           end
          end
          local.get $0
          i32.const 4432
          local.get $4
          local.get $1
          call $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/ExtendedAddress#constructor
          local.tee $1
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
          local.tee $3
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU256
          local.tee $4
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU64
          local.get $2
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU32
          i32.const 0
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readBytes
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_verifySignature
          local.get $0
          local.get $1
          local.get $3
          local.get $4
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_increaseAllowance
          br $folding-inner7
         end
         local.get $1
         i32.const 1567548012
         i32.eq
         if
          i32.const 32
          call $~lib/array/Array<u8>#constructor
          local.set $1
          loop $for-loop|00
           local.get $3
           i32.const 32
           i32.lt_s
           if
            local.get $1
            local.get $3
            local.get $2
            call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU8
            call $~lib/array/Array<u8>#__set
            local.get $3
            i32.const 1
            i32.add
            local.set $3
            br $for-loop|00
           end
          end
          i32.const 32
          call $~lib/array/Array<u8>#constructor
          local.set $4
          i32.const 0
          local.set $3
          loop $for-loop|11
           local.get $3
           i32.const 32
           i32.lt_s
           if
            local.get $4
            local.get $3
            local.get $2
            call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU8
            call $~lib/array/Array<u8>#__set
            local.get $3
            i32.const 1
            i32.add
            local.set $3
            br $for-loop|11
           end
          end
          local.get $0
          i32.const 4544
          local.get $4
          local.get $1
          call $~lib/@btc-vision/btc-runtime/runtime/types/ExtendedAddress/ExtendedAddress#constructor
          local.tee $1
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readAddress
          local.tee $3
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU256
          local.tee $4
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU64
          local.get $2
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU32
          i32.const 0
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readBytes
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_verifySignature
          local.get $0
          local.get $1
          local.get $3
          local.get $4
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_decreaseAllowance
          br $folding-inner7
         end
         local.get $1
         i32.const 814599775
         i32.eq
         if
          global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
          local.tee $1
          i32.load offset=28
          i32.eqz
          br_if $folding-inner5
          local.get $1
          i32.load offset=28
          local.tee $1
          i32.eqz
          br_if $folding-inner1
          local.get $1
          i32.load offset=4
          local.set $1
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU256
          local.set $2
          local.get $1
          call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address.zero
          call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
          if
           i32.const 12176
           i32.const 10992
           i32.const 935
           i32.const 13
           call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
           unreachable
          end
          local.get $0
          i32.load offset=20
          local.get $1
          call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#get
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.sub
          local.set $3
          local.get $0
          i32.load offset=20
          local.get $1
          local.get $3
          call $~lib/@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap/AddressMemoryMap#set
          local.get $0
          i32.load offset=12
          local.tee $3
          call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue
          local.get $3
          local.get $3
          i32.load offset=12
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.sub
          i32.store offset=12
          global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
          local.get $3
          i32.load
          local.get $3
          call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#get:__value
          call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#_internalSetStorageAt
          local.get $0
          local.get $3
          i32.store offset=12
          i32.const 12
          i32.const 58
          call $~lib/rt/stub/__new
          i32.const 64
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
          local.tee $3
          local.get $1
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeAddress
          local.get $3
          local.get $2
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256
          i32.const 14112
          local.get $3
          call $~lib/@btc-vision/btc-runtime/runtime/events/NetEvent/NetEvent#constructor
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#emitEvent
          br $folding-inner4
         end
         local.get $1
         i32.const -66252452
         i32.eq
         if
          local.get $0
          i32.load offset=32
          call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#get:value
          local.set $3
          local.get $0
          i32.load offset=40
          call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#get:value
          local.set $4
          local.get $0
          i32.load offset=36
          call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#get:value
          local.set $5
          local.get $0
          call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_buildDomainSeparator
          local.set $1
          local.get $3
          call $~lib/string/String.UTF8.byteLength
          local.set $2
          local.get $4
          call $~lib/string/String.UTF8.byteLength
          local.set $6
          local.get $5
          call $~lib/string/String.UTF8.byteLength
          local.set $7
          local.get $1
          i32.load offset=8
          local.get $2
          local.get $6
          i32.add
          local.get $7
          i32.add
          i32.add
          i32.const 81
          i32.add
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
          local.tee $2
          local.get $3
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeStringWithLength
          local.get $2
          local.get $4
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeStringWithLength
          local.get $2
          local.get $5
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeStringWithLength
          local.get $0
          i32.load offset=28
          local.tee $3
          call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue
          local.get $2
          local.get $3
          i32.load offset=12
          i64.load
          i32.wrap_i64
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU8
          local.get $0
          i32.load offset=12
          local.tee $0
          call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue
          local.get $2
          local.get $0
          i32.load offset=12
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256
          local.get $2
          local.get $1
          call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeBytesWithLength
          local.get $2
          return
         end
         local.get $1
         call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#execute
         return
        end
        br $folding-inner6
       end
       i32.const 32
       call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
       local.tee $1
       local.get $0
       call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#writeU256
      end
      local.get $1
      return
     end
     i32.const 0
     call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
     return
    end
    i32.const 10608
    i32.const 5456
    i32.const 146
    i32.const 13
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   i32.const 8256
   i32.const 5456
   i32.const 148
   i32.const 16
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  i32.const 0
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesWriter/BytesWriter#constructor
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readStringWithLength (param $0 i32) (result i32)
  local.get $0
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU32
  i32.const 1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readBytes
  i32.load
  local.tee $0
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  call $~lib/string/String.UTF8.decodeUnsafe
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#save (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i64)
  (local $4 i32)
  (local $5 i32)
  (local $6 i64)
  (local $7 i32)
  (local $8 i32)
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $0
  i64.const 0
  call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#getPointer
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#getStorageAt
  local.tee $1
  i32.const 0
  call $~lib/typedarray/Uint8Array#__get
  i32.const 24
  i32.shl
  local.get $1
  i32.const 1
  call $~lib/typedarray/Uint8Array#__get
  i32.const 16
  i32.shl
  i32.or
  local.get $1
  i32.const 2
  call $~lib/typedarray/Uint8Array#__get
  i32.const 8
  i32.shl
  i32.or
  local.get $1
  i32.const 3
  call $~lib/typedarray/Uint8Array#__get
  i32.or
  local.tee $1
  if
   local.get $1
   i32.const 28
   i32.sub
   i32.const 0
   local.get $1
   i32.const 28
   i32.gt_u
   select
   local.tee $1
   i32.const 31
   i32.add
   i32.const 5
   i32.shr_u
   i64.extend_i32_u
   i64.const 1
   i64.add
   i64.const 1
   local.get $1
   select
   local.set $6
   loop $for-loop|0
    local.get $3
    local.get $6
    i64.lt_u
    if
     global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
     local.get $0
     local.get $3
     call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#getPointer
     i32.const 0
     i32.const 32
     call $~lib/typedarray/Uint8Array#constructor
     call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#_internalSetStorageAt
     local.get $3
     i64.const 1
     i64.add
     local.set $3
     br $for-loop|0
    end
   end
  end
  local.get $0
  i32.load offset=12
  i32.const 2
  global.set $~argumentsLength
  call $~lib/string/String.UTF8.encode@varargs
  local.tee $1
  i32.const 20
  i32.sub
  i32.load offset=16
  local.tee $7
  local.get $0
  i32.load
  i32.gt_u
  if
   local.get $0
   call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#getClassName@override
   local.get $0
   i32.load
   call $~lib/util/number/utoa32
   local.set $0
   i32.const 14432
   i32.const 0
   i32.const 14720
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   i32.const 14432
   i32.const 2
   local.get $0
   call $~lib/staticarray/StaticArray<~lib/string/String>#__uset
   i32.const 14432
   call $~lib/staticarray/StaticArray<~lib/string/String>#join
   i32.const 14480
   i32.const 111
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $7
  i32.eqz
  if
   global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
   local.get $0
   i64.const 0
   call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#getPointer
   i32.const 0
   i32.const 32
   call $~lib/typedarray/Uint8Array#constructor
   call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#_internalSetStorageAt
   return
  end
  i32.const 0
  i32.const 32
  call $~lib/typedarray/Uint8Array#constructor
  local.tee $8
  i32.const 0
  local.get $7
  i32.const 24
  i32.shr_u
  call $~lib/typedarray/Uint8Array#__set
  local.get $8
  i32.const 1
  local.get $7
  i32.const 16
  i32.shr_u
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  local.get $8
  i32.const 2
  local.get $7
  i32.const 8
  i32.shr_u
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  local.get $8
  i32.const 3
  local.get $7
  i32.const 255
  i32.and
  call $~lib/typedarray/Uint8Array#__set
  i32.const 1
  global.set $~argumentsLength
  local.get $1
  call $~lib/typedarray/Uint8Array.wrap@varargs
  local.set $5
  i32.const 28
  local.get $7
  local.get $7
  i32.const 28
  i32.ge_u
  select
  local.set $4
  loop $for-loop|00
   local.get $2
   local.get $4
   i32.lt_u
   if
    local.get $8
    local.get $2
    i32.const 4
    i32.add
    local.get $5
    local.get $2
    call $~lib/typedarray/Uint8Array#__get
    call $~lib/typedarray/Uint8Array#__set
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|00
   end
  end
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.get $0
  i64.const 0
  call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#getPointer
  local.get $8
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#_internalSetStorageAt
  local.get $7
  local.get $4
  i32.sub
  local.set $2
  i64.const 1
  local.set $3
  loop $while-continue|1
   local.get $2
   if
    i32.const 0
    i32.const 32
    call $~lib/typedarray/Uint8Array#constructor
    local.set $7
    i32.const 32
    local.get $2
    local.get $2
    i32.const 32
    i32.ge_u
    select
    local.set $8
    i32.const 0
    local.set $1
    loop $for-loop|2
     local.get $1
     local.get $8
     i32.lt_u
     if
      local.get $7
      local.get $1
      local.get $5
      local.get $1
      local.get $4
      i32.add
      call $~lib/typedarray/Uint8Array#__get
      call $~lib/typedarray/Uint8Array#__set
      local.get $1
      i32.const 1
      i32.add
      local.set $1
      br $for-loop|2
     end
    end
    global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
    local.get $0
    local.get $3
    call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#getPointer
    local.get $7
    call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#_internalSetStorageAt
    local.get $2
    local.get $8
    i32.sub
    local.set $2
    local.get $4
    local.get $8
    i32.add
    local.set $4
    local.get $3
    i64.const 1
    i64.add
    local.set $3
    br $while-continue|1
   end
  end
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#instantiate (param $0 i32) (param $1 i32)
  (local $2 i32)
  local.get $0
  i32.load offset=24
  local.tee $2
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#ensureValue
  local.get $2
  i32.load offset=12
  local.tee $2
  i64.load offset=24
  local.get $2
  i64.load offset=16
  local.get $2
  i64.load
  local.get $2
  i64.load offset=8
  i64.or
  i64.or
  i64.or
  i64.eqz
  i32.eqz
  if
   i32.const 14240
   i32.const 10992
   i32.const 177
   i32.const 46
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.tee $2
  i32.load offset=28
  i32.eqz
  if
   i32.const 10608
   i32.const 5456
   i32.const 146
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $2
  i32.load offset=28
  local.tee $2
  i32.eqz
  if
   i32.const 8256
   i32.const 5456
   i32.const 148
   i32.const 16
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $2
  i32.load offset=4
  call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP_NET/OP_NET#onlyDeployer
  local.get $1
  i32.load8_u offset=4
  i32.const 32
  i32.gt_u
  if
   i32.const 14304
   i32.const 10992
   i32.const 179
   i32.const 35
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  i32.load offset=24
  local.get $1
  i32.load
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#set:value
  local.get $0
  i32.load offset=28
  block $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.fromU32|inlined.4 (result i32)
   local.get $1
   i32.load8_u offset=4
   local.tee $2
   i32.eqz
   if
    i64.const 0
    i64.const 0
    i64.const 0
    i64.const 0
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.fromU32|inlined.4
   end
   local.get $2
   i32.const 1
   i32.eq
   if
    i64.const 1
    i64.const 0
    i64.const 0
    i64.const 0
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
    br $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.fromU32|inlined.4
   end
   local.get $2
   i64.extend_i32_u
   i64.const 0
   i64.const 0
   i64.const 0
   call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
  end
  call $~lib/@btc-vision/btc-runtime/runtime/storage/StoredU256/StoredU256#set:value
  local.get $0
  i32.load offset=32
  local.tee $2
  local.get $1
  i32.load offset=8
  i32.store offset=12
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#save
  local.get $0
  i32.load offset=40
  local.tee $2
  local.get $1
  i32.load offset=12
  i32.store offset=12
  local.get $2
  call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#save
  local.get $0
  i32.load offset=36
  local.tee $0
  local.get $1
  i32.load offset=16
  i32.store offset=12
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#save
 )
 (func $PredToken/PredToken#onDeployment (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU256
  local.set $3
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readU8
  local.set $4
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readStringWithLength
  local.set $2
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/buffer/BytesReader/BytesReader#readStringWithLength
  local.set $5
  i32.const 20
  i32.const 59
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  i32.store
  local.get $1
  i32.const 0
  i32.store8 offset=4
  local.get $1
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 0
  i32.store offset=12
  local.get $1
  i32.const 0
  i32.store offset=16
  local.get $1
  local.get $3
  i32.store
  local.get $1
  local.get $4
  i32.store8 offset=4
  local.get $1
  local.get $2
  i32.store offset=8
  local.get $1
  local.get $5
  i32.store offset=12
  local.get $1
  i32.const 2032
  i32.store offset=16
  local.get $0
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#instantiate
  block $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.div$167 (result i32)
   i64.const 2
   i64.const 0
   i64.const 0
   i64.const 0
   call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
   local.tee $1
   i64.load offset=24
   local.get $1
   i64.load offset=16
   local.get $1
   i64.load
   local.get $1
   i64.load offset=8
   i64.or
   i64.or
   i64.or
   i64.eqz
   if
    i32.const 14640
    i32.const 7360
    i32.const 265
    i32.const 13
    call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
    unreachable
   end
   local.get $3
   i64.load offset=24
   local.get $3
   i64.load offset=16
   local.get $3
   i64.load
   local.get $3
   i64.load offset=8
   i64.or
   i64.or
   i64.or
   i64.eqz
   if
    i64.const 0
    i64.const 0
    i64.const 0
    i64.const 0
    call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256#constructor
    br $__inlined_func$~lib/@btc-vision/btc-runtime/runtime/types/SafeMath/SafeMath.div$167
   end
   local.get $3
   local.get $1
   call $~lib/@btc-vision/as-bignum/assembly/integer/u256/u256.div
  end
  local.set $1
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.tee $2
  i32.load offset=28
  i32.eqz
  if
   i32.const 10608
   i32.const 5456
   i32.const 146
   i32.const 13
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $2
  i32.load offset=28
  local.tee $2
  i32.eqz
  if
   i32.const 8256
   i32.const 5456
   i32.const 148
   i32.const 16
   call $~lib/@btc-vision/btc-runtime/runtime/abort/abort/revertOnError
   unreachable
  end
  local.get $0
  local.get $2
  i32.load offset=8
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/contracts/OP20/OP20#_mint
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/ReentrancyGuard#isSelectorExcluded@override (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  i32.const 8
  i32.sub
  i32.load
  local.tee $0
  i32.const 35
  i32.eq
  local.get $0
  i32.const 34
  i32.eq
  i32.or
  if
   local.get $1
   i32.const -664487990
   i32.eq
   local.get $1
   i32.const 1531377910
   i32.eq
   i32.or
   local.get $1
   i32.const -1553464786
   i32.eq
   i32.or
   local.get $1
   i32.const 360839196
   i32.eq
   i32.or
   local.get $1
   i32.const 630619301
   i32.eq
   i32.or
   local.get $1
   i32.const -1148959680
   i32.eq
   i32.or
   local.get $1
   i32.const -159233179
   i32.eq
   i32.or
   local.get $1
   i32.const -239107872
   i32.eq
   i32.or
   local.get $1
   i32.const -66252452
   i32.eq
   i32.or
   local.get $1
   i32.const 2106413081
   i32.eq
   i32.or
   local.get $1
   i32.const -1431678779
   i32.eq
   i32.or
   if (result i32)
    i32.const 1
   else
    local.get $1
    call $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/ReentrancyGuard#isSelectorExcluded
   end
   return
  end
  local.get $1
  call $~lib/@btc-vision/btc-runtime/runtime/contracts/ReentrancyGuard/ReentrancyGuard#isSelectorExcluded
 )
 (func $~lib/@btc-vision/btc-runtime/runtime/storage/BaseStoredString/BaseStoredString#getClassName@override (param $0 i32)
  local.get $0
  i32.const 8
  i32.sub
  i32.load
  i32.const 47
  i32.eq
  if
   return
  end
  unreachable
 )
 (func $"~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#indexOf@override" (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  local.get $0
  i32.const 8
  i32.sub
  i32.load
  drop
  local.get $0
  i32.load
  i32.load offset=12
  local.set $2
  block $"__inlined_func$~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#indexOf$168"
   local.get $0
   i32.load offset=8
   i32.const -1
   i32.ne
   if (result i32)
    local.get $0
    i32.load offset=8
    local.get $2
    i32.lt_s
   else
    i32.const 0
   end
   if
    local.get $0
    i32.load
    local.get $0
    i32.load offset=8
    call $~lib/array/Array<~lib/@btc-vision/btc-runtime/runtime/plugins/Plugin/Plugin>#__uget
    local.get $1
    call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
    if
     local.get $0
     i32.load offset=8
     local.set $2
     br $"__inlined_func$~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#indexOf$168"
    end
   end
   local.get $2
   i32.const 1
   i32.sub
   local.set $2
   loop $for-loop|0
    local.get $2
    i32.const 0
    i32.ge_s
    if
     local.get $0
     i32.load
     local.get $2
     call $~lib/array/Array<~lib/@btc-vision/btc-runtime/runtime/plugins/Plugin/Plugin>#__uget
     local.get $1
     call $~lib/@btc-vision/btc-runtime/runtime/types/Address/Address#equals
     if
      local.get $0
      local.get $2
      i32.store offset=8
      br $"__inlined_func$~lib/@btc-vision/btc-runtime/runtime/generic/Map/Map<~lib/@btc-vision/btc-runtime/runtime/types/Address/Address,~lib/@btc-vision/btc-runtime/runtime/memory/Nested/Nested<~lib/@btc-vision/as-bignum/assembly/integer/u256/u256>>#indexOf$168"
     end
     local.get $2
     i32.const 1
     i32.sub
     local.set $2
     br $for-loop|0
    end
   end
   i32.const -1
   local.set $2
  end
  local.get $2
 )
 (func $~start
  (local $0 i32)
  global.get $~started
  if
   return
  end
  i32.const 1
  global.set $~started
  call $start:~lib/@btc-vision/btc-runtime/runtime/index
  global.get $~lib/@btc-vision/btc-runtime/runtime/env/index/Blockchain
  local.tee $0
  i32.const 7488
  i32.store offset=32
  local.get $0
  call $~lib/@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment/BlockchainEnvironment#createContractIfNotExists
 )
)
