// Vara protocol library — Phase 1 launch set (11 families, 16 variants).
//
// Sourced from:
//   - docs/Vara_Brain_State_Model_v2.2.md (evidence tiers, mechanisms,
//     state mapping, contraindications)
//   - docs/Vara_Protocol_Detail_Content.md (per-protocol copy:
//     whatItIs / howItWorks / whenItFits / first-time orientation)
//   - docs/Vara_NSDR_Audio_Scripts.md (NSDR step structure and audio
//     paths in Firebase Storage)
//
// Naming scheme: every id suffixes a duration ({family}-{minutes}) so a
// future variant addition does not force a rename. See LEGACY_PROTOCOL_ID_MAP
// in utils/protocolIdNormalizer.ts for the migration of old check-in docs.
//
// Validation: all 16 variants are exercised by
//   constants/__tests__/brainStateProtocols.test.ts
// which asserts step durations sum to durationSeconds and breath
// protocols end on a complete cycle boundary.

import type { BrainState, Protocol } from '../types/models';

// One Protocol object per variant. `satisfies` keeps the literal-key
// narrowing (so `ProtocolId` resolves to the exact union of variant ids)
// while still type-checking each value against the Protocol shape.
export const BRAIN_STATE_PROTOCOLS = {
  // ----- TIER 1 -----

  'cyclic-sighing-2': {
    id: 'cyclic-sighing-2',
    family: 'cyclic-sighing',
    name: 'Cyclic Sighing',
    description:
      'Two short inhales through the nose, one long exhale through the mouth. Activates recovery in two minutes.',
    whatItIs:
      'Two consecutive inhales through your nose, followed by one long exhale through your mouth. Repeated for two minutes. Sometimes called the "physiological sigh."',
    whatYoullNeed:
      'Nothing. Works seated, standing, or lying down — including in public.',
    howItWorks:
      'Long exhales activate your parasympathetic nervous system through the vagus nerve. The double-inhale reinflates collapsed alveoli and signals your body to down-shift arousal.',
    whenItFits:
      'Wired — when you need to settle quickly. Two minutes is meaningful; five minutes is the research-validated duration. We ship the two-minute version.',
    firstTimeOrientation: {
      whatYoullDo:
        'Two short inhales through your nose, then one long exhale through your mouth. Repeat for two minutes. We pace it visually.',
      whatYoullNeed: 'Nothing. Works in any position.',
      whyItWorks:
        "Long exhales activate your body's recovery pathway. The strongest brief breathwork evidence in consumer wellness — Stanford 2023.",
    },
    evidenceTier: 1,
    evidenceCitation: 'Balban et al. (2023), Cell Reports Medicine.',
    durationSeconds: 120,
    timeWindow: 2,
    modality: 'breath',
    suitableForStates: ['wired'],
    suitableForTimesOfDay: [],
    steps: [
      {
        kind: 'breath',
        id: 'cycle',
        durationSeconds: 120,
        phases: [
          { kind: 'inhale', seconds: 1.5, label: 'Inhale' },
          { kind: 'inhale', seconds: 1, label: 'Top up' },
          { kind: 'exhale', seconds: 5, label: 'Exhale' },
        ],
        guidance:
          'Two short inhales through the nose, then one long exhale through the mouth.',
      },
    ],
  },

  'brief-movement-5': {
    id: 'brief-movement-5',
    family: 'brief-movement',
    name: 'Light Movement',
    description:
      'A short bout of movement to wake up cognition or channel energy.',
    whatItIs:
      'A short bout of structured movement — a brisk walk, jumping jacks, stairs, bodyweight squats, or a simple yoga flow. Pick the movement that fits your space and energy.',
    whatYoullNeed:
      'Nothing required. If you have access to outside or stairs, even better — but any space where you can move counts.',
    howItWorks:
      "Brief movement increases cerebral blood flow and releases norepinephrine, directly addressing the neurochemistry of cognitive fatigue. Longer sessions also release BDNF, a brain growth factor. When you're Foggy, movement activates. When you're Alive, movement channels the energy you already have.",
    whenItFits:
      'Foggy — when your brain feels cloudy and you need gentle activation. Alive — when you have energy and want to give it somewhere useful. Also good as a first protocol in the morning to transition out of sleep inertia.',
    contraindications:
      'Adjust for mobility limitations. If you have cardiac or musculoskeletal concerns, keep the intensity and duration moderate, or consult your clinician.',
    firstTimeOrientation: {
      whatYoullDo:
        'Move your body for a few minutes — walking, light cardio, stretching, or a flow. You pick what works for your space and energy.',
      whatYoullNeed:
        'Nothing required. Outside or stairs if you have access; otherwise any space you can move in.',
      whyItWorks:
        'Brief movement increases blood flow to your brain and releases norepinephrine — the strongest direct antidote to cognitive fatigue we have.',
    },
    evidenceTier: 1,
    evidenceCitation:
      'Decades of peer-reviewed research on acute cognitive benefits of brief exercise.',
    durationSeconds: 300,
    timeWindow: 5,
    modality: 'movement',
    suitableForStates: ['foggy', 'alive'],
    suitableForTimesOfDay: [
      'early_morning',
      'mid_morning',
      'midday',
      'early_afternoon',
    ],
    // The timer step's `hint` is overridden at runtime by the
    // pre-step modality picker (Walk vs Stretch). The static value
    // here is the fallback shown only if the picker is bypassed.
    steps: [
      {
        kind: 'timer',
        id: 'move',
        durationSeconds: 300,
        label: 'Light movement',
        hint: 'Move at a comfortable pace.',
      },
    ],
  },

  'brief-movement-10': {
    id: 'brief-movement-10',
    family: 'brief-movement',
    name: 'Light Movement',
    description:
      'A short bout of movement to wake up cognition or channel energy.',
    whatItIs:
      'A short bout of structured movement — a brisk walk, jumping jacks, stairs, bodyweight squats, or a simple yoga flow. Pick the movement that fits your space and energy.',
    whatYoullNeed:
      'Nothing required. If you have access to outside or stairs, even better — but any space where you can move counts.',
    howItWorks:
      "Brief movement increases cerebral blood flow and releases norepinephrine, directly addressing the neurochemistry of cognitive fatigue. Longer sessions also release BDNF, a brain growth factor. When you're Foggy, movement activates. When you're Alive, movement channels the energy you already have.",
    whenItFits:
      'Foggy — when your brain feels cloudy and you need gentle activation. Alive — when you have energy and want to give it somewhere useful. Also good as a first protocol in the morning to transition out of sleep inertia.',
    contraindications:
      'Adjust for mobility limitations. If you have cardiac or musculoskeletal concerns, keep the intensity and duration moderate, or consult your clinician.',
    firstTimeOrientation: {
      whatYoullDo:
        'Move your body for ten minutes — walking, light cardio, stretching, or a flow. You pick what works for your space and energy.',
      whatYoullNeed:
        'Nothing required. Outside or stairs if you have access; otherwise any space you can move in.',
      whyItWorks:
        'Brief movement increases blood flow to your brain and releases norepinephrine — the strongest direct antidote to cognitive fatigue we have.',
    },
    evidenceTier: 1,
    evidenceCitation:
      'Decades of peer-reviewed research on acute cognitive benefits of brief exercise.',
    durationSeconds: 600,
    timeWindow: 10,
    modality: 'movement',
    suitableForStates: ['foggy', 'alive'],
    suitableForTimesOfDay: [
      'early_morning',
      'mid_morning',
      'midday',
      'early_afternoon',
    ],
    // The timer step's `hint` is overridden at runtime by the
    // pre-step modality picker (Walk vs Stretch). The static value
    // here is the fallback shown only if the picker is bypassed.
    steps: [
      {
        kind: 'timer',
        id: 'move',
        durationSeconds: 600,
        label: 'Light movement',
        hint: 'Move at a comfortable pace.',
      },
    ],
  },

  // ----- TIER 2 -----

  'box-breathing-2': {
    id: 'box-breathing-2',
    family: 'box-breathing',
    name: 'Box Breathing',
    description:
      'Four in, four hold, four out, four hold. Structured rhythm that holds up under pressure.',
    whatItIs:
      'Inhale for four seconds, hold for four, exhale for four, hold for four. Repeat the pattern. We pace it for you with a visual guide.',
    whatYoullNeed:
      'Nothing. Works seated, standing, even standing in line somewhere.',
    howItWorks:
      'The four-phase balanced rhythm regulates autonomic tone. The held phases add a mild parasympathetic reset between cycles, which is why this protocol feels more structured than extended-exhale breathwork. Taught in military tactical training and emergency response — it works under pressure.',
    whenItFits:
      'Wired — when you need to settle but want something structured to focus on. Steady — when you want to maintain the state and strengthen your capacity over time.',
    contraindications:
      'Users with anxiety disorders sometimes find breath retention triggering. If the holds feel uncomfortable, try Extended Exhale instead — same mechanism without the held phases.',
    firstTimeOrientation: {
      whatYoullDo:
        'Four seconds in, four held, four out, four held. Repeat for two minutes. We pace it visually.',
      whatYoullNeed: 'Nothing.',
      whyItWorks:
        'Balanced rhythm regulates your nervous system. Used in Navy SEAL training because it holds up under pressure.',
    },
    evidenceTier: 2,
    evidenceCitation:
      'Stanford 2023 trial (Balban et al.); positive effect, smaller than cyclic sighing.',
    // 8 complete cycles × 16s = 128s. Lands on a clean cycle boundary;
    // user-facing label is "2 min" via timeWindow.
    durationSeconds: 128,
    timeWindow: 2,
    modality: 'breath',
    suitableForStates: ['wired', 'steady'],
    suitableForTimesOfDay: [],
    steps: [
      {
        kind: 'breath',
        id: 'cycle',
        durationSeconds: 128,
        phases: [
          { kind: 'inhale', seconds: 4, label: 'Inhale' },
          { kind: 'hold', seconds: 4, label: 'Hold' },
          { kind: 'exhale', seconds: 4, label: 'Exhale' },
          { kind: 'hold', seconds: 4, label: 'Hold' },
        ],
        guidance:
          'Four in, four hold, four out, four hold. Match the visual.',
      },
    ],
  },

  'extended-exhale-2': {
    id: 'extended-exhale-2',
    family: 'extended-exhale',
    name: 'Extended Exhale',
    description:
      'Inhale four seconds, exhale eight. Steady, unhurried, settles a racing mind.',
    whatItIs:
      'Inhale for four seconds through your nose, exhale for eight seconds through your mouth. No holds. A steady, unhurried pattern you can settle into.',
    whatYoullNeed: 'Nothing. Works anywhere.',
    howItWorks:
      'The 1:2 inhale-to-exhale ratio drives parasympathetic activation through extended vagal stimulation — the same mechanism as cyclic sighing, in a smoother rhythm.',
    whenItFits:
      'Wired — when you need to down-regulate and want something gentle and sustained. Also works as a transition into sleep preparation.',
    firstTimeOrientation: {
      whatYoullDo:
        'Breathe in for four seconds, out for eight. Repeat. We pace it.',
      whatYoullNeed: 'Nothing.',
      whyItWorks:
        "Long exhales activate your body's recovery pathway. Same mechanism as cyclic sighing, simpler rhythm.",
    },
    evidenceTier: 2,
    evidenceCitation:
      'Same physiological mechanism as cyclic sighing; clinical breath-based anxiety treatment.',
    durationSeconds: 120,
    timeWindow: 2,
    modality: 'breath',
    suitableForStates: ['wired'],
    suitableForTimesOfDay: [],
    steps: [
      {
        kind: 'breath',
        id: 'cycle',
        durationSeconds: 120,
        phases: [
          { kind: 'inhale', seconds: 4, label: 'Inhale' },
          { kind: 'exhale', seconds: 8, label: 'Exhale' },
        ],
        guidance: 'Inhale four, exhale eight. Let each exhale soften.',
      },
    ],
  },

  'coherence-breathing-5': {
    id: 'coherence-breathing-5',
    family: 'coherence-breathing',
    name: 'Coherence Breathing',
    description:
      'Five in, five out. Six breaths a minute — the rate that builds long-term flexibility.',
    whatItIs:
      "Inhale for five seconds, exhale for five seconds. No holds. About six breaths per minute, slower than most people's default.",
    whatYoullNeed: 'Nothing. Can be done seated, standing, or lying down.',
    howItWorks:
      "Six breaths per minute is the resonant breathing rate — the pace that maximizes heart rate variability, a key marker of autonomic flexibility. Over time, this strengthens your nervous system's capacity to shift states efficiently.",
    whenItFits:
      "Steady — maintenance practice that strengthens your baseline. Clear — protects and deepens the state you're in. A practice you return to over weeks and months.",
    firstTimeOrientation: {
      whatYoullDo:
        'Breathe in for five seconds, out for five seconds. Keep it even. We pace it for you.',
      whatYoullNeed: 'Nothing.',
      whyItWorks:
        'Six breaths per minute is the rate that builds long-term nervous-system flexibility. Practice over weeks, not sessions.',
    },
    evidenceTier: 2,
    evidenceCitation:
      'HRV biofeedback research; clinical use for anxiety and stress management.',
    durationSeconds: 300,
    timeWindow: 5,
    modality: 'breath',
    suitableForStates: ['steady', 'clear'],
    suitableForTimesOfDay: [],
    steps: [
      {
        kind: 'breath',
        id: 'cycle',
        durationSeconds: 300,
        phases: [
          { kind: 'inhale', seconds: 5, label: 'Inhale' },
          { kind: 'exhale', seconds: 5, label: 'Exhale' },
        ],
        guidance: 'Five in, five out. Steady and even.',
      },
    ],
  },

  'nsdr-10': {
    id: 'nsdr-10',
    family: 'nsdr',
    name: 'NSDR',
    description:
      'Non-Sleep Deep Rest. Conscious deep relaxation, guided by audio.',
    whatItIs:
      'Non-Sleep Deep Rest — a guided practice of deep relaxation while conscious. You lie down, close your eyes, and an audio guide walks your attention through a body scan and breath awareness. You stay conscious but your brain shifts into patterns associated with deep rest.',
    whatYoullNeed:
      "A quiet space where you can lie down. Headphones recommended but not required. Somewhere you won't be interrupted.",
    howItWorks:
      'NSDR produces brainwave patterns similar to deep sleep while you remain conscious. Studies show it reduces cortisol, restores dopamine, and quiets the default-mode network — the mental chatter that makes Foggy states feel heavy. When fog comes from cognitive overwork rather than understimulation, rest is the intervention.',
    whenItFits:
      "Foggy — specifically when you're cognitively exhausted rather than just low-energy. Afternoon slump after hours of focused work. Evening transitions before sleep. A midday reset when the morning has drained you.",
    contraindications:
      'Users with recent trauma may find body-focused practices activating rather than calming. Start with shorter sessions and notice how you respond. If lying face-up feels vulnerable, try a seated version.',
    firstTimeOrientation: {
      whatYoullDo:
        'Lie down somewhere quiet. Close your eyes. An audio guide walks your attention through your body and breath. You stay conscious but deeply rest.',
      whatYoullNeed: 'A quiet space to lie down. Headphones if possible.',
      whyItWorks:
        'Your brain enters deep rest patterns while you stay awake. Reduces cortisol, restores dopamine, quiets mental chatter.',
    },
    evidenceTier: 2,
    evidenceCitation:
      'Pattnaik et al. (2023); Nature Scientific Reports (2024) on functional connectivity.',
    durationSeconds: 600,
    timeWindow: 10,
    modality: 'audio',
    suitableForStates: ['foggy'],
    suitableForTimesOfDay: ['midday', 'early_afternoon', 'late_afternoon', 'evening'],
    steps: [
      {
        kind: 'audio',
        id: 'guided',
        durationSeconds: 600,
        audioPath: 'nsdr/nsdr_10min_v1.mp3',
      },
    ],
  },

  'nsdr-20': {
    id: 'nsdr-20',
    family: 'nsdr',
    name: 'NSDR',
    description:
      'Non-Sleep Deep Rest. Conscious deep relaxation, guided by audio.',
    whatItIs:
      'Non-Sleep Deep Rest — a guided practice of deep relaxation while conscious. You lie down, close your eyes, and an audio guide walks your attention through a body scan and breath awareness. You stay conscious but your brain shifts into patterns associated with deep rest.',
    whatYoullNeed:
      "A quiet space where you can lie down for twenty minutes. Headphones recommended but not required. Somewhere you won't be interrupted.",
    howItWorks:
      'NSDR produces brainwave patterns similar to deep sleep while you remain conscious. Studies show it reduces cortisol, restores dopamine, and quiets the default-mode network. The longer twenty-minute session is a deeper recovery experience — useful for evening wind-down or deep cognitive fatigue.',
    whenItFits:
      'Foggy — when fog comes from cognitive overwork. Evening transitions before sleep. When you can give yourself the full twenty minutes uninterrupted.',
    contraindications:
      'Users with recent trauma may find body-focused practices activating rather than calming. Start with the ten-minute version and see how you respond before stepping up.',
    firstTimeOrientation: {
      whatYoullDo:
        'Lie down somewhere quiet for twenty minutes. Close your eyes. An audio guide walks your attention through your body and breath.',
      whatYoullNeed: 'A quiet space to lie down. Headphones if possible.',
      whyItWorks:
        'Your brain enters deep rest patterns while you stay awake. The longer session is for evening wind-down or deeper recovery.',
    },
    evidenceTier: 2,
    evidenceCitation:
      'Pattnaik et al. (2023); Nature Scientific Reports (2024) on functional connectivity.',
    durationSeconds: 1200,
    timeWindow: 20,
    modality: 'audio',
    suitableForStates: ['foggy'],
    suitableForTimesOfDay: ['late_afternoon', 'evening'],
    steps: [
      {
        kind: 'audio',
        id: 'guided',
        durationSeconds: 1200,
        audioPath: 'nsdr/nsdr_20min_v1.mp3',
      },
    ],
  },

  'cold-water-reset-5': {
    id: 'cold-water-reset-5',
    family: 'cold-water-reset',
    name: 'Cold Water Reset',
    description:
      'Cold water on your inner wrists or face. Triggers the dive reflex — heart rate slows in seconds.',
    whatItIs:
      'Brief cold exposure to the inner wrists or face. Run cold water over your inner wrists for about a minute, or apply a cold compress to your face. Both trigger the same physiological response. No submersion required.',
    whatYoullNeed:
      "A sink or cold water source. A washcloth or cold pack can be useful but isn't required. Cool tap water is enough. It doesn't need to be ice-cold.",
    howItWorks:
      'Cold exposure to the face or wrists triggers the mammalian dive reflex — a rapid, involuntary parasympathetic response that slows your heart rate within seconds. It also releases norepinephrine, which improves alertness. The same intervention calms you when Wired and activates you when Foggy.',
    whenItFits:
      "Wired — when you need to settle fast and breathwork isn't accessible. Foggy — when you need to clear your head quickly. Either state, when you have a few minutes and access to a sink.",
    contraindications:
      "Avoid if you have cardiac conditions, Raynaud's disease, or cold intolerance. If pregnant, consult your clinician. Do not submerge your face or hold your breath.",
    firstTimeOrientation: {
      whatYoullDo:
        'Run cold water over your inner wrists for about a minute, or apply a cold cloth to your face. Simple, quick, effective.',
      whatYoullNeed: 'A sink or cold water source. A washcloth if you prefer.',
      whyItWorks:
        'Triggers the dive reflex — a rapid parasympathetic response. Your heart rate slows within seconds.',
    },
    evidenceTier: 2,
    evidenceCitation:
      'DBT distress tolerance skill; mammalian dive reflex well-established physiologically.',
    durationSeconds: 300,
    timeWindow: 5,
    modality: 'cold',
    suitableForStates: ['wired', 'foggy'],
    suitableForTimesOfDay: [],
    steps: [
      {
        kind: 'instruction',
        id: 'prep',
        durationSeconds: 90,
        text: "Get to a sink with cold water. Cool tap water is enough. It doesn't need to be ice-cold.",
      },
      {
        kind: 'timer',
        id: 'contact',
        durationSeconds: 120,
        label: 'Cold contact',
        hint: 'Cold water on inner wrists, or a cold cloth to your face. Switch sides at 60 seconds. Do not submerge your face or hold your breath.',
      },
      {
        kind: 'instruction',
        id: 'recovery',
        durationSeconds: 90,
        text: 'Dry off. Notice your heart rate, your alertness, your breath.',
      },
    ],
  },

  // ----- TIER 3 -----

  'sensory-reset-2': {
    id: 'sensory-reset-2',
    family: 'sensory-reset',
    name: 'Sensory Reset',
    description:
      'Five things you see, four you hear, three you feel, two you smell, one you taste. The safety-net protocol.',
    whatItIs:
      'Name five things you can see, four you can hear, three you can feel, two you can smell, one you can taste. The practice walks your attention systematically through each sense.',
    whatYoullNeed:
      'Nothing. Works in any environment — even in a meeting, on a train, mid-argument.',
    howItWorks:
      "When you're Wired or acutely overwhelmed, attention narrows onto internal threat-scanning. Sensory Reset forcibly redirects attention outward to the sensory reality around you. A different pathway than breathwork — useful when breath practices feel activating or don't land.",
    whenItFits:
      "Wired — especially acute overwhelm. Any moment when you need something immediate and can't pause to breathe deliberately.",
    firstTimeOrientation: {
      whatYoullDo:
        'Name five things you see, four you hear, three you feel, two you smell, one you taste. We walk you through it.',
      whatYoullNeed: 'Nothing. Works anywhere.',
      whyItWorks:
        "Pulls attention from internal threat-scanning to external reality. Useful when breath practices don't land.",
    },
    evidenceTier: 3,
    evidenceCitation:
      'DBT distress tolerance skill (Linehan, 1993).',
    durationSeconds: 120,
    timeWindow: 2,
    modality: 'sensory',
    suitableForStates: ['wired'],
    suitableForTimesOfDay: [],
    steps: [
      {
        kind: 'instruction',
        id: 'see',
        durationSeconds: 30,
        text: 'Five things you can see right now. Name them quietly to yourself or out loud.',
      },
      {
        kind: 'instruction',
        id: 'hear',
        durationSeconds: 25,
        text: 'Four things you can hear.',
      },
      {
        kind: 'instruction',
        id: 'feel',
        durationSeconds: 20,
        text: 'Three things you can feel — texture, temperature, pressure.',
      },
      {
        kind: 'instruction',
        id: 'smell',
        durationSeconds: 20,
        text: 'Two things you can smell.',
      },
      {
        kind: 'instruction',
        id: 'taste',
        durationSeconds: 25,
        text: 'One thing you can taste. Stay with it for a moment.',
      },
    ],
  },

  'mindful-walking-10': {
    id: 'mindful-walking-10',
    family: 'mindful-walking',
    name: 'Mindful Walk',
    description:
      'Walking with attention on sensations — feet, breath, surroundings. Not exercise-walking. Attention-walking.',
    whatItIs:
      'Walking with attention on sensations — your feet contacting the ground, the rhythm of your breath, the air on your skin, what you see and hear as you move. Not exercise-walking. Not destination-walking. Attention-walking.',
    whatYoullNeed:
      'A safe place to walk. Outdoor is ideal because you get light exposure and varied input, but a hallway or large indoor space works if weather or access limits outdoor options.',
    howItWorks:
      'Combines gentle cardiovascular activation with attentional training. Outdoor walking adds circadian benefits from light exposure. Research shows attention-based walking outperforms walking alone for mood improvement — the attention is doing real work, not just the movement.',
    whenItFits:
      "Steady — maintenance practice that reinforces the state you're in. Foggy — gentle activation plus light exposure to clear the head. Works well as a midday reset or morning start.",
    firstTimeOrientation: {
      whatYoullDo:
        'Walk for ten minutes. Pay attention to your feet on the ground, your breath, what you see and hear. Not exercise-walking. Attention-walking.',
      whatYoullNeed: 'A safe place to walk. Outside is ideal.',
      whyItWorks:
        'Combines gentle movement with attentional training. Light exposure adds circadian benefits.',
    },
    evidenceTier: 3,
    evidenceCitation:
      'Walking meditation research; attention-based interventions outperform walking alone.',
    durationSeconds: 600,
    timeWindow: 10,
    modality: 'movement',
    suitableForStates: ['steady', 'foggy'],
    suitableForTimesOfDay: ['early_morning', 'mid_morning', 'midday', 'early_afternoon'],
    steps: [
      {
        kind: 'timer',
        id: 'walk',
        durationSeconds: 600,
        label: 'Walk and notice',
        hint: 'Feet on the ground, breath, what you see and hear. Not exercise-walking — attention-walking.',
      },
    ],
  },

  'mindful-walking-20': {
    id: 'mindful-walking-20',
    family: 'mindful-walking',
    name: 'Walking Meditation',
    description:
      'Twenty minutes of attention-walking. Cardiovascular activation plus attentional training.',
    whatItIs:
      'Walking with attention on sensations — your feet contacting the ground, the rhythm of your breath, the air on your skin, what you see and hear as you move. Twenty minutes is long enough for the attention to settle deeply.',
    whatYoullNeed:
      'A safe place to walk. Outdoor is ideal because you get light exposure and varied input, but a hallway or large indoor space works if weather or access limits outdoor options.',
    howItWorks:
      'Combines gentle cardiovascular activation with attentional training. Outdoor walking adds circadian benefits from light exposure. The longer twenty-minute session lets the attention-mode deepen past the initial mind-wandering.',
    whenItFits:
      "Steady — extended maintenance practice. Foggy — gentle activation plus light exposure. A midday reset when you can spend the full twenty minutes.",
    firstTimeOrientation: {
      whatYoullDo:
        'Walk for twenty minutes. Pay attention to your feet on the ground, your breath, what you see and hear.',
      whatYoullNeed: 'A safe place to walk. Outside is ideal.',
      whyItWorks:
        'Combines gentle movement with attentional training. Twenty minutes lets the attention-mode settle past initial mind-wandering.',
    },
    evidenceTier: 3,
    evidenceCitation:
      'Walking meditation research; attention-based interventions outperform walking alone.',
    durationSeconds: 1200,
    timeWindow: 20,
    modality: 'movement',
    suitableForStates: ['steady', 'foggy'],
    suitableForTimesOfDay: ['early_morning', 'mid_morning', 'midday', 'early_afternoon'],
    steps: [
      {
        kind: 'timer',
        id: 'walk',
        durationSeconds: 1200,
        label: 'Walk and notice',
        hint: 'Feet on the ground, breath, what you see and hear. Let the attention settle past the first few minutes.',
      },
    ],
  },

  'focused-work-45': {
    id: 'focused-work-45',
    family: 'focused-work',
    name: 'Focused Work Window',
    description:
      'A 45-minute deep-work session. Single task. Notifications silenced.',
    whatItIs:
      'A capacity-aware deep-work session. You pick a duration that matches your current capacity, then work on a single task with focus. A timer runs, notifications silence automatically, and at the end you get a brief transition period.',
    whatYoullNeed: 'The task you want to focus on. A space that supports focus.',
    howItWorks:
      "The brain naturally cycles through approximately 90-minute periods of high focus separated by recovery troughs — ultradian rhythms. The 45-minute window is one half-cycle: long enough for deep work to take hold, short enough to fit in most calendars.\n\nVara doesn't frame this as a productivity hack. This is about using a regulated state well — not extracting output from yourself.",
    whenItFits:
      "Clear — when your state genuinely supports focused cognitive work. Not a protocol to use when you're Wired or Foggy. Forcing focus in those states burns capacity without producing results.",
    firstTimeOrientation: {
      whatYoullDo:
        'Pick a single task. Focus on just that one thing for 45 minutes. Timer runs in the background; notifications silence.',
      whatYoullNeed: 'The task, and a space where you can focus.',
      whyItWorks:
        'Your brain has natural focus cycles. A 45-minute window is one half-cycle — long enough for deep work to land.',
    },
    evidenceTier: 3,
    evidenceCitation:
      'Ultradian rhythm research (Kleitman, Rossi, and others).',
    durationSeconds: 2700,
    timeWindow: 45,
    modality: 'cognitive',
    suitableForStates: ['clear'],
    suitableForTimesOfDay: ['mid_morning', 'midday', 'early_afternoon'],
    steps: [
      {
        kind: 'timer',
        id: 'focus',
        durationSeconds: 2700,
        label: 'Focus on one task',
        hint: 'Single task. No tab-switching. Notifications silenced.',
      },
    ],
  },

  'focused-work-90': {
    id: 'focused-work-90',
    family: 'focused-work',
    name: 'Focused Work Window',
    description:
      'A 90-minute deep-work session. Full ultradian cycle for deeper work.',
    whatItIs:
      'A capacity-aware deep-work session at the full ultradian length. You pick a single task and work on it for 90 minutes — one full focus cycle. A timer runs, notifications silence automatically.',
    whatYoullNeed: 'The task you want to focus on. A space that supports focus.',
    howItWorks:
      "The brain naturally cycles through approximately 90-minute periods of high focus separated by recovery troughs. The 90-minute window is the full cycle: enough time for deep work that requires sustained loading of context.\n\nVara doesn't frame this as a productivity hack. Use this only when your state genuinely supports it — Clear, well-rested, and with a task that warrants the depth.",
    whenItFits:
      'Clear — and only when you have the capacity. Pick the 45-minute version when you have less.',
    firstTimeOrientation: {
      whatYoullDo:
        'Pick a single deep task. Focus on just that one thing for 90 minutes. Timer runs in the background; notifications silence.',
      whatYoullNeed: 'The task, a space where you can focus, and the capacity for the full window.',
      whyItWorks:
        'A 90-minute focus cycle is the full ultradian rhythm. Long enough to handle work that requires deep context loading.',
    },
    evidenceTier: 3,
    evidenceCitation:
      'Ultradian rhythm research (Kleitman, Rossi, and others).',
    durationSeconds: 5400,
    timeWindow: 45,
    modality: 'cognitive',
    suitableForStates: ['clear'],
    suitableForTimesOfDay: ['mid_morning', 'midday'],
    steps: [
      {
        kind: 'timer',
        id: 'focus',
        durationSeconds: 5400,
        label: 'Focus on one task',
        hint: 'Single deep task. No tab-switching. Notifications silenced.',
      },
    ],
  },

  // ----- TIER 4 -----

  'bright-light-10': {
    id: 'bright-light-10',
    family: 'bright-light',
    name: 'Bright Light Exposure',
    description:
      'Ten minutes of natural daylight. Regulates your circadian rhythm.',
    whatItIs:
      'Exposure to natural light. Stand by a window with outdoor view, step outside, or position yourself where sunlight reaches you. Morning and early afternoon are ideal.',
    whatYoullNeed:
      'A window with outdoor view, or access outside. Not an indoor lamp — natural daylight is significantly brighter than any indoor light and has different spectral properties.',
    howItWorks:
      'Morning and early-afternoon light exposure regulates circadian rhythms, triggers appropriate cortisol release for alertness, and supports sleep quality later that night. When fog comes from sleep disruption or circadian misalignment, this addresses cause more than symptom.\n\nA note on the research: circadian effects from light exposure are well-established. Application to acute alertness in a single session is more inferential — the main benefit shows up over days and weeks of consistent practice.',
    whenItFits:
      'Foggy — especially foggy mornings or post-lunch slumps. Best paired with another protocol like Brief Movement. Less effective as a one-off acute intervention; more effective as a daily practice.',
    contraindications:
      'If you have bipolar disorder, sudden changes in light exposure can affect mood stability — consult your clinician. If you have a photosensitive condition, check with your doctor about whether this practice is appropriate for you.',
    firstTimeOrientation: {
      whatYoullDo:
        'Stand by a window or step outside for ten minutes. Morning or early afternoon.',
      whatYoullNeed: 'A window with outdoor view, or outdoor access.',
      whyItWorks:
        'Natural light regulates your circadian rhythm and triggers alertness cortisol. A daily practice, more than a one-off fix.',
    },
    evidenceTier: 4,
    evidenceCitation:
      'Circadian research on light exposure is well-established; single-session alertness effects are inferential.',
    durationSeconds: 600,
    timeWindow: 10,
    modality: 'environmental',
    suitableForStates: ['foggy'],
    suitableForTimesOfDay: ['early_morning', 'mid_morning', 'midday', 'early_afternoon'],
    steps: [
      {
        kind: 'timer',
        id: 'expose',
        durationSeconds: 600,
        label: 'Get to bright daylight',
        hint: "A window with outdoor view, or step outside. Don't stare at the sun.",
      },
    ],
  },

  'bright-light-20': {
    id: 'bright-light-20',
    family: 'bright-light',
    name: 'Bright Light Exposure',
    description:
      'Twenty minutes of natural daylight. A more sustained circadian dose.',
    whatItIs:
      'A longer exposure to natural light — twenty minutes by a window with outdoor view, or outdoors. Best in the morning or early afternoon.',
    whatYoullNeed:
      'A window with outdoor view, or access outside. Natural daylight, not an indoor lamp.',
    howItWorks:
      'Twenty minutes of natural light delivers a stronger circadian signal than ten — useful when your sleep has been disrupted or your schedule has been indoor-heavy. The mechanism is the same; the dose is larger.',
    whenItFits:
      'Foggy — especially after poor sleep or stretches of indoor work. Pair with Mindful Walking outdoors for a stacked intervention.',
    contraindications:
      'If you have bipolar disorder, consult your clinician before sudden changes in light exposure. If you have a photosensitive condition, check with your doctor first.',
    firstTimeOrientation: {
      whatYoullDo:
        'Stand by a window or step outside for twenty minutes. Morning or early afternoon.',
      whatYoullNeed: 'A window with outdoor view, or outdoor access.',
      whyItWorks:
        'Twenty minutes is a stronger circadian dose than ten. Useful after poor sleep or indoor stretches.',
    },
    evidenceTier: 4,
    evidenceCitation:
      'Circadian research on light exposure is well-established; single-session alertness effects are inferential.',
    durationSeconds: 1200,
    timeWindow: 20,
    modality: 'environmental',
    suitableForStates: ['foggy'],
    suitableForTimesOfDay: ['early_morning', 'mid_morning', 'midday'],
    steps: [
      {
        kind: 'timer',
        id: 'expose',
        durationSeconds: 1200,
        label: 'Get to bright daylight',
        hint: "A window with outdoor view, or step outside. Don't stare at the sun.",
      },
    ],
  },
} satisfies Record<string, Protocol>;

