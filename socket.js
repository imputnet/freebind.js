import sys from 'syscall-napi'
import ipaddr from 'ipaddr.js'
import { Socket } from 'node:net'
import dns from 'node:dns/promises'
import { strict as assert } from 'node:assert'
import { generateRandomIP } from './ip.js'

async function initSocket(protocol, type) {
    assert(['ipv4', 'ipv6'].includes(protocol));
    assert(['tcp', 'udp'].includes(type));

    const AF_INET = 2n, AF_INET6 = 10n;
    const SOCK_STREAM = 1n, SOCK_DGRAM = 2n;

    const fd = await sys.syscall(
        sys.__NR_socket,
        ({ ipv4: AF_INET, ipv6: AF_INET6 })[ protocol ],
        ({ tcp: SOCK_STREAM, udp: SOCK_DGRAM })[ type ],
        0n
    );

    if (fd < 0n) throw 'failed creating socket';
    return fd;
}

async function enableFreebind(fd) {
    const SOL_IP = 0n, IP_FREEBIND = 15n;

    const res = await sys.syscall(
        sys.__NR_setsockopt,
        fd, SOL_IP, IP_FREEBIND,
        new Uint8Array([ 1 ]),
        1n
    );

    if (res != 0n)
        throw 'setting freebind failed';
}

// todo: createDgram
export async function createSocket(host, port, localAddress, connectOptions) {
    const addrFamily = ipaddr.parse(host).kind()
    if (connectOptions.strict !== false)
        assert(addrFamily == ipaddr.parse(localAddress).kind())

    const fd = await initSocket(addrFamily, 'tcp');
    await enableFreebind(fd);

    const sock = new Socket({ fd: Number(fd) })
    sock.connect({
       ...connectOptions,
       host, port,
       localAddress: connectOptions.familyMatching
                     ? localAddress
                     : undefined
    })

    return sock
}

async function lookup(hostname, family) {
    const OTHER_FAMILY = {4: 6, 6: 4};

    let host;
    try {
        host = await dns.lookup(hostname, { family });
    } catch {
        host = await dns.lookup(hostname, { family: OTHER_FAMILY[ family ] });
    }

    return host;
}

// `bits` defines how many bits to fill from the MSB to the LSB
// needs to be <= length of the prefix
export async function createRandomSocket(hostname, port, localCIDR, options) {
    const { bits, strict, ...connectOptions } = options;
    const { addr, kind } = generateRandomIP(localCIDR, bits);
    const family = ({ 'ipv4': 4, 'ipv6': 6 })[ kind ];

    const host = await lookup(hostname, family);
    const familyMatching = family === host.family;
    if (!familyMatching && strict !== false)
        throw 'family mismatch for addr ' + host.address

    return await createSocket(host.address, port, addr, { ...connectOptions, strict, familyMatching })
}