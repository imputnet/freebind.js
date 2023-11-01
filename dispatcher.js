import { createRandomSocket } from './socket.js'
import { Agent, buildConnector } from 'undici'

// taken from `fetch-socks`, many thanks
function resolvePort(protocol, port) {
    return port ? Number.parseInt(port) : protocol === "http:" ? 80 : 443
}

export function createRandomConnector(cidr, bits, tlsOpts = {}) {
    const undiciConnect = buildConnector(tlsOpts)

    return async (options, callback) => {
        let { protocol, hostname, port } = options;

        return undiciConnect({
            ...options,
            httpSocket: await createRandomSocket(
                hostname,
                resolvePort(protocol, port),
                cidr,
                undefined,
                bits
            )
        }, callback);
    };
}

export function randomDispatcher(cidr, options = {}) {
    const { connect, bits, ...rest } = options
    return new Agent({ ...rest, connect: createRandomConnector(cidr, bits, connect) })
}