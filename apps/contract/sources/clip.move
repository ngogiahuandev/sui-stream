module sui_stream::clip;

use std::string::{Self, String};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;

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
const EInvalidVoteType: u64 = 10;
const EVoteClipMismatch: u64 = 11;

const VOTE_UPVOTE: u8 = 1;
const VOTE_DOWNVOTE: u8 = 2;

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

public struct Vote has key, store {
    id: UID,
    clip_id: ID,
    voter: address,
    vote_type: u8,
    created_at_ms: u64,
}

public struct VoteCast has copy, drop {
    vote_id: ID,
    clip_id: ID,
    voter: address,
    vote_type: u8,
    created_at_ms: u64,
}

public struct VoteRemoved has copy, drop {
    vote_id: ID,
    clip_id: ID,
    voter: address,
    vote_type: u8,
    removed_at_ms: u64,
}

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

public fun track_view(
    clip_id: ID,
    _viewer: address,
    _ctx: &TxContext,
) {
    event::emit(ClipViewed { id: clip_id });
}

public struct Subscription has key, store {
    id: UID,
    subscriber: address,
    target: address,
    created_at_ms: u64,
}

public struct Subscribed has copy, drop {
    subscription_id: ID,
    subscriber: address,
    target: address,
    created_at_ms: u64,
}

public struct Unsubscribed has copy, drop {
    subscription_id: ID,
    subscriber: address,
    target: address,
    removed_at_ms: u64,
}

const ESubscribeSelf: u64 = 12;
const ESubscriberMismatch: u64 = 13;
const ECommentEmpty: u64 = 14;
const ECommentTooLong: u64 = 15;
const ECommentAuthorMismatch: u64 = 16;
const ECommentClipMismatch: u64 = 17;

const MAX_COMMENT_WORDS: u64 = 500;

public fun subscribe(
    subscriber: address,
    target: address,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(subscriber != target, ESubscribeSelf);
    let created_at_ms = clock.timestamp_ms();
    let id = object::new(ctx);
    let subscription_id = object::uid_to_inner(&id);

    let sub = Subscription {
        id,
        subscriber,
        target,
        created_at_ms,
    };

    event::emit(Subscribed {
        subscription_id,
        subscriber,
        target,
        created_at_ms,
    });

    transfer::public_share_object(sub);
}

