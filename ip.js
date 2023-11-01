import ip from 'ipaddr.js'
import { strict as assert } from 'node:assert'
import { randomBytes } from 'node:crypto'

function parseCIDR(cidr) {
    const [ addr, prefix ] = ip.parseCIDR(cidr)
    const bytes = addr.toByteArray();

    return {
        bytes: bytes.slice(0, Math.ceil(prefix / 8)),
        available: bytes.length * 8 - prefix,
    }
}

function generateRandomIPArray({ bytes, available }, count = available) {
    assert(Array.isArray(bytes))
    assert(count <= available)
    if (count % 8) throw 'currently, only prefixes that are multiples of 8 are supported'

    return bytes
            .concat([...randomBytes(count / 8)])
            .concat(Array((available - count) / 8).fill(0))
}

export function generateRandomIP(cidr, count) {
    const addr = ip.fromByteArray(
        generateRandomIPArray(parseCIDR(cidr), count)
    );

    return { addr: addr.toString(), kind: addr.kind() };
}