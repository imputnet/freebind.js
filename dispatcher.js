import { generateRandomIP } from './ip.js';
import { createRandomSocket, createSocketFromHostname } from './socket.js'
import { Agent, buildConnector } from 'undici'

// taken from `fetch-socks`, many thanks
function resolvePort(protocol, port) {
    return port ? Number.parseInt(port) : protocol === "http:" ? 80 : 443
}

export function createConnectorFromIP(ip, tlsOpts = {}, sockOpts = {}) {
    const undiciConnect = buildConnector(tlsOpts)

    return async (options, callback) => {
        let { protocol, hostname, port } = options;

        return undiciConnect({
            ...options,
            httpSocket: await createSocketFromHostname(
                hostname,
                resolvePort(protocol, port),
                ip,
                sockOpts
            )
        }, callback);
    };
}

export function createRandomStickyConnector(cidr, tlsOpts, options) {
    const { bits, ...sockOpts } = options;
    const ip = generateRandomIP(cidr, bits);
    return createConnectorFromIP(ip, tlsOpts, sockOpts);
}

export function createRandomConnector(cidr, tlsOpts = {}, sockOpts = {}) {
    const undiciConnect = buildConnector(tlsOpts)

    return async (options, callback) => {
        let { protocol, hostname, port } = options;

        return undiciConnect({
            ...options,
            httpSocket: await createRandomSocket(
                hostname,
                resolvePort(protocol, port),
                cidr,
                sockOpts
            )
        }, callback);
    };
}

export function dispatcherFromIP(ip, options = {}) {
    const { connect, ...rest } = options
    return new Agent({ ...rest, connect: createConnectorFromIP(ip, connect, rest) })    
}

export function randomStickyDispatcher(cidr, options = {}) {
    const { connect, ...rest } = options
    return new Agent({ ...rest, connect: createRandomStickyConnector(cidr, connect, rest) })
}

export function randomDispatcher(cidr, options = {}) {
    const { connect, ...rest } = options
    return new Agent({ ...rest, connect: createRandomConnector(cidr, connect, rest) })
}

