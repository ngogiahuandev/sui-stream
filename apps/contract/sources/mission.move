module sui_stream::mission;

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
const MISSION_KIND_SHARE: u8 = 3;

const ED25519_PUBKEY_LEN: u64 = 32;
const ED25519_SIGNATURE_LEN: u64 = 64;
const ATTESTATION_NONCE_LEN: u64 = 16;

const MAX_MISSIONS_PER_POOL: u64 = 4;
const MAX_REWARD_PER_CLAIM_MIST: u64 = 100_000_000_000;
const MAX_CLAIMS_PER_MISSION: u64 = 1_000_000;
const MIN_POOL_DURATION_MS: u64 = 3_600_000;
const MAX_POOL_DURATION_MS: u64 = 31_536_000_000;

const ENotCreator: u64 = 1;
const EPoolInactive: u64 = 2;
const EMissionInactive: u64 = 3;
const EMissionExhausted: u64 = 4;
const EAlreadyClaimed: u64 = 5;
const EInvalidSignature: u64 = 6;
const EAttestationExpired: u64 = 7;
const EPoolExpired: u64 = 8;
const EPoolNotExpired: u64 = 9;
const EInsufficientBalance: u64 = 10;
const EInvalidMissionKind: u64 = 11;
const EDuplicateMission: u64 = 12;
const EInvalidPubkeyLen: u64 = 13;
const EInvalidSignatureLen: u64 = 14;
const EInvalidNonceLen: u64 = 15;
const EEmptyMissions: u64 = 16;
const ETooManyMissions: u64 = 17;
const ERewardTooLarge: u64 = 18;
const EClaimsTooLarge: u64 = 19;
const EZeroReward: u64 = 20;
const EZeroClaims: u64 = 21;
const EDepositMismatch: u64 = 22;
const EExpiryOutOfRange: u64 = 23;
const EMissionNotFound: u64 = 24;
const EPoolClipMismatch: u64 = 25;

public struct Mission has store, copy, drop {
    kind: u8,
    reward_per_claim: u64,
    max_claims: u64,
    claims_made: u64,
    active: bool,
}

public struct ClipRewardPool has key {
    id: UID,
    clip_id: ID,
    creator: address,
    balance: Balance<SUI>,
    missions: vector<Mission>,
    attestation_pubkey: vector<u8>,
    expires_at_ms: u64,
    created_at_ms: u64,
    active: bool,
}

public struct ClaimKey has copy, drop, store {
    viewer: address,
    mission_kind: u8,
}

public struct PoolCreated has copy, drop {
    pool_id: ID,
    clip_id: ID,
    creator: address,
    total_locked: u64,
    mission_kinds: vector<u8>,
    expires_at_ms: u64,
    created_at_ms: u64,
}

public struct PoolToppedUp has copy, drop {
    pool_id: ID,
    amount: u64,
    new_balance: u64,
}

public struct MissionAdded has copy, drop {
    pool_id: ID,
    kind: u8,
    reward_per_claim: u64,
    max_claims: u64,
}

public struct MissionToggled has copy, drop {
    pool_id: ID,
    kind: u8,
    active: bool,
}

public struct PoolToggled has copy, drop {
    pool_id: ID,
    active: bool,
}

public struct RewardClaimed has copy, drop {
    pool_id: ID,
    clip_id: ID,
    viewer: address,
    mission_kind: u8,
    amount: u64,
    claims_made: u64,
    claims_remaining: u64,
    claimed_at_ms: u64,
}

public struct MissionExhausted has copy, drop {
    pool_id: ID,
    mission_kind: u8,
}

public struct PoolWithdrawn has copy, drop {
    pool_id: ID,
    creator: address,
    amount: u64,
    withdrawn_at_ms: u64,
}