public fun unsubscribe(
    sub: Subscription,
    subscriber: address,
    clock: &Clock,
    _ctx: &TxContext,
) {
    assert!(sub.subscriber == subscriber, ESubscriberMismatch);

    let Subscription {
        id,
        subscriber: stored_subscriber,
        target,
        created_at_ms: _,
    } = sub;
    let subscription_id = object::uid_to_inner(&id);

    event::emit(Unsubscribed {
        subscription_id,
        subscriber: stored_subscriber,
        target,
        removed_at_ms: clock.timestamp_ms(),
    });

    object::delete(id);
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

public struct Comment has key, store {
    id: UID,
    clip_id: ID,
    author: address,
    content: String,
    created_at_ms: u64,
}

public struct CommentCreated has copy, drop {
    comment_id: ID,
    clip_id: ID,
    author: address,
    content: String,
    created_at_ms: u64,
}

public struct CommentDeleted has copy, drop {
    comment_id: ID,
    clip_id: ID,
    author: address,
    removed_at_ms: u64,
}

fun count_words(content: &String): u64 {
    let bytes = string::as_bytes(content);
    let len = vector::length(bytes);
    let mut count = 0;
    let mut in_word = false;
    let mut i = 0;
    while (i < len) {
        let b = *vector::borrow(bytes, i);
        let is_ws = b == 0x20 || b == 0x09 || b == 0x0A || b == 0x0D;
        if (is_ws) {
            in_word = false;
        } else if (!in_word) {
            in_word = true;
            count = count + 1;
        };
        i = i + 1;
    };
    count
}

fun validate_comment(content: &String) {
    let word_count = count_words(content);
    assert!(word_count > 0, ECommentEmpty);
    assert!(word_count <= MAX_COMMENT_WORDS, ECommentTooLong);
}

public fun create_comment(
    clip_id: ID,
    author: address,
    content: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    validate_comment(&content);
    let created_at_ms = clock.timestamp_ms();
    let id = object::new(ctx);
    let comment_id = object::uid_to_inner(&id);

    let comment = Comment {
        id,
        clip_id,
        author,
        content,
        created_at_ms,
    };

    event::emit(CommentCreated {
        comment_id,
        clip_id,
        author,
        content: comment.content,
        created_at_ms,
    });

    transfer::public_share_object(comment);
}

public fun delete_comment(
    comment: Comment,
    clip_id: ID,
    author: address,
    clock: &Clock,
    _ctx: &TxContext,
) {
    assert!(comment.clip_id == clip_id, ECommentClipMismatch);
    assert!(comment.author == author, ECommentAuthorMismatch);

    let Comment {
        id,
        clip_id: stored_clip_id,
        author: stored_author,
        content: _,
        created_at_ms: _,
    } = comment;
    let comment_id = object::uid_to_inner(&id);

    event::emit(CommentDeleted {
        comment_id,
        clip_id: stored_clip_id,
        author: stored_author,
        removed_at_ms: clock.timestamp_ms(),
    });

    object::delete(id);
}

public fun comment_clip_id(comment: &Comment): ID { comment.clip_id }
public fun comment_author(comment: &Comment): address { comment.author }
public fun comment_content(comment: &Comment): &String { &comment.content }
public fun comment_created_at_ms(comment: &Comment): u64 { comment.created_at_ms }

public fun vote_clip_id(vote: &Vote): ID { vote.clip_id }
public fun vote_voter(vote: &Vote): address { vote.voter }
public fun vote_type(vote: &Vote): u8 { vote.vote_type }
public fun vote_created_at_ms(vote: &Vote): u64 { vote.created_at_ms }

public fun vote_clip(
    clip_id: ID,
    vote_type: u8,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(
        vote_type == VOTE_UPVOTE || vote_type == VOTE_DOWNVOTE,
        EInvalidVoteType,
    );
    let voter = tx_context::sender(ctx);
    let created_at_ms = clock.timestamp_ms();
    let id = object::new(ctx);
    let vote_id = object::uid_to_inner(&id);

    let vote = Vote {
        id,
        clip_id,
        voter,
        vote_type,
        created_at_ms,
    };

    event::emit(VoteCast {
        vote_id,
        clip_id,
        voter,
        vote_type,
        created_at_ms,
    });

    transfer::public_transfer(vote, voter);
}

public fun cast_vote(
    clip_id: ID,
    voter: address,
    vote_type: u8,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(
        vote_type == VOTE_UPVOTE || vote_type == VOTE_DOWNVOTE,
        EInvalidVoteType,
    );
    let created_at_ms = clock.timestamp_ms();
    let id = object::new(ctx);
    let vote_id = object::uid_to_inner(&id);

    let vote = Vote {
        id,
        clip_id,
        voter,
        vote_type,
        created_at_ms,
    };

    event::emit(VoteCast {
        vote_id,
        clip_id,
        voter,
        vote_type,
        created_at_ms,
    });

    transfer::public_share_object(vote);
}

public fun remove_vote(
    vote: Vote,
    clip_id: ID,
    clock: &Clock,
    _ctx: &TxContext,
) {
    assert!(vote.clip_id == clip_id, EVoteClipMismatch);

    let Vote {
        id,
        clip_id: stored_clip_id,
        voter,
        vote_type,
        created_at_ms: _,
    } = vote;
    let vote_id = object::uid_to_inner(&id);

    event::emit(VoteRemoved {
        vote_id,
        clip_id: stored_clip_id,
        voter,
        vote_type,
        removed_at_ms: clock.timestamp_ms(),
    });

    object::delete(id);
}

const EDonateSelf: u64 = 18;
const EDonateZero: u64 = 19;
const EDonateMessageTooLong: u64 = 20;

const MAX_DONATE_MESSAGE_WORDS: u64 = 200;

public struct DonationSent has copy, drop {
    donor: address,
    recipient: address,
    amount: u64,
    message: String,
    created_at_ms: u64,
}

public fun donate(
    recipient: address,
    payment: Coin<SUI>,
    message: String,
    clock: &Clock,
    ctx: &TxContext,
) {
    let donor = tx_context::sender(ctx);
    assert!(donor != recipient, EDonateSelf);

    let amount = coin::value(&payment);
    assert!(amount > 0, EDonateZero);

    if (string::length(&message) > 0) {
        let words = count_words(&message);
        assert!(words <= MAX_DONATE_MESSAGE_WORDS, EDonateMessageTooLong);
    };

    event::emit(DonationSent {
        donor,
        recipient,
        amount,
        message,
        created_at_ms: clock.timestamp_ms(),
    });

    transfer::public_transfer(payment, recipient);
}