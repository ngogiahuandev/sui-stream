module sui_stream::campaign;

use std::bcs;
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::dynamic_field as df;
use sui::ed25519;
use sui::event;
use sui::sui::SUI;

const MISSION_KIND_VIEW: u8 = 0;
const MISSION_KIND_LIKE: u8 = 1;
const MISSION_KIND_COMMENT: u8 = 2;

const VIEW_BIT: u8 = 1;
const LIKE_BIT: u8 = 2;
const COMMENT_BIT: u8 = 4;

const ED25519_PUBKEY_LEN: u64 = 32;
const ED25519_SIGNATURE_LEN: u64 = 64;
const ATTESTATION_NONCE_LEN: u64 = 16;

const MIN_REWARD_MIST: u64 = 1;
const MAX_REWARD_MIST: u64 = 100_000_000_000;
const MAX_CLAIMS: u64 = 1_000_000;
const MIN_DURATION_MS: u64 = 3_600_000;
const MAX_DURATION_MS: u64 = 31_536_000_000;

const ENotCreator: u64 = 1;
const ECampaignInactive: u64 = 2;
const ECampaignExpired: u64 = 3;
const ECampaignNotExpired: u64 = 4;
const ECampaignExhausted: u64 = 5;
const EAlreadyClaimed: u64 = 6;
const EInvalidSignature: u64 = 7;
const EAttestationExpired: u64 = 8;
const EInsufficientBalance: u64 = 9;
const EInvalidPubkeyLen: u64 = 10;
const EInvalidSignatureLen: u64 = 11;
const EInvalidNonceLen: u64 = 12;
const EZeroReward: u64 = 13;
const EZeroClaims: u64 = 14;
const EDepositMismatch: u64 = 15;
const EExpiryOutOfRange: u64 = 16;
const ECampaignClipMismatch: u64 = 17;
const ERewardTooLarge: u64 = 18;
const EClaimsTooLarge: u64 = 19;

public struct Campaign has key {
    id: UID,
    clip_id: ID,
    creator: address,
    balance: Balance<SUI>,
    reward_per_claim: u64,
    max_claims: u64,
    claims_made: u64,
    required_mask: u8,
    attestation_pubkey: vector<u8>,
    expires_at_ms: u64,
    created_at_ms: u64,
    active: bool,
}

public struct ClaimKey has copy, drop, store {
    viewer: address,
}

public struct CampaignCreated has copy, drop {
    campaign_id: ID,
    clip_id: ID,
    creator: address,
    reward_per_claim: u64,
    max_claims: u64,
    required_mask: u8,
    total_locked: u64,
    expires_at_ms: u64,
    created_at_ms: u64,
}

public struct CampaignToggled has copy, drop {
    campaign_id: ID,
    active: bool,
}

public struct RewardClaimed has copy, drop {
    campaign_id: ID,
    clip_id: ID,
    viewer: address,
    amount: u64,
    claims_made: u64,
    claims_remaining: u64,
    claimed_at_ms: u64,
}

public struct CampaignExhausted has copy, drop {
    campaign_id: ID,
}

public struct CampaignWithdrawn has copy, drop {
    campaign_id: ID,
    creator: address,
    amount: u64,
    withdrawn_at_ms: u64,
}

public fun create_campaign(
    clip_id: ID,
    reward_per_claim: u64,
    max_claims: u64,
    include_like: bool,
    include_comment: bool,
    attestation_pubkey: vector<u8>,
    expires_at_ms: u64,
    deposit: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(reward_per_claim >= MIN_REWARD_MIST, EZeroReward);
    assert!(reward_per_claim <= MAX_REWARD_MIST, ERewardTooLarge);
    assert!(max_claims >= 1, EZeroClaims);
    assert!(max_claims <= MAX_CLAIMS, EClaimsTooLarge);
    assert!(
        vector::length(&attestation_pubkey) == ED25519_PUBKEY_LEN,
        EInvalidPubkeyLen,
    );

    let now = clock.timestamp_ms();
    assert!(expires_at_ms >= now + MIN_DURATION_MS, EExpiryOutOfRange);
    assert!(expires_at_ms <= now + MAX_DURATION_MS, EExpiryOutOfRange);

    let required = reward_per_claim * max_claims;
    let deposit_value = coin::value(&deposit);
    assert!(deposit_value == required, EDepositMismatch);

    let mut required_mask: u8 = VIEW_BIT;
    if (include_like) {
        required_mask = required_mask | LIKE_BIT;
    };
    if (include_comment) {
        required_mask = required_mask | COMMENT_BIT;
    };

    let creator = tx_context::sender(ctx);
    let id = object::new(ctx);
    let campaign_id = object::uid_to_inner(&id);

    let campaign = Campaign {
        id,
        clip_id,
        creator,
        balance: coin::into_balance(deposit),
        reward_per_claim,
        max_claims,
        claims_made: 0,
        required_mask,
        attestation_pubkey,
        expires_at_ms,
        created_at_ms: now,
        active: true,
    };

    event::emit(CampaignCreated {
        campaign_id,
        clip_id,
        creator,
        reward_per_claim,
        max_claims,
        required_mask,
        total_locked: deposit_value,
        expires_at_ms,
        created_at_ms: now,
    });

    transfer::share_object(campaign);
}

