module sui_stream::access;

use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui_stream::clip::{Self, Clip};

const VISIBILITY_PRIVATE: u8 = 1;

const ENotPrivate: u64 = 100;
const EInsufficientPayment: u64 = 101;
const EWrongClip: u64 = 102;
const EWrongViewer: u64 = 103;
const ESealIdMismatch: u64 = 104;
const ENotOwner: u64 = 105;

public struct ClipAccess has key {
    id: UID,
    clip_id: ID,
    viewer: address,
    unlocked_at_ms: u64,
    paid_mist: u64,
}

public struct ClipUnlocked has copy, drop {
    clip_id: ID,
    viewer: address,
    paid_mist: u64,
    unlocked_at_ms: u64,
}

/// Pay to unlock a private clip. Mints a non-transferable ClipAccess to `viewer`.
/// `viewer` is passed explicitly so a sponsor can submit on behalf of the user.
public fun unlock_clip(
    clip: &Clip,
    mut payment: Coin<SUI>,
    viewer: address,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(clip::visibility(clip) == VISIBILITY_PRIVATE, ENotPrivate);
    let price = clip::price_mist(clip);
    assert!(coin::value(&payment) >= price, EInsufficientPayment);

    let clip_id = object::uid_to_inner(clip::id(clip));
    let unlocked_at_ms = clock.timestamp_ms();

    let exact = coin::split(&mut payment, price, ctx);
    transfer::public_transfer(exact, clip::owner(clip));

    let payer = tx_context::sender(ctx);
    if (coin::value(&payment) > 0) {
        transfer::public_transfer(payment, payer);
    } else {
        coin::destroy_zero(payment);
    };

    let access = ClipAccess {
        id: object::new(ctx),
        clip_id,
        viewer,
        unlocked_at_ms,
        paid_mist: price,
    };

    event::emit(ClipUnlocked {
        clip_id,
        viewer,
        paid_mist: price,
        unlocked_at_ms,
    });

    transfer::transfer(access, viewer);
}

/// Seal key-server policy: paid viewer.
/// Aborts if anything is wrong; otherwise key servers release the share.
entry fun seal_approve_unlock(
    seal_id: vector<u8>,
    clip: &Clip,
    access: &ClipAccess,
    ctx: &TxContext,
) {
    assert!(clip::seal_id(clip) == &seal_id, ESealIdMismatch);
    let clip_id = object::uid_to_inner(clip::id(clip));
    assert!(access.clip_id == clip_id, EWrongClip);
    assert!(access.viewer == tx_context::sender(ctx), EWrongViewer);
}

/// Seal key-server policy: clip owner short-circuit.
entry fun seal_approve_owner(
    seal_id: vector<u8>,
    clip: &Clip,
    ctx: &TxContext,
) {
    assert!(clip::seal_id(clip) == &seal_id, ESealIdMismatch);
    assert!(clip::owner(clip) == tx_context::sender(ctx), ENotOwner);
}

public fun clip_id(access: &ClipAccess): ID { access.clip_id }
public fun viewer(access: &ClipAccess): address { access.viewer }
public fun unlocked_at_ms(access: &ClipAccess): u64 { access.unlocked_at_ms }
public fun paid_mist(access: &ClipAccess): u64 { access.paid_mist }
