export const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK ?? 'testnet') as
  | 'testnet'
  | 'mainnet'
  | 'devnet';

export const SUI_STREAM_PACKAGE_ID =
  process.env.NEXT_PUBLIC_SUI_STREAM_PACKAGE ?? '';

export const SUI_STREAM_MODULE = 'clip';

export const SUI_CLOCK_OBJECT_ID = '0x6';

export const WALRUS_PUBLISHER_URL =
  process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL ??
  'https://publisher.walrus-testnet.walrus.space';

export const WALRUS_AGGREGATOR_URL =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ??
  'https://aggregator.walrus-testnet.walrus.space';

export const DEFAULT_WALRUS_EPOCHS = 5;

export const CLIP_CREATED_EVENT_TYPE = SUI_STREAM_PACKAGE_ID
  ? `${SUI_STREAM_PACKAGE_ID}::${SUI_STREAM_MODULE}::ClipCreated`
  : '';
