module sui_stream::clip;

use std::string::{Self, String};
use sui::clock::Clock;
use sui::event;

const MAX_DURATION_SECONDS: u64 = 3600;
const MAX_TITLE_LEN: u64 = 80;
const MAX_DESCRIPTION_LEN: u64 = 500;
const MAX_TAGS: u64 = 3;
const MAX_TAG_LEN: u64 = 24;
const MAX_BLOB_ID_LEN: u64 = 128;

const EDurationTooLong: u64 = 1;
const ETitleTooLong: u64 = 2;
const EDescriptionTooLong: u64 = 3;
const ETooManyTags: u64 = 4;
const ETagTooLong: u64 = 5;
const EBlobIdEmpty: u64 = 6;
const EBlobIdTooLong: u64 = 7;
const ENotOwner: u64 = 8;
const EEmptyTitle: u64 = 9;

public struct Clip has key, store {
    id: UID,
    owner: address,
    title: String,
    description: String,
    tags: vector<String>,
    blob_id: String,
    thumbnail_blob_id: String,
    duration_seconds: u64,
    likes: u64,
    views: u64,
    created_at_ms: u64,
}

public struct ClipCreated has copy, drop {
    id: ID,
    owner: address,
    blob_id: String,
    thumbnail_blob_id: String,
    duration_seconds: u64,
    created_at_ms: u64,
}

public struct ClipViewed has copy, drop { id: ID }
public struct ClipLiked has copy, drop { id: ID }
public struct ClipUpdated has copy, drop { id: ID }
public struct ClipDeleted has copy, drop { id: ID }

fun validate_metadata(
    title: &String,
    description: &String,
    tags: &vector<String>,
) {
    let title_len = string::length(title);
    assert!(title_len > 0, EEmptyTitle);
    assert!(title_len <= MAX_TITLE_LEN, ETitleTooLong);
    assert!(string::length(description) <= MAX_DESCRIPTION_LEN, EDescriptionTooLong);

    let tag_count = vector::length(tags);
    assert!(tag_count <= MAX_TAGS, ETooManyTags);

    let mut i = 0;
    while (i < tag_count) {
        let tag = vector::borrow(tags, i);
        assert!(string::length(tag) <= MAX_TAG_LEN, ETagTooLong);
        i = i + 1;
    };
}

fun validate_blob_id(blob_id: &String) {
    let len = string::length(blob_id);
    assert!(len > 0, EBlobIdEmpty);
    assert!(len <= MAX_BLOB_ID_LEN, EBlobIdTooLong);
}

public fun create_clip(
    title: String,
    description: String,
    tags: vector<String>,
    blob_id: String,
    thumbnail_blob_id: String,
    duration_seconds: u64,
    recipient: address,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let created_at_ms = clock.timestamp_ms();
    let id = object::new(ctx);
    let clip_id = object::uid_to_inner(&id);

    validate_metadata(&title, &description, &tags);
    validate_blob_id(&blob_id);
    validate_blob_id(&thumbnail_blob_id);
    assert!(duration_seconds > 0, EDurationTooLong);
    assert!(duration_seconds <= MAX_DURATION_SECONDS, EDurationTooLong);

    let clip = Clip {
        id,
        owner: recipient,
        title,
        description,
        tags,
        blob_id,
        thumbnail_blob_id,
        duration_seconds,
        likes: 0,
        views: 0,
        created_at_ms,
    };

    event::emit(ClipCreated {
        id: clip_id,
        owner: recipient,
        blob_id: clip.blob_id,
        thumbnail_blob_id: clip.thumbnail_blob_id,
        duration_seconds,
        created_at_ms,
    });

    transfer::public_transfer(clip, recipient);
}

public fun increment_views(clip: &mut Clip) {
    clip.views = clip.views + 1;
    event::emit(ClipViewed { id: object::uid_to_inner(&clip.id) });
}

public fun like_clip(clip: &mut Clip) {
    clip.likes = clip.likes + 1;
    event::emit(ClipLiked { id: object::uid_to_inner(&clip.id) });
}

public fun update_metadata(
    clip: &mut Clip,
    title: String,
    description: String,
    tags: vector<String>,
    ctx: &TxContext,
) {
    assert!(clip.owner == tx_context::sender(ctx), ENotOwner);
    validate_metadata(&title, &description, &tags);
    clip.title = title;
    clip.description = description;
    clip.tags = tags;
    event::emit(ClipUpdated { id: object::uid_to_inner(&clip.id) });
}

public fun delete_clip(clip: Clip, ctx: &TxContext) {
    assert!(clip.owner == tx_context::sender(ctx), ENotOwner);
    let Clip {
        id,
        owner: _,
        title: _,
        description: _,
        tags: _,
        blob_id: _,
        thumbnail_blob_id: _,
        duration_seconds: _,
        likes: _,
        views: _,
        created_at_ms: _,
    } = clip;
    let inner = object::uid_to_inner(&id);
    event::emit(ClipDeleted { id: inner });
    object::delete(id);
}

public fun id(clip: &Clip): &UID { &clip.id }
public fun owner(clip: &Clip): address { clip.owner }
public fun title(clip: &Clip): &String { &clip.title }
public fun description(clip: &Clip): &String { &clip.description }
public fun tags(clip: &Clip): &vector<String> { &clip.tags }
public fun blob_id(clip: &Clip): &String { &clip.blob_id }
public fun thumbnail_blob_id(clip: &Clip): &String { &clip.thumbnail_blob_id }
public fun duration_seconds(clip: &Clip): u64 { clip.duration_seconds }
public fun likes(clip: &Clip): u64 { clip.likes }
public fun views(clip: &Clip): u64 { clip.views }
public fun created_at_ms(clip: &Clip): u64 { clip.created_at_ms }