public fun set_campaign_active(
    campaign: &mut Campaign,
    active: bool,
    ctx: &TxContext,
) {
    assert_creator(campaign, ctx);
    campaign.active = active;
    event::emit(CampaignToggled {
        campaign_id: object::uid_to_inner(&campaign.id),
        active,
    });
}

public fun withdraw_remaining(
    campaign: &mut Campaign,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert_creator(campaign, ctx);
    assert!(
        clock.timestamp_ms() >= campaign.expires_at_ms,
        ECampaignNotExpired,
    );

    let amount = balance::value(&campaign.balance);
    assert!(amount > 0, EInsufficientBalance);

    let withdrawn = balance::split(&mut campaign.balance, amount);
    let coin_out = coin::from_balance(withdrawn, ctx);
    let creator = campaign.creator;

    event::emit(CampaignWithdrawn {
        campaign_id: object::uid_to_inner(&campaign.id),
        creator,
        amount,
        withdrawn_at_ms: clock.timestamp_ms(),
    });

    transfer::public_transfer(coin_out, creator);
}

public fun claim_reward(
    campaign: &mut Campaign,
    nonce: vector<u8>,
    expiry_ms: u64,
    signature: vector<u8>,
    clip_id: ID,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(campaign.clip_id == clip_id, ECampaignClipMismatch);
    assert!(campaign.active, ECampaignInactive);

    let now = clock.timestamp_ms();
    assert!(now < campaign.expires_at_ms, ECampaignExpired);
    assert!(now < expiry_ms, EAttestationExpired);
    assert!(vector::length(&nonce) == ATTESTATION_NONCE_LEN, EInvalidNonceLen);
    assert!(
        vector::length(&signature) == ED25519_SIGNATURE_LEN,
        EInvalidSignatureLen,
    );
    assert!(campaign.claims_made < campaign.max_claims, ECampaignExhausted);

    let viewer = tx_context::sender(ctx);
    let key = ClaimKey { viewer };
    assert!(!df::exists_(&campaign.id, key), EAlreadyClaimed);

    let campaign_id = object::uid_to_inner(&campaign.id);
    let msg = build_attestation_message(
        campaign_id,
        viewer,
        campaign.required_mask,
        &nonce,
        expiry_ms,
    );
    let ok = ed25519::ed25519_verify(
        &signature,
        &campaign.attestation_pubkey,
        &msg,
    );
    assert!(ok, EInvalidSignature);

    let reward = campaign.reward_per_claim;
    assert!(balance::value(&campaign.balance) >= reward, EInsufficientBalance);

    campaign.claims_made = campaign.claims_made + 1;
    let claims_made = campaign.claims_made;
    let claims_remaining = campaign.max_claims - campaign.claims_made;
    let exhausted = claims_remaining == 0;

    let reward_balance = balance::split(&mut campaign.balance, reward);
    let reward_coin = coin::from_balance(reward_balance, ctx);

    df::add(&mut campaign.id, key, true);

    let clip_id_out = campaign.clip_id;
    event::emit(RewardClaimed {
        campaign_id,
        clip_id: clip_id_out,
        viewer,
        amount: reward,
        claims_made,
        claims_remaining,
        claimed_at_ms: now,
    });

    if (exhausted) {
        event::emit(CampaignExhausted { campaign_id });
    };

    transfer::public_transfer(reward_coin, viewer);
}

fun assert_creator(campaign: &Campaign, ctx: &TxContext) {
    assert!(tx_context::sender(ctx) == campaign.creator, ENotCreator);
}

