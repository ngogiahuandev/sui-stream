export const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'testnet') as
  | 'testnet'
  | 'mainnet'
  | 'devnet';

export const SUI_STREAM_PACKAGE_ID =
  process.env.NEXT_PUBLIC_SUI_STREAM_PACKAGE ?? '';

export const SUI_STREAM_PACKAGE_ORIGINAL_ID =
  process.env.NEXT_PUBLIC_SUI_STREAM_PACKAGE_ORIGINAL ??
  SUI_STREAM_PACKAGE_ID;

export const SUI_STREAM_MODULE = 'clip';

export const SUI_CLOCK_OBJECT_ID = '0x6';

export const WALRUS_PUBLISHER_URL =
  process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL ??
  'https://publisher.walrus-testnet.walrus.space';

export const WALRUS_AGGREGATOR_URL =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ??
  'https://aggregator.walrus-testnet.walrus.space';

export const DEFAULT_WALRUS_EPOCHS = 5;

export const CLIP_CREATED_EVENT_TYPE = SUI_STREAM_PACKAGE_ORIGINAL_ID
  ? `${SUI_STREAM_PACKAGE_ORIGINAL_ID}::${SUI_STREAM_MODULE}::ClipCreated`
  : '';

export const SUI_STREAM_ACCESS_MODULE = 'access';

export const CLIP_UNLOCKED_EVENT_TYPE = SUI_STREAM_PACKAGE_ORIGINAL_ID
  ? `${SUI_STREAM_PACKAGE_ORIGINAL_ID}::${SUI_STREAM_ACCESS_MODULE}::ClipUnlocked`
  : '';

export const CLIP_ACCESS_TYPE = SUI_STREAM_PACKAGE_ORIGINAL_ID
  ? `${SUI_STREAM_PACKAGE_ORIGINAL_ID}::${SUI_STREAM_ACCESS_MODULE}::ClipAccess`
  : '';

const DEFAULT_SEAL_KEY_SERVERS_TESTNET = [
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
];

export const SEAL_KEY_SERVERS = (
  process.env.NEXT_PUBLIC_SEAL_KEY_SERVERS ??
  DEFAULT_SEAL_KEY_SERVERS_TESTNET.join(',')
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

export const SEAL_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_SEAL_THRESHOLD ?? '2'
);

export const SEAL_SESSION_TTL_MIN = 30;
export const SEAL_ID_BYTES = 32;
export const MIST_PER_SUI = 1_000_000_000;
