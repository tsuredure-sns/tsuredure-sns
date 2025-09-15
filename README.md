# 徒然(Tsuredure) Distributed-Web SNS

## Contributing

### Requirements

- [node.js 22+](https://nodejs.org/) for build/debug server
- [pnpm](https://pnpm.io/) for package manager
- [mkcert](https://github.com/FiloSottile/mkcert) for Secure Key Generation

#### Windows(WSL2 recommended)

```ps1
# in PowerShell
# Starts notepad as administrator
> powershell -NoProfile -ExecutionPolicy unrestricted -Command "start notepad C:\Windows\System32\drivers\etc\hosts -verb runas"
# Installs mkcert from winget
> winget install mkcert
> mkcert -install
```

Add `127.0.0.1 tsuredure.test` to hosts file

#### macOS, Linux

```sh
sudo vi /etc/hosts
```

Add `127.0.0.1 tsuredure.test` to hosts file

### Installation

```sh
pnpm install
mkcert.exe --cert-file=cert.pem --key-file=key.pem "localhost" "tsuredure.test"
```

## Technologies

- Modern Browser(Edge, Chrome, Firefox, Safari) as client
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) with [DataChannel](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels)
- [hono](https://hono.dev/) as Proxy WebSocket server
  - cloudflare workers as server runtime

## References

- [gzuidhof/coi-serviceworker: Cross-origin isolation (COOP and COEP) through a service worker for situations in which you can't control the headers (e.g. GH pages)](https://github.com/gzuidhof/coi-serviceworker)
- [Recipe for adding COEP/COOP headers · Issue #2963 · GoogleChrome/workbox](https://github.com/GoogleChrome/workbox/issues/2963)
- [Vite PWA](https://vite-pwa-org.netlify.app/)
- [Security headers quick reference | Articles | web.dev](https://web.dev/articles/security-headers)
