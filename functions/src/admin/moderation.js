/**
 * Content Moderation Cloud Functions
 * Automatic moderation for posts using keyword filters, AI text review,
 * and image moderation via OpenAI.
 */

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

const COMMUNITY_STANDARDS =
  "Be respectful. No hate speech, harassment, threats, or explicit content. " +
  "No spam or self-promotion. No sharing of private information.";

// ---------------------------------------------------------------------------
// Helper: construct OpenAI client at runtime
// ---------------------------------------------------------------------------
async function makeOpenAI() {
  const apiKey = OPENAI_API_KEY.value();
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const {default: OpenAI} = await import("openai");
  return new OpenAI({apiKey});
}

// ---------------------------------------------------------------------------
// Helper: read keyword blocklist from config/moderationBlocklist
// ---------------------------------------------------------------------------
async function getBlocklist() {
  const db = admin.firestore();
  const snap = await db.doc("config/moderationBlocklist").get();
  if (!snap.exists) {
    return {exactMatch: [], patternMatch: []};
  }
  const data = snap.data();
  return {
    exactMatch: data.exactMatch || [],
    patternMatch: data.patternMatch || [],
  };
}

// ---------------------------------------------------------------------------
// Helper: check text against keyword blocklist
// ---------------------------------------------------------------------------
function checkKeywords(text, blocklist) {
  const lowerText = text.toLowerCase();

  // Exact match check (case-insensitive includes)
  for (const keyword of blocklist.exactMatch) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return {flagged: true, keyword, severity: "high"};
    }
  }

  // Pattern match check (regex)
  for (const pattern of blocklist.patternMatch) {
    try {
      const regex = new RegExp(pattern, "i");
      if (regex.test(text)) {
        return {flagged: true, keyword: pattern, severity: "medium"};
      }
    } catch (err) {
      logger.warn("Invalid regex pattern in blocklist", {pattern, error: err.message});
    }
  }

  return {flagged: false, keyword: null, severity: null};
}

// ---------------------------------------------------------------------------
// Helper: moderate an image via OpenAI moderation endpoint
// ---------------------------------------------------------------------------
async function moderateImage(openai, imageUrl) {
  const result = await openai.moderations.create({
    model: "omni-moderation-latest",
    input: [
      {
        type: "image_url",
        image_url: {url: imageUrl},
      },
    ],
  });

  const modResult = result.results[0];
  if (!modResult) return {flagged: false};

  if (modResult.flagged) {
    // Collect flagged categories
    const flaggedCategories = Object.entries(modResult.categories || {})
      .filter(([, v]) => v === true)
      .map(([k]) => k);

    // Determine severity based on scores
    const maxScore = Math.max(
      ...Object.values(modResult.category_scores || {}).map(Number).filter(Boolean),
    );
    const severity = maxScore > 0.8 ? "high" : "medium";

    return {
      flagged: true,
      categories: flaggedCategories,
      severity,
      reason: `Image flagged for: ${flaggedCategories.join(", ")}`,
    };
  }

  return {flagged: false};
}

// ---------------------------------------------------------------------------
// Helper: AI text review via GPT-4o-mini
// ---------------------------------------------------------------------------
async function aiReviewText(openai, content) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: {type: "json_object"},
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content:
          "You are a content moderator for a wellness community app. " +
          `Community standards: ${COMMUNITY_STANDARDS}\n\n` +
          "Review the following user post and respond with JSON: " +
          '{"flagged": boolean, "confidence": number (0-1), "reason": string, ' +
          '"severity": "low" | "medium" | "high"}. ' +
          "Only flag content that clearly violates community standards.",
      },
      {
        role: "user",
        content,
      },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) return {flagged: false, confidence: 0, reason: "", severity: "low"};

  const parsed = JSON.parse(text);
  return {
    flagged: Boolean(parsed.flagged),
    confidence: Number(parsed.confidence) || 0,
    reason: parsed.reason || "",
    severity: parsed.severity || "low",
  };
}

