#[test_only]
module sui_stream::clip_tests;

use std::string;
use sui::clock;
use sui::test_scenario as ts;
use sui_stream::clip::{Self, Clip};

const CREATOR: address = @0xA11CE;

fun sample_tags(): vector<string::String> {
    let mut tags = vector::empty<string::String>();
    vector::push_back(&mut tags, string::utf8(b"nature"));
    vector::push_back(&mut tags, string::utf8(b"outdoor"));
    tags
}

#[test]
fun create_clip_happy_path() {
    let mut scenario = ts::begin(CREATOR);
    let ctx = ts::ctx(&mut scenario);
    let clk = clock::create_for_testing(ctx);

    clip::create_clip(
        string::utf8(b"My first clip"),
        string::utf8(b"A short description."),
        sample_tags(),
        string::utf8(b"blob-12345"),
        string::utf8(b"thumb-12345"),
        45,
        CREATOR,
        &clk,
        ctx,
    );

    ts::next_tx(&mut scenario, CREATOR);
    let clip_obj = ts::take_from_sender<Clip>(&scenario);
    assert!(clip::owner(&clip_obj) == CREATOR, 100);
    assert!(clip::duration_seconds(&clip_obj) == 45, 101);
    assert!(clip::views(&clip_obj) == 0, 102);
    assert!(clip::likes(&clip_obj) == 0, 103);
    ts::return_to_sender(&scenario, clip_obj);

    clock::destroy_for_testing(clk);
    ts::end(scenario);
}

#[test]
fun increment_views_and_likes() {
    let mut scenario = ts::begin(CREATOR);
    let ctx = ts::ctx(&mut scenario);
    let clk = clock::create_for_testing(ctx);

    clip::create_clip(
        string::utf8(b"Title"),
        string::utf8(b"Desc"),
        vector::empty<string::String>(),
        string::utf8(b"blob"),
        string::utf8(b"thumb"),
        10,
        CREATOR,
        &clk,
        ctx,
    );

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut clip_obj = ts::take_from_sender<Clip>(&scenario);
        clip::increment_views(&mut clip_obj);
        clip::increment_views(&mut clip_obj);
        clip::like_clip(&mut clip_obj);
        assert!(clip::views(&clip_obj) == 2, 200);
        assert!(clip::likes(&clip_obj) == 1, 201);
        ts::return_to_sender(&scenario, clip_obj);
    };

    clock::destroy_for_testing(clk);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = sui_stream::clip::EDurationTooLong)]
fun rejects_clip_over_60_seconds() {
    let mut scenario = ts::begin(CREATOR);
    let ctx = ts::ctx(&mut scenario);
    let clk = clock::create_for_testing(ctx);

    clip::create_clip(
        string::utf8(b"Title"),
        string::utf8(b"Desc"),
        vector::empty<string::String>(),
        string::utf8(b"blob"),
        string::utf8(b"thumb"),
        61,
        CREATOR,
        &clk,
        ctx,
    );

    clock::destroy_for_testing(clk);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = sui_stream::clip::ETooManyTags)]
fun rejects_too_many_tags() {
    let mut scenario = ts::begin(CREATOR);
    let ctx = ts::ctx(&mut scenario);
    let clk = clock::create_for_testing(ctx);

    let mut tags = vector::empty<string::String>();
    let mut i = 0;
    while (i < 4) {
        vector::push_back(&mut tags, string::utf8(b"tag"));
        i = i + 1;
    };

    clip::create_clip(
        string::utf8(b"Title"),
        string::utf8(b"Desc"),
        tags,
        string::utf8(b"blob"),
        string::utf8(b"thumb"),
        30,
        CREATOR,
        &clk,
        ctx,
    );

    clock::destroy_for_testing(clk);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = sui_stream::clip::EEmptyTitle)]
fun rejects_empty_title() {
    let mut scenario = ts::begin(CREATOR);
    let ctx = ts::ctx(&mut scenario);
    let clk = clock::create_for_testing(ctx);

    clip::create_clip(
        string::utf8(b""),
        string::utf8(b"Desc"),
        vector::empty<string::String>(),
        string::utf8(b"blob"),
        string::utf8(b"thumb"),
        30,
        CREATOR,
        &clk,
        ctx,
    );

    clock::destroy_for_testing(clk);
    ts::end(scenario);
}