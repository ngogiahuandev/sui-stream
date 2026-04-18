#[test_only]
module sui_stream::access_tests;

use std::string;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario as ts;
use sui_stream::access::{Self, ClipAccess};
use sui_stream::clip::{Self, Clip};

const CREATOR: address = @0xA11CE;
const VIEWER: address = @0xB0B;
const PRICE_MIST: u64 = 500_000_000;

fun seal_id_32(): vector<u8> {
    let mut v = vector::empty<u8>();
    let mut i = 0u8;
    while (i < 32) {
        vector::push_back(&mut v, i);
        i = i + 1;
    };
    v
}

#[test]
fun create_private_clip_happy_path() {
    let mut scenario = ts::begin(CREATOR);
    let ctx = ts::ctx(&mut scenario);
    let clk = clock::create_for_testing(ctx);

    clip::create_private_clip(
        string::utf8(b"Locked"),
        string::utf8(b"Desc"),
        vector::empty<string::String>(),
        string::utf8(b"blob"),
        string::utf8(b"thumb"),
        30,
        PRICE_MIST,
        seal_id_32(),
        CREATOR,
        &clk,
        ctx,
    );

    ts::next_tx(&mut scenario, CREATOR);
    let clip_obj = ts::take_from_sender<Clip>(&scenario);
    assert!(clip::visibility(&clip_obj) == clip::visibility_private(), 100);
    assert!(clip::price_mist(&clip_obj) == PRICE_MIST, 101);
    assert!(vector::length(clip::seal_id(&clip_obj)) == 32, 102);
    ts::return_to_sender(&scenario, clip_obj);

    clock::destroy_for_testing(clk);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = sui_stream::clip::EInvalidSealId)]
fun rejects_private_clip_with_short_seal_id() {
    let mut scenario = ts::begin(CREATOR);
    let ctx = ts::ctx(&mut scenario);
    let clk = clock::create_for_testing(ctx);

    let mut bad = vector::empty<u8>();
    vector::push_back(&mut bad, 1);

    clip::create_private_clip(
        string::utf8(b"Locked"),
        string::utf8(b"Desc"),
        vector::empty<string::String>(),
        string::utf8(b"blob"),
        string::utf8(b"thumb"),
        30,
        PRICE_MIST,
        bad,
        CREATOR,
        &clk,
        ctx,
    );

    clock::destroy_for_testing(clk);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = sui_stream::clip::EZeroPrice)]
fun rejects_private_clip_with_zero_price() {
    let mut scenario = ts::begin(CREATOR);
    let ctx = ts::ctx(&mut scenario);
    let clk = clock::create_for_testing(ctx);

    clip::create_private_clip(
        string::utf8(b"Locked"),
        string::utf8(b"Desc"),
        vector::empty<string::String>(),
        string::utf8(b"blob"),
        string::utf8(b"thumb"),
        30,
        0,
        seal_id_32(),
        CREATOR,
        &clk,
        ctx,
    );

    clock::destroy_for_testing(clk);
    ts::end(scenario);
}

#[test]
fun unlock_clip_happy_path() {
    let mut scenario = ts::begin(CREATOR);
    let ctx = ts::ctx(&mut scenario);
    let clk = clock::create_for_testing(ctx);

    clip::create_private_clip(
        string::utf8(b"Locked"),
        string::utf8(b"Desc"),
        vector::empty<string::String>(),
        string::utf8(b"blob"),
        string::utf8(b"thumb"),
        30,
        PRICE_MIST,
        seal_id_32(),
        CREATOR,
        &clk,
        ctx,
    );

    ts::next_tx(&mut scenario, CREATOR);
    let clip_obj = ts::take_from_sender<Clip>(&scenario);
    transfer::public_transfer(clip_obj, CREATOR);

    ts::next_tx(&mut scenario, VIEWER);
    {
        let payment = coin::mint_for_testing<SUI>(PRICE_MIST + 1_000, ts::ctx(&mut scenario));
        let clip_ref = ts::take_from_address<Clip>(&scenario, CREATOR);
        access::unlock_clip(&clip_ref, payment, VIEWER, &clk, ts::ctx(&mut scenario));
        ts::return_to_address(CREATOR, clip_ref);
    };

    ts::next_tx(&mut scenario, VIEWER);
    {
        let access_obj = ts::take_from_sender<ClipAccess>(&scenario);
        assert!(access::viewer(&access_obj) == VIEWER, 200);
        assert!(access::paid_mist(&access_obj) == PRICE_MIST, 201);
        ts::return_to_sender(&scenario, access_obj);
    };

    clock::destroy_for_testing(clk);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = sui_stream::access::EInsufficientPayment)]
fun rejects_underpayment() {
    let mut scenario = ts::begin(CREATOR);
    let ctx = ts::ctx(&mut scenario);
    let clk = clock::create_for_testing(ctx);

    clip::create_private_clip(
        string::utf8(b"Locked"),
        string::utf8(b"Desc"),
        vector::empty<string::String>(),
        string::utf8(b"blob"),
        string::utf8(b"thumb"),
        30,
        PRICE_MIST,
        seal_id_32(),
        CREATOR,
        &clk,
        ctx,
    );

    ts::next_tx(&mut scenario, CREATOR);
    let clip_obj = ts::take_from_sender<Clip>(&scenario);
    transfer::public_transfer(clip_obj, CREATOR);

    ts::next_tx(&mut scenario, VIEWER);
    let payment = coin::mint_for_testing<SUI>(PRICE_MIST - 1, ts::ctx(&mut scenario));
    let clip_ref = ts::take_from_address<Clip>(&scenario, CREATOR);
    access::unlock_clip(&clip_ref, payment, VIEWER, &clk, ts::ctx(&mut scenario));
    ts::return_to_address(CREATOR, clip_ref);

    clock::destroy_for_testing(clk);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = sui_stream::access::ENotPrivate)]
fun rejects_unlock_on_public_clip() {
    let mut scenario = ts::begin(CREATOR);
    let ctx = ts::ctx(&mut scenario);
    let clk = clock::create_for_testing(ctx);

    clip::create_public_clip(
        string::utf8(b"Free"),
        string::utf8(b"Desc"),
        vector::empty<string::String>(),
        string::utf8(b"blob"),
        string::utf8(b"thumb"),
        30,
        CREATOR,
        &clk,
        ctx,
    );

    ts::next_tx(&mut scenario, CREATOR);
    let clip_obj = ts::take_from_sender<Clip>(&scenario);
    transfer::public_transfer(clip_obj, CREATOR);

    ts::next_tx(&mut scenario, VIEWER);
    let payment = coin::mint_for_testing<SUI>(1, ts::ctx(&mut scenario));
    let clip_ref = ts::take_from_address<Clip>(&scenario, CREATOR);
    access::unlock_clip(&clip_ref, payment, VIEWER, &clk, ts::ctx(&mut scenario));
    ts::return_to_address(CREATOR, clip_ref);

    clock::destroy_for_testing(clk);
    ts::end(scenario);
}