fun build_attestation_message(
    campaign_id: ID,
    viewer: address,
    required_mask: u8,
    nonce: &vector<u8>,
    expiry_ms: u64,
): vector<u8> {
    let mut msg = vector::empty<u8>();
    vector::append(&mut msg, object::id_to_bytes(&campaign_id));
    vector::append(&mut msg, bcs::to_bytes(&viewer));
    vector::push_back(&mut msg, required_mask);
    vector::append(&mut msg, *nonce);
    vector::append(&mut msg, bcs::to_bytes(&expiry_ms));
    msg
}

public fun campaign_clip_id(c: &Campaign): ID { c.clip_id }
public fun campaign_creator(c: &Campaign): address { c.creator }
public fun campaign_balance(c: &Campaign): u64 { balance::value(&c.balance) }
public fun campaign_reward_per_claim(c: &Campaign): u64 { c.reward_per_claim }
public fun campaign_max_claims(c: &Campaign): u64 { c.max_claims }
public fun campaign_claims_made(c: &Campaign): u64 { c.claims_made }
public fun campaign_claims_remaining(c: &Campaign): u64 {
    c.max_claims - c.claims_made
}
public fun campaign_required_mask(c: &Campaign): u8 { c.required_mask }
public fun campaign_expires_at_ms(c: &Campaign): u64 { c.expires_at_ms }
public fun campaign_created_at_ms(c: &Campaign): u64 { c.created_at_ms }
public fun campaign_is_active(c: &Campaign): bool { c.active }
public fun campaign_attestation_pubkey(c: &Campaign): &vector<u8> {
    &c.attestation_pubkey
}

public fun has_viewer_claimed(campaign: &Campaign, viewer: address): bool {
    df::exists_(&campaign.id, ClaimKey { viewer })
}

public fun claim_reward_for(
    campaign: &mut Campaign,
    viewer: address,
    nonce: vector<u8>,
    expiry_ms: u64,
    signature: vector<u8>,
    clip_id: ID,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(campaign.clip_id == clip_id, ECampaignClipMismatch);
    assert!(campaign.active, ECampaignInactive);

    let now = clock.timestamp_ms();
    assert!(now < campaign.expires_at_ms, ECampaignExpired);
    assert!(now < expiry_ms, EAttestationExpired);
    assert!(vector::length(&nonce) == ATTESTATION_NONCE_LEN, EInvalidNonceLen);
    assert!(
        vector::length(&signature) == ED25519_SIGNATURE_LEN,
        EInvalidSignatureLen,
    );
    assert!(campaign.claims_made < campaign.max_claims, ECampaignExhausted);

    let key = ClaimKey { viewer };
    assert!(!df::exists_(&campaign.id, key), EAlreadyClaimed);

    let campaign_id = object::uid_to_inner(&campaign.id);
    let msg = build_attestation_message(
        campaign_id,
        viewer,
        campaign.required_mask,
        &nonce,
        expiry_ms,
    );
    let ok = ed25519::ed25519_verify(
        &signature,
        &campaign.attestation_pubkey,
        &msg,
    );
    assert!(ok, EInvalidSignature);

    let reward = campaign.reward_per_claim;
    assert!(balance::value(&campaign.balance) >= reward, EInsufficientBalance);

    campaign.claims_made = campaign.claims_made + 1;
    let claims_made = campaign.claims_made;
    let claims_remaining = campaign.max_claims - campaign.claims_made;
    let exhausted = claims_remaining == 0;

    let reward_balance = balance::split(&mut campaign.balance, reward);
    let reward_coin = coin::from_balance(reward_balance, ctx);

    df::add(&mut campaign.id, key, true);

    let clip_id_out = campaign.clip_id;
    event::emit(RewardClaimed {
        campaign_id,
        clip_id: clip_id_out,
        viewer,
        amount: reward,
        claims_made,
        claims_remaining,
        claimed_at_ms: now,
    });

    if (exhausted) {
        event::emit(CampaignExhausted { campaign_id });
    };

    transfer::public_transfer(reward_coin, viewer);
}

public fun view_bit(): u8 { VIEW_BIT }
public fun like_bit(): u8 { LIKE_BIT }
public fun comment_bit(): u8 { COMMENT_BIT }
public fun mission_kind_view(): u8 { MISSION_KIND_VIEW }
public fun mission_kind_like(): u8 { MISSION_KIND_LIKE }
public fun mission_kind_comment(): u8 { MISSION_KIND_COMMENT }
public fun attestation_nonce_len(): u64 { ATTESTATION_NONCE_LEN }
