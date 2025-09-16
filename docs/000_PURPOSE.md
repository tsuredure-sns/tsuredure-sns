
# Purpose

Tsuredure SNS is a decentralized peer-to-peer (P2P) social network designed to address the problems of centrally managed data systems that depend on a single operating company or organization, which are common in platforms like Twitter/X, Facebook, Bluesky, and Mastodon.

## Goals

### 1. P2P SNS without a centralized server dependent on a specific company or organization

- Store and distribute posts through a P2P network among users, avoiding dependence on any particular server
- The signaling server only mediates connections and does not persist posts
- Users control their own data and can back it up or migrate it as needed

### 2. Runs in the browser alone

- PWA support lets users add the site to their home screen and use it like an app without building a native application
- Independent service delivery that does not rely on any app store
- Lightweight design that makes maximal use of browser capabilities
- No installation required — access via URL to get started
- Cross-platform support (Windows, macOS, Linux, iOS, Android)
- Offline support via Service Worker, making the app usable in unstable network environments
- Local persistence using the browser's OPFS (Origin Private File System) to securely store user data inside the browser

### 3. Users protect their posts by signing and verifying their own data

- Prevent tampering with posts using strong public-key cryptography (Ed25519) for signing and verification
- Users hold their private keys and prove ownership of their posts via signatures
- Other users verify post signatures using public keys to ensure trustworthiness
- Signing and verification happen entirely inside the browser; private keys are never sent externally
- Prefer native signing/verification via the Web Crypto API to improve performance and security
- Implement the `rk` (arkē) feature to prove the originality of posts
  - Tsuredure SNS is the first to adopt `rk`, and the project intends for `rk` to evolve together with this adoption

### 4. Transparency and community-led development through open source

- Publish all code as open source so anyone can review, improve, or extend it
- Actively incorporate community feedback to encourage user-led development
- Anyone can contribute via pull requests and issues
- A transparent development process helps ensure reliability and safety
- Provide thorough documentation so developers and users can understand and use the project easily

### 5. Optional monetization

- Offer paid enterprise plans as an optional extension of `rk`
- Basic SNS features remain free and available to everyone
- Paid plans provide additional features and support targeted at companies or organizations
- Provide functionality to link Tsuredure ID (DID) to existing Active Directory or LDAP when needed
- Offer features to analyze user posts in more detail or increase trust using `rk`
- Revenue from paid plans will support ongoing project development and improvements

### 6. Extensible decentralized schema

- Adopt a simple, extensible data model that allows new features and services to be added easily
- Flexible design to support a wide range of use cases beyond SNS
- Tsuredure SNS is the first application to demonstrate this concept; future applications can reuse the decentralized schema
  - Establish a decentralized schema through Tsuredure SNS so other applications can adopt it
- While conceptually related to the ideas called Web 3.0, this is not a blockchain or token-economy project; it aims to realize a user-centric Internet similar to the 1990s/2000s using modern technologies
- As an OSS project, it can experiment and iterate on the decentralized schema without needing to prioritize profitability
