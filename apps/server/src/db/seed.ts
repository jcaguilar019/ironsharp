import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "./index.js";
import { devotionalPlans, devotionalDays } from "./schema.js";

type DaySeed = {
  dayNumber: number;
  chapter: string;
  commentary: string;
  reflectionQ1: string;
  reflectionQ2: string;
};

type PlanSeed = {
  title: string;
  category: string;
  totalDays: number;
  description: string;
  days: DaySeed[];
};

const PLANS: PlanSeed[] = [
  {
    title: "Being a Man",
    category: "mens",
    totalDays: 7,
    description:
      "A 7-day devotional for men who want to go deeper - identity, integrity, and what it means to be a man of God.",
    days: [
      {
        dayNumber: 1,
        chapter: "Proverbs 27",
        commentary:
          "Solomon does not romanticize what it means to be a man - he shows it forged through accountability, honest friendship, and the willingness to be wounded by people who love you. Verse 17 sits at the heart of this chapter: iron sharpens iron. Not iron warms iron, or iron encourages iron. Sharpens. There is friction in real brotherhood, and Solomon says that friction is the point. The question is not whether you have people in your life - it is whether any of them are close enough to sharpen you.",
        reflectionQ1:
          "Who in your life right now is close enough to tell you the truth about yourself - and when did they last actually do it? If the answer is no one, what does that tell you about the kind of man you have allowed yourself to become?",
        reflectionQ2:
          "Verse 6 says wounds from a friend can be trusted. Is there something true someone has said to you recently - something that stung - that you have been dismissing instead of sitting with? What would it look like to go back and actually receive it?",
      },
      {
        dayNumber: 2,
        chapter: "1 Corinthians 16",
        commentary:
          "Paul closes one of his most demanding letters with five words that read like a charge to a soldier: Be watchful, stand firm, act like men. He is not giving advice - he is issuing a command to a church that had been drifting toward passivity and comfort. The word for act like men in the Greek is andrizomai - to be courageous, to stop cowering. Paul assumes that manhood is not automatic. It is chosen, practiced, and fought for every single day against forces that prefer you passive.",
        reflectionQ1:
          "Where in your life right now are you being passive when you know you are called to be present and courageous - in your relationships, your family, your faith, your work? Be specific. Do not answer with a category. Answer with a name or a situation.",
        reflectionQ2:
          "Paul says let all that you do be done in love - immediately after commanding courage and strength. Where have you used the idea of being strong as an excuse to be cold, distant, or hard? What would strength wrapped in love actually look like in that specific place?",
      },
      {
        dayNumber: 3,
        chapter: "James 1",
        commentary:
          "James opens his letter with a provocation: count it all joy when you face trials. Not endure it, not survive it - count it joy. He is not talking about performing happiness through pain. He is talking about a man who understands what trials are actually doing to him - producing steadfastness, which produces completeness, which means lacking nothing. The man who runs from difficulty stays incomplete. The man who stands in it gets finished.",
        reflectionQ1:
          "What is the trial or difficulty in your life right now that you have been trying to escape, manage, or numb - instead of standing in? What might God be producing in you through it that you keep refusing to receive?",
        reflectionQ2:
          "Verse 22 says be a doer of the word and not a hearer only, deceiving yourself. What is something you have heard, read, or believed for years that you have never actually acted on? What would doing it - not believing it, doing it - look like this week?",
      },
      {
        dayNumber: 4,
        chapter: "Psalm 15",
        commentary:
          "David opens with a question: who may dwell on your holy hill? Then he spends the rest of the psalm answering it - and the answer is not the man with the most theological knowledge or the longest prayer life. It is the man whose words match his life. Who speaks truth in his heart. Who keeps his oath even when it hurts. These are not extraordinary moral achievements. They are the small daily choices of a man who has decided that integrity is not situational.",
        reflectionQ1:
          "Where in your life right now is there a gap between what you say and what you actually do - between the man you present to the world and the man you are in private? Do not answer generally. Name the specific gap.",
        reflectionQ2:
          "Verse 4 says this man honors those who fear the Lord and keeps his oath even when it hurts. Is there a commitment you have made - to a person, to God, to yourself - that you have been quietly backing away from because it got costly? What would honoring that commitment look like today?",
      },
      {
        dayNumber: 5,
        chapter: "1 Timothy 4",
        commentary:
          "Paul writes to a young pastor who is apparently tempted to let people dismiss him because of his age. His instruction is not wait until you are older - it is set an example in speech, in conduct, in love, in faith, in purity. Paul's answer to being underestimated is not to fight for recognition. It is to become someone whose life speaks louder than any argument. He tells Timothy to train himself for godliness - using the same Greek word for the discipline of an athlete.",
        reflectionQ1:
          "If the people closest to you - your family, your closest friends, your coworkers - were asked to describe the example your life sets, what would they actually say? Not what you hope they would say. What would they actually say?",
        reflectionQ2:
          "Paul says train yourself for godliness. What does your actual spiritual training look like right now - not your intentions, your actual practice? And if the honest answer is that there is not much of one, what is one specific thing you could add to your daily life this week that would change that?",
      },
      {
        dayNumber: 6,
        chapter: "Micah 6",
        commentary:
          "One of the most clarifying verses in all of Scripture appears here: what does the Lord require of you but to do justice, love kindness, and walk humbly with your God. Three things. Not a long list, not a theological exam - three things. And the order matters. Do justice first - act rightly toward others in the real world. Love kindness - not perform it, love it. Walk humbly - not occasionally feel humble, walk it.",
        reflectionQ1:
          "Of the three - justice, kindness, humility - which one is most absent from your actual daily life right now, not your values but your behavior? What situation in your life this week revealed that absence most clearly?",
        reflectionQ2:
          "The word walk implies direction and movement over time. What would it look like to walk more humbly with God starting today - not as a feeling but as a concrete change in how you approach your decisions, your relationships, or your prayer life?",
      },
      {
        dayNumber: 7,
        chapter: "Joshua 1",
        commentary:
          "God tells Joshua to be strong and courageous four times in the opening verses. Not once - four times. Which tells you something about how hard it is and how prone Joshua was to needing the reminder. The charge is paired with a promise: I will be with you wherever you go. God does not promise Joshua that the road ahead will be easy. He promises that Joshua will not walk it alone.",
        reflectionQ1:
          "What is the thing God is calling you to step into right now that you have been waiting to feel ready for - and if you are honest, is it possible that more preparation is not what you are missing, but more trust?",
        reflectionQ2:
          "God tells Joshua to meditate on the law day and night so that he may be careful to do everything written in it. Not just know it - do it. What is one thing you already know from Scripture that you have not yet been careful to do? What would doing it look like starting this week?",
      },
    ],
  },
  {
    title: "Being a Husband",
    category: "marriage",
    totalDays: 7,
    description:
      "A 7-day devotional for married men - love, sacrifice, leadership, and what it means to be the husband your wife actually needs.",
    days: [
      {
        dayNumber: 1,
        chapter: "Ephesians 5",
        commentary:
          "Paul's instruction to husbands is the most demanding thing in the chapter - and the most misquoted. He does not begin with authority. He begins with sacrifice. Husbands, love your wives as Christ loved the church and gave himself up for her. The model for husbandhood is not a king on a throne - it is a man on a cross.",
        reflectionQ1:
          "If your wife described your love for her in the past month - not your intentions but your actual behavior - how close would her description be to the words Paul uses: washing, nourishing, cherishing? Where is the biggest gap?",
        reflectionQ2:
          "Verse 25 says give yourself up for her. Where in your marriage right now are you holding something back - your time, your attention, your emotional presence, your pride - that you know you are called to lay down? What would it look like to actually lay it down this week?",
      },
      {
        dayNumber: 2,
        chapter: "1 Peter 3",
        commentary:
          "Peter tells husbands to live with their wives in an understanding way. The word for understanding is gnosis - knowledge. Not feeling, knowledge. Peter is saying that loving your wife well requires studying her - knowing how she thinks, what she carries, what she needs, what drains her, what fills her. He adds that she is a fellow heir of the grace of life, which means she is not beneath you. She is beside you.",
        reflectionQ1:
          "How well do you actually know your wife right now - not who she was when you married her, but who she is today, what she is carrying, what she needs from you that she may not be saying out loud? When did you last ask her?",
        reflectionQ2:
          "Is there unresolved conflict, distance, or coldness between you and your wife right now that you have been waiting for her to address? What would it look like for you to move toward her first - not because you are wrong, but because you are her husband?",
      },
      {
        dayNumber: 3,
        chapter: "Song of Solomon 2",
        commentary:
          "The presence of this book in Scripture is itself a statement - God created physical and emotional intimacy between a husband and wife, and He called it very good. The language here is attentive, specific, and unhurried. He notices her. She notices him. One of the quiet ways marriages erode is not through dramatic failure but through the slow disappearance of delight.",
        reflectionQ1:
          "When did you last pursue your wife - not out of obligation, not because she asked, but because you wanted her and you let her know it? What has happened to the delight that used to be there, and what have you done to tend it or neglect it?",
        reflectionQ2:
          "Verse 16 says I am my beloved's and my beloved is mine. That is a statement of belonging that implies priority. Is your wife actually your priority - in your calendar, your attention, your emotional energy - or have other things quietly moved to the front? What needs to change?",
      },
      {
        dayNumber: 4,
        chapter: "Colossians 3",
        commentary:
          "Paul gives one direct instruction to husbands in this chapter: love your wives and do not be harsh with them. The word for harsh means bitter, sharp, resentful - a sourness that has settled in. Paul assumes that harshness in marriage is a real and specific temptation for men, specific enough to name directly. It does not have to be loud to be harsh.",
        reflectionQ1:
          "Is there harshness in you toward your wife right now - even if it is quiet, even if you would never call it that? Where does it show up, and if you trace it back, what is it actually rooted in?",
        reflectionQ2:
          "Verse 13 says bear with one another and forgive each other as the Lord has forgiven you. Is there something you are holding against your wife - a past hurt, a pattern that frustrates you, an unmet expectation - that you have not fully forgiven? What would actually forgiving it look like, not as a feeling but as a choice?",
      },
      {
        dayNumber: 5,
        chapter: "Proverbs 31",
        commentary:
          "This chapter is usually addressed to women - but read it as a husband and you will notice something. The woman described here flourishes. She creates, she provides, she leads, she serves, she is trusted. And at the end, her husband is described as someone who praises her publicly and affirms her privately. She does not flourish in spite of her husband - she flourishes in part because of the environment he has created.",
        reflectionQ1:
          "Does your wife feel free to become fully who God made her to be inside your marriage - her gifts, her voice, her calling, her confidence? Or has something in the way you lead been limiting her rather than releasing her?",
        reflectionQ2:
          "When did you last praise your wife publicly and affirm her privately and specifically - not as a general compliment but naming something real and true about who she is? What is one true thing about her that you have not said out loud recently that she needs to hear?",
      },
      {
        dayNumber: 6,
        chapter: "Genesis 2",
        commentary:
          "Before the fall, before sin entered, God looked at a man who had everything - purpose, work, beauty, and the direct presence of God - and said it is not good for him to be alone. The woman God creates is described as a helper - ezer in Hebrew, the same word used for God when He helps Israel in battle. She is not an accessory to Adam's life. She is a co-warrior, a counterpart.",
        reflectionQ1:
          "Do you treat your wife as a counterpart - someone whose perspective, wisdom, and strength are essential to you - or as someone who exists primarily to support your life and agenda? Be honest about what the actual dynamic in your marriage looks like.",
        reflectionQ2:
          "The man is meant to leave his father and mother and hold fast to his wife - which means deliberate, active cleaving. What in your life right now is competing with your wife for the place of first loyalty - a parent, a friend, a habit, a job, an old identity - and what does it mean to choose her more completely?",
      },
      {
        dayNumber: 7,
        chapter: "Ruth 3",
        commentary:
          "Boaz is one of the quiet heroes of Scripture - a man of integrity, generosity, and restraint. He notices Ruth. He protects her. He provides for her. He does not take what is not his to take. Most of what makes a husband great is not the grand gesture. It is the daily accumulation of small choices to notice, protect, provide, and honor.",
        reflectionQ1:
          "Does your wife feel safe with you - emotionally, spiritually, relationally? Not just physically. Does she trust that you will protect her heart, honor her in front of others, and tell her the truth with gentleness? What does the honest evidence say?",
        reflectionQ2:
          "Boaz's integrity was visible long before Ruth arrived - it was already the texture of his daily life. What is one area of your character as a husband that you know needs to be built up through daily practice, not just occasional effort? What would building it actually look like this week?",
      },
    ],
  },
  {
    title: "Joy That Does Not Make Sense",
    category: "general",
    totalDays: 7,
    description:
      "A 7-day journey through Philippians - Paul's letter written from prison about a joy that no circumstance can touch.",
    days: [
      {
        dayNumber: 1,
        chapter: "Philippians 1",
        commentary:
          "Paul writes this letter from a prison cell, chained to a Roman guard, facing a trial that could end in his execution. And the tone is not despair - it is gratitude. He thanks God for the people he is writing to. He is confident that God will complete what He started. Paul has found something that his circumstances cannot reach - a deep settled conviction about who holds his life and what that life is actually for.",
        reflectionQ1:
          "What circumstance in your life right now is most threatening your peace - and if you are honest, what does your response to it reveal about where your actual security is anchored?",
        reflectionQ2:
          "Paul says for me to live is Christ and to die is gain - a statement that only makes sense if Christ is genuinely the center of your life. If someone looked at how you spend your time, money, and emotional energy this week, what would they conclude that you live for? What needs to change about that answer?",
      },
      {
        dayNumber: 2,
        chapter: "Philippians 2",
        commentary:
          "Paul's argument for unity begins with a surprising move - he points to Jesus. Not to a principle, not to a virtue, but to a person. Christ, who was God, did not count equality with God a thing to be grasped - He let it go. He took the form of a servant. He humbled himself to death on a cross. Humility in Paul's framework is not weakness. It is the willingness of a strong person to stop fighting for position.",
        reflectionQ1:
          "Where in your relationships right now are you counting something as a thing to be grasped - status, being right, getting credit, having the last word - that Jesus would have let go? What is it costing the people around you?",
        reflectionQ2:
          "Verse 14 says do everything without grumbling or disputing. For one day this week - just one - what would it look like to do exactly that? Not forever, just today. What would have to change about your attitude toward the things that usually make you grumble?",
      },
      {
        dayNumber: 3,
        chapter: "Philippians 3",
        commentary:
          "Paul lists his credentials - circumcised, Hebrew, Pharisee, blameless under the law - and then calls them all rubbish compared to knowing Christ. Paul is not being falsely modest. He is describing a man who had everything the religious world valued and discovered it was worth nothing compared to one thing. He uses the phrase that I may know him - not know about him, know him.",
        reflectionQ1:
          "What are the things in your life that you have been quietly trusting in - your reputation, your history with God, your theological knowledge, your church attendance - that might actually be getting in the way of a more honest and hungry relationship with Jesus?",
        reflectionQ2:
          "Paul says he presses on toward the goal, forgetting what lies behind. Is there something in your past - a failure, a season of walking away, a sin - that you are still allowing to define your relationship with God today? What would pressing on actually look like for you?",
      },
      {
        dayNumber: 4,
        chapter: "Philippians 4",
        commentary:
          "Paul writes the word rejoice twice in a single breath - not as a suggestion but as a command. Then he commands gentleness. Then he commands peace through prayer. Then he commands right thinking. These are not feelings Paul is telling the Philippians to manufacture - they are practices, postures, and choices. The peace of God in verse 7 is described as surpassing all understanding - which means it does not make sense given the circumstances.",
        reflectionQ1:
          "What is the thing that most reliably robs you of peace - and if you are honest, is the reason it has that power something about what you have built your security on?",
        reflectionQ2:
          "Paul says to bring everything to God in prayer with thanksgiving - not some things, everything. What are you currently carrying that you have not actually handed to God - that you have been managing, worrying about, or trying to solve alone? What would it look like to hand it over specifically and concretely today?",
      },
      {
        dayNumber: 5,
        chapter: "Philippians 1",
        commentary:
          "Paul says he is confident of this very thing - that he who began a good work in you will bring it to completion at the day of Jesus Christ. God began something in you specifically. Not in Christians generally, not in your church, not in the people around you - in you. And Paul's conviction is that what God starts, He finishes. Not because of your consistency but because of His.",
        reflectionQ1:
          "What is God currently working on in you - what is He trying to change, form, or build - that you have been resisting, ignoring, or running from? What is the evidence that He has been at work even when you were not cooperating?",
        reflectionQ2:
          "Paul says he holds the Philippians in his heart and longs for them with the affection of Christ Jesus. Who in your life right now needs you to hold them that way - to pray for them, pursue them, and let them know they are not forgotten? What is stopping you from doing that today?",
      },
      {
        dayNumber: 6,
        chapter: "Philippians 2",
        commentary:
          "Work out your own salvation with fear and trembling - for it is God who works in you. Paul holds two things together that we tend to separate. Your effort and God's sovereign work. He does not say God will do it for you, so relax. He does not say it is all up to you, so strain harder. He says work it out, because God is working it in. The fear and trembling is not the fear of losing your salvation - it is the gravity of what is actually at stake.",
        reflectionQ1:
          "Are you taking your spiritual formation seriously right now - not your church attendance, but the actual work of becoming the person God is making you into? Or have you drifted into a passive Christianity that waits for growth to happen without your participation?",
        reflectionQ2:
          "Verse 4 says look not only to your own interests but also to the interests of others. Who in your immediate world - home, work, church - have you been too preoccupied with your own life to notice lately? What is one specific thing you could do today to look to their interest?",
      },
      {
        dayNumber: 7,
        chapter: "Philippians 4",
        commentary:
          "I have learned, in whatever situation I am, to be content. The word learned is the key. Paul did not arrive at contentment - he was trained into it by the hardships he endured. He says he knows how to be brought low and how to abound, how to face plenty and how to face hunger. The man who can only be content when things are going well has not yet learned contentment. He has learned comfort.",
        reflectionQ1:
          "What circumstances are you waiting for before you allow yourself to be content - what needs to change, what needs to be resolved, what needs to arrive - and what does your answer reveal about where your sense of enough actually comes from?",
        reflectionQ2:
          "Paul ends by saying my God will supply every need of yours according to his riches in glory in Christ Jesus. Is there something you are treating as a need that is actually a want, and the absence of it is producing anxiety instead of trust? What would trusting that God knows the difference actually look like for you today?",
      },
    ],
  },
];

async function seed() {
  console.log("🌱 Seeding devotional plans…");
  for (const plan of PLANS) {
    const existing = await db
      .select({ id: devotionalPlans.id })
      .from(devotionalPlans)
      .where(eq(devotionalPlans.title, plan.title))
      .limit(1);

    if (existing.length > 0) {
      console.log(`   • "${plan.title}" already seeded — skipping.`);
      continue;
    }

    const [inserted] = await db
      .insert(devotionalPlans)
      .values({
        title: plan.title,
        category: plan.category,
        totalDays: plan.totalDays,
        description: plan.description,
      })
      .returning({ id: devotionalPlans.id });

    if (!inserted) throw new Error(`Failed to insert plan ${plan.title}`);

    await db.insert(devotionalDays).values(
      plan.days.map((d) => ({
        planId: inserted.id,
        dayNumber: d.dayNumber,
        chapter: d.chapter,
        commentary: d.commentary,
        reflectionQ1: d.reflectionQ1,
        reflectionQ2: d.reflectionQ2,
      }))
    );

    console.log(`   ✓ "${plan.title}" (${plan.days.length} days)`);
  }
  console.log("✅ Seed complete.");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