public fun new_mission(kind: u8, reward_per_claim: u64, max_claims: u64): Mission {
    assert_mission_kind(kind);
    assert!(reward_per_claim > 0, EZeroReward);
    assert!(reward_per_claim <= MAX_REWARD_PER_CLAIM_MIST, ERewardTooLarge);
    assert!(max_claims > 0, EZeroClaims);
    assert!(max_claims <= MAX_CLAIMS_PER_MISSION, EClaimsTooLarge);

    Mission {
        kind,
        reward_per_claim,
        max_claims,
        claims_made: 0,
        active: true,
    }
}

public fun create_pool(
    clip_id: ID,
    missions: vector<Mission>,
    attestation_pubkey: vector<u8>,
    expires_at_ms: u64,
    deposit: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(vector::length(&attestation_pubkey) == ED25519_PUBKEY_LEN, EInvalidPubkeyLen);

    let now = clock.timestamp_ms();
    assert!(expires_at_ms >= now + MIN_POOL_DURATION_MS, EExpiryOutOfRange);
    assert!(expires_at_ms <= now + MAX_POOL_DURATION_MS, EExpiryOutOfRange);

    let mission_count = vector::length(&missions);
    assert!(mission_count > 0, EEmptyMissions);
    assert!(mission_count <= MAX_MISSIONS_PER_POOL, ETooManyMissions);

    assert_unique_missions(&missions);

    let required = compute_required_deposit(&missions);
    let deposit_value = coin::value(&deposit);
    assert!(deposit_value == required, EDepositMismatch);

    let creator = tx_context::sender(ctx);
    let id = object::new(ctx);
    let pool_id = object::uid_to_inner(&id);

    let mut kinds = vector::empty<u8>();
    let mut i = 0;
    while (i < mission_count) {
        let m = vector::borrow(&missions, i);
        vector::push_back(&mut kinds, m.kind);
        i = i + 1;
    };

    let pool = ClipRewardPool {
        id,
        clip_id,
        creator,
        balance: coin::into_balance(deposit),
        missions,
        attestation_pubkey,
        expires_at_ms,
        created_at_ms: now,
        active: true,
    };

    event::emit(PoolCreated {
        pool_id,
        clip_id,
        creator,
        total_locked: deposit_value,
        mission_kinds: kinds,
        expires_at_ms,
        created_at_ms: now,
    });

    transfer::share_object(pool);
}

public fun top_up(
    pool: &mut ClipRewardPool,
    deposit: Coin<SUI>,
    ctx: &TxContext,
) {
    assert_creator(pool, ctx);
    let amount = coin::value(&deposit);
    assert!(amount > 0, EZeroReward);

    balance::join(&mut pool.balance, coin::into_balance(deposit));

    event::emit(PoolToppedUp {
        pool_id: object::uid_to_inner(&pool.id),
        amount,
        new_balance: balance::value(&pool.balance),
    });
}

public fun add_mission(
    pool: &mut ClipRewardPool,
    kind: u8,
    reward_per_claim: u64,
    max_claims: u64,
    deposit: Coin<SUI>,
    ctx: &TxContext,
) {
    assert_creator(pool, ctx);
    assert!(
        vector::length(&pool.missions) < MAX_MISSIONS_PER_POOL,
        ETooManyMissions,
    );
    assert!(find_mission_index(&pool.missions, kind).is_none(), EDuplicateMission);

    let mission = new_mission(kind, reward_per_claim, max_claims);
    let required = reward_per_claim * max_claims;
    let deposit_value = coin::value(&deposit);
    assert!(deposit_value == required, EDepositMismatch);

    balance::join(&mut pool.balance, coin::into_balance(deposit));
    vector::push_back(&mut pool.missions, mission);

    event::emit(MissionAdded {
        pool_id: object::uid_to_inner(&pool.id),
        kind,
        reward_per_claim,
        max_claims,
    });
}

