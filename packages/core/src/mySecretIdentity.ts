/**
 * Algorithm configuration for generating the key pair.
 * Currently using ECDSA with P-384 curve.
 * TODO: Use Ed25519(waiting browser support)
 * @link https://caniuse.com/?search=Ed25519
 */
const GENERATE_KEY_ALGORITHM: RsaHashedKeyAlgorithm | EcKeyAlgorithm = {
  name: 'ECDSA',
  namedCurve: 'P-384',
};

/**
 * Format for exporting keys.
 */
const KEY_EXPORT_FORMAT = 'jwk';

/**
 * Key used for storing the secret identity in the storage.
 */
const STORAGE_KEY = 'fvadsjnjklavsdfmjl';

/**
 * Generates a new secret identity.
 *
 * @param subtle - SubtleCrypto instance for cryptographic operations.
 * @returns A promise that resolves to a new instance of MySecretIdentity.
 */
export async function generateNewSecret(
  subtle: SubtleCrypto,
): Promise<MySecretIdentity> {
  const id = globalThis.crypto.randomUUID();
  const extractable = true;
  const keyPair = await subtle.generateKey(
    GENERATE_KEY_ALGORITHM,
    extractable,
    ['sign', 'verify'],
  );
  return new MySecretIdentityImpl(id, keyPair);
}

/**
 * Implementation of the MySecretIdentity interface.
 */
export class MySecretIdentityImpl implements MySecretIdentity {
  /**
   * @param id - The unique identifier for the secret identity.
   * @param keyPair - The cryptographic key pair associated with the identity.
   */
  constructor(
    private readonly id: string,
    private readonly keyPair: CryptoKeyPair,
  ) {}

  /**
   * Gets the unique identifier of the secret identity.
   * @returns The unique identifier.
   */
  getIdentity(): string {
    return this.id;
  }

  /**
   * Gets the cryptographic key pair of the secret identity.
   * @returns The cryptographic key pair.
   */
  getKeyPair(): CryptoKeyPair {
    return this.keyPair;
  }
}

/**
 * Holds the identity of the current user.
 * This is a secret identity that should not be shared with anyone.
 * It is used to identify the user in the all network.
 */
export interface MySecretIdentity {
  /**
   * Gets the unique identifier of the secret identity.
   * @returns The unique identifier.
   */
  getIdentity(): string;

  /**
   * Gets the cryptographic key pair of the secret identity.
   * @returns The cryptographic key pair.
   */
  getKeyPair(): CryptoKeyPair;
}

/**
 * Interface for storing and restoring the secret identity.
 */
export interface MySecretIdentityStorage {
  /**
   * Restores the secret identity from the storage.
   * @returns A promise that resolves to the restored secret identity.
   */
  restoreOrGenerate(): Promise<MySecretIdentity>;

  /**
   * Saves the secret identity to the storage.
   * @param identity - The secret identity to be stored.
   * @returns A promise that resolves when the identity is stored.
   */
  store(identity: MySecretIdentity): Promise<void>;
}

/**
 * Implementation of the MySecretIdentityStorage interface.
 */
export class MySecretIdentityStorageImpl implements MySecretIdentityStorage {
  /**
   * @param storage - The storage mechanism to use (e.g., localStorage).
   * @param subtle - SubtleCrypto instance for cryptographic operations.
   */
  constructor(
    private readonly storage: Storage,
    private readonly subtle: SubtleCrypto,
  ) {}

  async restoreOrGenerate(): Promise<MySecretIdentity> {
    const data = this.storage.getItem(STORAGE_KEY);
    if (!data) {
      // generate New Identity
      const newIdentity = await generateNewSecret(this.subtle);
      await this.store(newIdentity);
      return newIdentity;
    }
    const { id, privateKey, publicKey } = JSON.parse(data);
    return new MySecretIdentityImpl(id, {
      privateKey: await this.subtle.importKey(
        KEY_EXPORT_FORMAT,
        JSON.parse(privateKey),
        GENERATE_KEY_ALGORITHM,
        true,
        ['sign'],
      ),
      publicKey: await this.subtle.importKey(
        KEY_EXPORT_FORMAT,
        JSON.parse(publicKey),
        GENERATE_KEY_ALGORITHM,
        true,
        ['verify'],
      ),
    });
  }

  /**
   * Saves the secret identity to the storage.
   * @param identity - The secret identity to be stored.
   * @returns A promise that resolves when the identity is stored.
   */
  async store(identity: MySecretIdentity): Promise<void> {
    const privateKey = await this.subtle.exportKey(
      KEY_EXPORT_FORMAT,
      identity.getKeyPair().privateKey,
    );
    const publicKey = await this.subtle.exportKey(
      KEY_EXPORT_FORMAT,
      identity.getKeyPair().publicKey,
    );
    const data = {
      id: identity.getIdentity(),
      privateKey,
      publicKey,
    };
    this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