// Literal union of every variant id. Derived from the const so adding a
// protocol is a single-place change.
export type ProtocolId = keyof typeof BRAIN_STATE_PROTOCOLS;

// Lookup by id. Returns null for unknown ids — call sites should handle
// "protocol not in library" (e.g. a retired id passed through
// normalizeProtocolId) by surfacing a "no longer available" message,
// not by throwing. Phase 2 ProtocolDetailScreen and Phase 4
// recommender both go through here.
export function getProtocolById(id: string): Protocol | null {
  if (Object.prototype.hasOwnProperty.call(BRAIN_STATE_PROTOCOLS, id)) {
    return BRAIN_STATE_PROTOCOLS[id as ProtocolId];
  }
  return null;
}

// All protocols in the library, in insertion order.
export function getAllProtocols(): Protocol[] {
  return Object.values(BRAIN_STATE_PROTOCOLS);
}

// All protocols whose `suitableForStates` includes the given state.
// Used by Practices index (sub-step 2.2) and the legacy paths that
// still need a state-only filter. Phase 4 wires the full recommender
// with state + timeWindow + timeOfDay + intentPath + recentSessions.
export function getProtocolsForState(state: BrainState): Protocol[] {
  return getAllProtocols().filter((p) => p.suitableForStates.includes(state));
}

// `getProtocolForState` was the Phase 1 transitional helper —
// deleted in sub-step 2.5 alongside the four caller migrations
// (BrainStateCheckin, useDashboard, OnboardingV2CheckInScreen,
// OnboardingV2ProtocolScreen). New code uses `selectProtocol` from
// `services/protocolSelector.service.ts` which takes (state,
// timeWindow); Phase 4 layers in time-of-day and intent path.