public fun set_mission_active(
    pool: &mut ClipRewardPool,
    kind: u8,
    active: bool,
    ctx: &TxContext,
) {
    assert_creator(pool, ctx);
    let idx_opt = find_mission_index(&pool.missions, kind);
    assert!(idx_opt.is_some(), EMissionNotFound);
    let idx = idx_opt.destroy_some();
    let m = vector::borrow_mut(&mut pool.missions, idx);
    m.active = active;

    event::emit(MissionToggled {
        pool_id: object::uid_to_inner(&pool.id),
        kind,
        active,
    });
}

public fun set_pool_active(
    pool: &mut ClipRewardPool,
    active: bool,
    ctx: &TxContext,
) {
    assert_creator(pool, ctx);
    pool.active = active;

    event::emit(PoolToggled {
        pool_id: object::uid_to_inner(&pool.id),
        active,
    });
}

public fun withdraw_remaining(
    pool: &mut ClipRewardPool,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert_creator(pool, ctx);
    assert!(clock.timestamp_ms() >= pool.expires_at_ms, EPoolNotExpired);

    let amount = balance::value(&pool.balance);
    assert!(amount > 0, EInsufficientBalance);

    let withdrawn = balance::split(&mut pool.balance, amount);
    let coin_out = coin::from_balance(withdrawn, ctx);
    let creator = pool.creator;

    event::emit(PoolWithdrawn {
        pool_id: object::uid_to_inner(&pool.id),
        creator,
        amount,
        withdrawn_at_ms: clock.timestamp_ms(),
    });

    transfer::public_transfer(coin_out, creator);
}

public fun claim_reward(
    pool: &mut ClipRewardPool,
    mission_kind: u8,
    nonce: vector<u8>,
    expiry_ms: u64,
    signature: vector<u8>,
    clip_id: ID,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert_mission_kind(mission_kind);
    assert!(pool.clip_id == clip_id, EPoolClipMismatch);
    assert!(pool.active, EPoolInactive);

    let now = clock.timestamp_ms();
    assert!(now < pool.expires_at_ms, EPoolExpired);
    assert!(now < expiry_ms, EAttestationExpired);
    assert!(vector::length(&nonce) == ATTESTATION_NONCE_LEN, EInvalidNonceLen);
    assert!(vector::length(&signature) == ED25519_SIGNATURE_LEN, EInvalidSignatureLen);

    let viewer = tx_context::sender(ctx);
    let key = ClaimKey { viewer, mission_kind };
    assert!(!df::exists_(&pool.id, key), EAlreadyClaimed);

    let idx_opt = find_mission_index(&pool.missions, mission_kind);
    assert!(idx_opt.is_some(), EMissionNotFound);
    let idx = idx_opt.destroy_some();

    let pool_id = object::uid_to_inner(&pool.id);
    let msg = build_attestation_message(
        pool_id,
        viewer,
        mission_kind,
        &nonce,
        expiry_ms,
    );
    let ok = ed25519::ed25519_verify(&signature, &pool.attestation_pubkey, &msg);
    assert!(ok, EInvalidSignature);

    let m = vector::borrow_mut(&mut pool.missions, idx);
    assert!(m.active, EMissionInactive);
    assert!(m.claims_made < m.max_claims, EMissionExhausted);

    let reward = m.reward_per_claim;
    assert!(balance::value(&pool.balance) >= reward, EInsufficientBalance);

    m.claims_made = m.claims_made + 1;
    let claims_made = m.claims_made;
    let claims_remaining = m.max_claims - m.claims_made;
    let exhausted = claims_remaining == 0;

    let reward_balance = balance::split(&mut pool.balance, reward);
    let reward_coin = coin::from_balance(reward_balance, ctx);

    df::add(&mut pool.id, key, true);

    let clip_id_out = pool.clip_id;
    event::emit(RewardClaimed {
        pool_id,
        clip_id: clip_id_out,
        viewer,
        mission_kind,
        amount: reward,
        claims_made,
        claims_remaining,
        claimed_at_ms: now,
    });

    if (exhausted) {
        event::emit(MissionExhausted {
            pool_id,
            mission_kind,
        });
    };

    transfer::public_transfer(reward_coin, viewer);
}