// ---------------------------------------------------------------------------
// Helper: add entry to moderationQueue
// ---------------------------------------------------------------------------
async function addToQueue(data) {
  const db = admin.firestore();
  await db.collection("moderationQueue").add({
    ...data,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ===========================================================================
// Cloud Function: onPostCreate_moderateContent
// Triggered when a new post is created. Runs keyword filter, image
// moderation, and AI text review.
// ===========================================================================
const onPostCreate_moderateContent = onDocumentCreated(
  {
    document: "posts/{postId}",
    region: "us-central1",
    secrets: [OPENAI_API_KEY],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const post = snap.data();
    if (!post) return;

    const postId = event.params.postId;

    // Skip already-reviewed or deleted posts
    if (post.deleted || post.moderationReviewed) {
      logger.info("Skipping moderation for post", {postId, deleted: !!post.deleted, reviewed: !!post.moderationReviewed});
      return;
    }

    const content = post.content || "";
    const userId = post.userId || null;
    let autoHidden = false;

    // ------------------------------------------------------------------
    // 1. Keyword filter
    // ------------------------------------------------------------------
    try {
      const blocklist = await getBlocklist();
      const keywordResult = checkKeywords(content, blocklist);

      if (keywordResult.flagged) {
        logger.info("Keyword filter flagged post", {postId, keyword: keywordResult.keyword});

        await addToQueue({
          postId,
          userId,
          content,
          source: "keyword_filter",
          severity: keywordResult.severity,
          reason: `Matched keyword: ${keywordResult.keyword}`,
        });

        // Auto-hide high severity
        if (keywordResult.severity === "high") {
          await snap.ref.update({hidden: true, hiddenReason: "auto-moderation"});
          autoHidden = true;
        }
      }
    } catch (err) {
      logger.error("Keyword filter error", {postId, error: err.message});
    }

    // ------------------------------------------------------------------
    // 2. Image moderation (if post has imageUrl)
    // ------------------------------------------------------------------
    if (post.imageUrl) {
      try {
        const openai = await makeOpenAI();
        const imageResult = await moderateImage(openai, post.imageUrl);

        if (imageResult.flagged) {
          logger.info("Image moderation flagged post", {postId, categories: imageResult.categories});

          await addToQueue({
            postId,
            userId,
            content,
            imageUrl: post.imageUrl,
            source: "ai_review",
            severity: imageResult.severity,
            reason: imageResult.reason,
          });

          // Auto-hide high severity
          if (imageResult.severity === "high" && !autoHidden) {
            await snap.ref.update({hidden: true, hiddenReason: "auto-moderation"});
            autoHidden = true;
          }
        }
      } catch (err) {
        logger.error("Image moderation error", {postId, error: err.message});
        await addToQueue({
          postId,
          userId,
          content,
          imageUrl: post.imageUrl,
          source: "moderation_error",
          severity: "medium",
          reason: `Image moderation API error: ${err.message}`,
        });
      }
    }

    // ------------------------------------------------------------------
    // 3. AI text review
    // ------------------------------------------------------------------
    if (content.trim()) {
      try {
        const openai = await makeOpenAI();
        const aiResult = await aiReviewText(openai, content);

        if (aiResult.flagged && aiResult.confidence > 0.5) {
          logger.info("AI review flagged post", {postId, confidence: aiResult.confidence, severity: aiResult.severity});

          await addToQueue({
            postId,
            userId,
            content,
            source: "ai_review",
            severity: aiResult.severity,
            reason: aiResult.reason,
            confidence: aiResult.confidence,
          });

          // Auto-hide high severity + high confidence
          if (aiResult.confidence > 0.8 && aiResult.severity === "high" && !autoHidden) {
            await snap.ref.update({hidden: true, hiddenReason: "auto-moderation"});
            autoHidden = true;
          }
        }
      } catch (err) {
        logger.error("AI text review error", {postId, error: err.message});
        await addToQueue({
          postId,
          userId,
          content,
          source: "moderation_error",
          severity: "medium",
          reason: `AI review API error: ${err.message}`,
        });
      }
    }

    // ------------------------------------------------------------------
    // Mark post as reviewed
    // ------------------------------------------------------------------
    try {
      await snap.ref.update({moderationReviewed: true});
    } catch (err) {
      logger.error("Failed to mark post as reviewed", {postId, error: err.message});
    }

    logger.info("Moderation complete for post", {postId, autoHidden});
  },
);

// ===========================================================================
// Cloud Function: onPostReport_createQueueItem
// Triggered when a user reports a post. Creates a moderationQueue entry.
// ===========================================================================
const onPostReport_createQueueItem = onDocumentCreated(
  {
    document: "postReports/{reportId}",
    region: "us-central1",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const report = snap.data();
    if (!report) return;

    const reportId = event.params.reportId;
    const {postId, reportedBy, reason} = report;

    if (!postId) {
      logger.warn("Post report missing postId", {reportId});
      return;
    }

    // Look up the reported post
    const db = admin.firestore();
    const postSnap = await db.doc(`posts/${postId}`).get();

    let postContent = "";
    let postUserId = null;
    let postImageUrl = null;

    if (postSnap.exists) {
      const postData = postSnap.data();
      postContent = postData.content || "";
      postUserId = postData.userId || null;
      postImageUrl = postData.imageUrl || null;
    } else {
      logger.warn("Reported post not found", {reportId, postId});
    }

    await addToQueue({
      postId,
      userId: postUserId,
      content: postContent,
      imageUrl: postImageUrl || null,
      source: "user_report",
      severity: "medium",
      reason: reason || "User reported this post",
      reportId,
      reportedBy: reportedBy || null,
    });

    logger.info("Created moderation queue item from user report", {reportId, postId});
  },
);

module.exports = {
  onPostCreate_moderateContent,
  onPostReport_createQueueItem,
};