fun assert_creator(pool: &ClipRewardPool, ctx: &TxContext) {
    assert!(tx_context::sender(ctx) == pool.creator, ENotCreator);
}

fun assert_mission_kind(kind: u8) {
    assert!(
        kind == MISSION_KIND_VIEW
            || kind == MISSION_KIND_LIKE
            || kind == MISSION_KIND_COMMENT
            || kind == MISSION_KIND_SHARE,
        EInvalidMissionKind,
    );
}

fun assert_unique_missions(missions: &vector<Mission>) {
    let n = vector::length(missions);
    let mut i = 0;
    while (i < n) {
        let kind_i = vector::borrow(missions, i).kind;
        let mut j = i + 1;
        while (j < n) {
            let kind_j = vector::borrow(missions, j).kind;
            assert!(kind_i != kind_j, EDuplicateMission);
            j = j + 1;
        };
        i = i + 1;
    };
}

fun compute_required_deposit(missions: &vector<Mission>): u64 {
    let n = vector::length(missions);
    let mut total: u64 = 0;
    let mut i = 0;
    while (i < n) {
        let m = vector::borrow(missions, i);
        total = total + m.reward_per_claim * m.max_claims;
        i = i + 1;
    };
    total
}

fun find_mission_index(missions: &vector<Mission>, kind: u8): Option<u64> {
    let n = vector::length(missions);
    let mut i = 0;
    while (i < n) {
        if (vector::borrow(missions, i).kind == kind) {
            return option::some(i)
        };
        i = i + 1;
    };
    option::none()
}

fun build_attestation_message(
    pool_id: ID,
    viewer: address,
    mission_kind: u8,
    nonce: &vector<u8>,
    expiry_ms: u64,
): vector<u8> {
    let mut msg = vector::empty<u8>();
    vector::append(&mut msg, object::id_to_bytes(&pool_id));
    vector::append(&mut msg, bcs::to_bytes(&viewer));
    vector::push_back(&mut msg, mission_kind);
    vector::append(&mut msg, *nonce);
    vector::append(&mut msg, bcs::to_bytes(&expiry_ms));
    msg
}

public fun pool_clip_id(pool: &ClipRewardPool): ID { pool.clip_id }
public fun pool_creator(pool: &ClipRewardPool): address { pool.creator }
public fun pool_balance(pool: &ClipRewardPool): u64 { balance::value(&pool.balance) }
public fun pool_expires_at_ms(pool: &ClipRewardPool): u64 { pool.expires_at_ms }
public fun pool_created_at_ms(pool: &ClipRewardPool): u64 { pool.created_at_ms }
public fun pool_is_active(pool: &ClipRewardPool): bool { pool.active }
public fun pool_mission_count(pool: &ClipRewardPool): u64 { vector::length(&pool.missions) }
public fun pool_missions(pool: &ClipRewardPool): &vector<Mission> { &pool.missions }
public fun pool_attestation_pubkey(pool: &ClipRewardPool): &vector<u8> { &pool.attestation_pubkey }

public fun mission_kind(mission: &Mission): u8 { mission.kind }
public fun mission_reward_per_claim(mission: &Mission): u64 { mission.reward_per_claim }
public fun mission_max_claims(mission: &Mission): u64 { mission.max_claims }
public fun mission_claims_made(mission: &Mission): u64 { mission.claims_made }
public fun mission_is_active(mission: &Mission): bool { mission.active }

public fun mission_kind_view(): u8 { MISSION_KIND_VIEW }
public fun mission_kind_like(): u8 { MISSION_KIND_LIKE }
public fun mission_kind_comment(): u8 { MISSION_KIND_COMMENT }
public fun mission_kind_share(): u8 { MISSION_KIND_SHARE }

public fun attestation_nonce_len(): u64 { ATTESTATION_NONCE_LEN }
