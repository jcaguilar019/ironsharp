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
  {
    title: "Fearfully Made: A Woman's Identity in Christ",
    category: "women",
    totalDays: 7,
    description:
      "A 7-day devotional for women — your identity, your worth, your calling, anchored in who God says you are.",
    days: [
      {
        dayNumber: 1,
        chapter: "Psalm 139",
        commentary:
          "David writes a psalm to a God who knows him completely - when he sits down, when he stands up, every word before he speaks it. Then comes verse 14: I am fearfully and wonderfully made. The phrase fearfully here does not mean afraid - it means with awe, with weight, with intention. You were not assembled. You were authored. The God who set the stars in place wove you together on purpose, every part of you, with His full attention.",
        reflectionQ1:
          "Where do you live as if you were an accident or an afterthought - in how you talk to yourself, what you allow others to say about you, what you have come to believe about your worth? Where did that belief begin?",
        reflectionQ2:
          "If you actually believed that God authored you with full attention and full intention, what is one thing you would stop apologizing for - and one thing you would start owning? Be specific.",
      },
      {
        dayNumber: 2,
        chapter: "Genesis 1",
        commentary:
          "Before the fall, before sin, before any cultural script about what women are for, God creates humanity - male and female - in His own image. Both. Together. Equal in image and in mission. The very first thing said about the woman is not that she is beautiful or that she is helpful. It is that she carries the image of God. That is the floor your identity stands on, and nothing - not your past, not your role, not your relationship status - can sink it lower.",
        reflectionQ1:
          "What roles or relationships have you let define your worth - mother, wife, daughter, professional, single, married - in a way that has crowded out your more fundamental identity as a woman made in God's image? What happens when that role is threatened?",
        reflectionQ2:
          "What would it look like this week to live from your identity in God's image - not from striving to earn it, not from fear of losing it - in one specific relationship or situation that has been wearing you down?",
      },
      {
        dayNumber: 3,
        chapter: "Luke 10",
        commentary:
          "Martha is doing the right things. She has opened her home, she is preparing the meal, she is serving Jesus. And Jesus tells her she has chosen the wrong thing. Not because serving is wrong - because Mary, sitting at His feet, has chosen the one thing that cannot be taken from her. Many women are praised for being like Martha. Jesus praises Mary.",
        reflectionQ1:
          "Where are you serving, performing, and producing - even for God - while neglecting the one thing Jesus actually said is necessary: sitting at His feet, knowing Him, being with Him? When was the last time you were just with Him without an agenda?",
        reflectionQ2:
          "Verse 41 says Martha was anxious and troubled about many things. What is the many things that is currently keeping you anxious - and what would it look like to put it down and choose the one thing this week, even if everything else stays undone?",
      },
      {
        dayNumber: 4,
        chapter: "1 Peter 3",
        commentary:
          "Peter describes a kind of beauty that does not fade - the hidden person of the heart, with the imperishable beauty of a gentle and quiet spirit. He is not telling women to be silent. The Greek word for quiet is hesychios - settled, undisturbed, anchored. Peter is describing a woman whose center of gravity is so rooted in God that she does not need outside approval to know who she is. That is not weakness. That is power that does not have to shout.",
        reflectionQ1:
          "Where in your life right now are you loud - not in volume but in striving, in needing to be seen, in needing to be right - because somewhere you are not yet anchored? What is driving the noise?",
        reflectionQ2:
          "What would a settled, undisturbed spirit look like for you specifically - in a hard conversation, in a season of waiting, in an old wound that still flares up? What is one practice this week that would help you sink your roots deeper?",
      },
      {
        dayNumber: 5,
        chapter: "Esther 4",
        commentary:
          "Mordecai's words to Esther are some of the most piercing in Scripture: who knows whether you have not come to the kingdom for such a time as this. Esther is a woman who could have hidden, who could have stayed safe, who could have minimized her position. Instead she fasts, she gathers her people, and she walks toward a king who could kill her with a word. Her courage was not bravado. It was a woman who counted the cost and went anyway.",
        reflectionQ1:
          "What is the room, the conversation, the calling that God has put you in for such a time as this - that you have been minimizing, deflecting, or hiding from because the cost feels too high? What would walking toward it look like?",
        reflectionQ2:
          "Esther says if I perish, I perish - a surrendered courage that does not depend on guaranteed outcomes. Where in your life are you waiting for guarantees before you obey? What would it look like to obey first and let God hold the outcome?",
      },
      {
        dayNumber: 6,
        chapter: "Ruth 1",
        commentary:
          "Ruth makes a vow to a grieving widow with no money, no future, and no claim on her: where you go, I will go, your people will be my people, your God will be my God. She binds herself to Naomi - and through Naomi to a God she barely knows - with a loyalty that costs her everything. That loyalty becomes the doorway through which the lineage of Jesus is preserved. God writes the story of the world through a woman who refused to leave another woman behind.",
        reflectionQ1:
          "Who in your life right now needs your loyal love - not your perfect words, not your fixed advice, but your refusal to walk away - and have you been keeping your distance because their grief, mess, or season feels too costly to enter?",
        reflectionQ2:
          "Ruth chose Naomi's God before she fully knew Him. Is there a step of faith you are waiting to take until you feel more certain - and what would it look like to take it on Ruth's terms, before you have it all figured out?",
      },
      {
        dayNumber: 7,
        chapter: "Proverbs 31",
        commentary:
          "The famous chapter does not end where most people stop reading. After all the activity - the buying and selling, the rising while it is still night, the strong arms and laughing at the future - the chapter ends with this: charm is deceitful and beauty is fleeting, but a woman who fears the Lord is to be praised. Everything else listed flows from that one thing. She does not get her strength from her productivity. Her productivity flows from a soul that fears the Lord.",
        reflectionQ1:
          "What is the root of your strength right now - the fear of the Lord, or the fear of being judged, behind, not enough, or replaced? Trace your most exhausting effort back to its source. What is actually feeding it?",
        reflectionQ2:
          "If your strength flowed from awe of God rather than anxiety about yourself, what is one thing in your life that you would stop doing this week - and one thing you would start doing - because the motive has shifted underneath you?",
      },
    ],
  },
  {
    title: "Being a Father",
    category: "fathers",
    totalDays: 7,
    description:
      "A 7-day devotional for fathers — leading, blessing, teaching, and showing your children the love of the Father.",
    days: [
      {
        dayNumber: 1,
        chapter: "Deuteronomy 6",
        commentary:
          "Moses gives Israel one of the most important passages in the entire Old Testament - the Shema - and immediately puts it in the hands of fathers. Teach these words to your children. Talk about them when you sit at home and when you walk and when you lie down and when you rise. The discipleship of your children is not delegated to the church, the school, or the youth pastor. It is yours - in the ordinary rhythms of an ordinary week.",
        reflectionQ1:
          "When was the last time you talked with your child about God - not formally, but in the rhythm of an actual day, the way Moses describes? If the answer is rarely or never, what has crowded out the conversations you were meant to have?",
        reflectionQ2:
          "Verse 6 says these words shall be on your heart - first. You cannot pass on what is not yet in you. What is the state of your own walk with God right now, and what would your kids learn about God from watching you this week if you did not say a word?",
      },
      {
        dayNumber: 2,
        chapter: "Ephesians 6",
        commentary:
          "Paul gives fathers one of the shortest and sharpest commands in the whole letter: do not provoke your children to anger, but bring them up in the discipline and instruction of the Lord. The word provoke means to exasperate, to irritate to bitterness. Paul assumes fathers are uniquely positioned to wound. Not because they want to - because their words and silence both carry unusual weight. A father who has not learned to control his tongue and his temper will produce children who learn to brace.",
        reflectionQ1:
          "Where have you been provoking your children without realizing it - through impatience, harsh tone, mocking humor, broken promises, or favoritism? What does the honest evidence in your house tell you?",
        reflectionQ2:
          "Discipline and instruction in the Lord assumes a steady, patient, formative posture. Where do you tend to default instead to reactive correction - yelling, threats, sarcasm - because it is faster? What would slower, more intentional fatherhood actually look like this week?",
      },
      {
        dayNumber: 3,
        chapter: "Psalm 127",
        commentary:
          "Children are a heritage from the Lord, the fruit of the womb a reward. The psalmist does not call them an obligation, an interruption, or a cost. He calls them a reward. A heritage is something passed down with weight - it carries the family forward into the next generation. Most fathers in our culture have been taught to see their kids as a part of life. The Bible says they are central to the legacy you were created to leave.",
        reflectionQ1:
          "Do your kids experience you as a man who delights in them - or as a man who tolerates them between the more important parts of your day? When did you last let them know, with words, that they are a reward and not a burden?",
        reflectionQ2:
          "Verse 1 says unless the Lord builds the house, the builders labor in vain. Where in your fathering are you striving in your own strength to produce a particular outcome in your children - and what does it look like to actually invite the Lord to build what you cannot?",
      },
      {
        dayNumber: 4,
        chapter: "Proverbs 22",
        commentary:
          "Train up a child in the way he should go, and when he is old he will not depart from it. The phrase the way he should go in Hebrew can mean according to his bent - in keeping with how God uniquely made him. Solomon is not describing a formula. He is describing a father who has studied his child, who knows how this particular son or daughter is wired, and who patiently shapes them toward the path that fits how God designed them - not the path that fits the father's preferences.",
        reflectionQ1:
          "How well do you actually know each of your children right now - their particular wiring, what makes them come alive, what shuts them down, what they are quietly afraid of? Or have you been parenting all of them as if they were one generic kid?",
        reflectionQ2:
          "Where have you been trying to shape your child into your image rather than the image God put in them? What is one thing about them that is different from you that you could begin to honor - and even celebrate - this week?",
      },
      {
        dayNumber: 5,
        chapter: "Luke 15",
        commentary:
          "The parable of the prodigal son is the picture Jesus gives us of fatherhood. The father lets the son go - with his inheritance, into his rebellion. But then, while the son is still a long way off, his father sees him - which means he was watching - and runs to him. He does not lecture. He does not interrogate. He runs, he embraces, he kisses, he restores. This is the kind of father God is. And this is the kind of father every child longs for - one whose love is not contingent on their performance.",
        reflectionQ1:
          "Is there a place in you where your love for your child has become quietly conditional - tied to their behavior, their grades, their gratitude, their choices - so that they feel they have to earn it? When did that start?",
        reflectionQ2:
          "If one of your kids walked into the room today after disappointing you, what would they experience first - your warmth or your verdict? What would running to them - before any conversation about the issue - actually look like in your home?",
      },
      {
        dayNumber: 6,
        chapter: "Genesis 27",
        commentary:
          "Esau weeps before his father with a question that echoes through every generation: have you only one blessing, my father? Bless me, even me also, O my father. Children are wired to need their father's blessing - a word, a moment, a look that says you are mine, you are seen, you are good. The Bible takes the blessing of a father so seriously that whole storylines turn on it. Many men today are still walking around with that question unanswered in their souls. Do not let your children grow into that ache.",
        reflectionQ1:
          "When was the last time you spoke a clear blessing over each of your children - not a compliment about something they did, but a word about who they are, who God made them to be? What is the blessing each of them most needs from you right now?",
        reflectionQ2:
          "Is there a place where you are still waiting on a blessing that your own father did not give you - and is that ache leaking into how you father your kids? What might it look like to receive that blessing from your Father in heaven so that you can give it to your children freely?",
      },
      {
        dayNumber: 7,
        chapter: "Malachi 4",
        commentary:
          "The Old Testament closes with one of the most haunting promises in Scripture - that God will turn the hearts of fathers to their children and the hearts of children to their fathers. The threat that follows is sobering: lest I come and strike the land with a curse. God treats the relationship between fathers and children as load-bearing for an entire society. A nation of disengaged fathers produces an entire generation under a kind of curse. A nation of present, turning, returning fathers produces healing.",
        reflectionQ1:
          "Is your heart actually turned to your children right now - in your attention, your prayers, your time, your emotional energy - or has it drifted somewhere else? What pulled it away, and what would it look like to turn it back?",
        reflectionQ2:
          "The promise is mutual - hearts of fathers to children, and children to fathers. What is one specific thing you could do this week to soften the door between you and one of your children - especially one whose heart has been drifting away from you?",
      },
    ],
  },
  {
    title: "Mothering with Grace",
    category: "mothers",
    totalDays: 7,
    description:
      "A 7-day devotional for mothers — strength, presence, prayer, and the quiet, sacred work of raising children who know God.",
    days: [
      {
        dayNumber: 1,
        chapter: "1 Samuel 1",
        commentary:
          "Hannah is a woman in deep pain - barren, mocked by her rival, misunderstood by her husband. She goes to the temple and prays so intensely the priest assumes she is drunk. Her prayer is raw, specific, and full of surrender. When Samuel is finally born, she does not cling - she gives him back to the Lord. Hannah teaches mothers something foundational: the children you carry were always God's first. Mothering is stewardship, not ownership.",
        reflectionQ1:
          "Where have you started to hold one of your children as if they were yours to own rather than yours to steward - controlling their outcomes, their friendships, their future, because the alternative feels unbearable? What is the fear underneath that grip?",
        reflectionQ2:
          "Hannah brought her deepest grief to God and was honest enough to be mistaken for drunk. Is there a part of mothering right now that you have been hiding from God because it feels too dark, too disappointed, or too unspiritual? What would it look like to bring that part of you to Him today?",
      },
      {
        dayNumber: 2,
        chapter: "Luke 1",
        commentary:
          "Mary is a young woman with no track record, no platform, and no apparent reason to be chosen - and the angel calls her favored. Her response is one of the most striking sentences in Scripture: behold, I am the servant of the Lord; let it be to me according to your word. She does not ask for control. She does not negotiate. She does not list her conditions. She says yes to a calling that will cost her her reputation, her plans, and eventually her son. That kind of yes is the doorway through which God moves in a mother's life.",
        reflectionQ1:
          "Where in your motherhood right now is God asking you for a yes - to a season, a sacrifice, a child's struggle, a calling that feels too heavy - that you have been negotiating, delaying, or pretending not to hear? What is the actual cost you are afraid of?",
        reflectionQ2:
          "Mary's yes was not loud, not staged, not performative. It was a quiet, surrendered yes from a young woman alone with an angel. What would a hidden, unwitnessed yes from you look like this week - one God will see and your kids will eventually feel even if no one ever names it?",
      },
      {
        dayNumber: 3,
        chapter: "Proverbs 31",
        commentary:
          "The famous chapter is technically the words of a king's mother teaching her son what to look for in a wife. But read it as a mother and you see a portrait of strength - not soft, sentimental motherhood, but a woman who plans, provides, protects, opens her hand to the poor, laughs at the future, and teaches with kindness. The chapter ends with her children rising up to call her blessed. Not for being perfect. For being present, faithful, and fearing the Lord.",
        reflectionQ1:
          "Where have you confused good mothering with perfect mothering - and let the gap between them become a source of constant shame instead of motivation? What would it look like to mother with strength rather than from fear of falling short?",
        reflectionQ2:
          "Verse 26 says she opens her mouth with wisdom, and the teaching of kindness is on her tongue. Listen to yourself this week. Is the tone of your tongue in your home actually kindness - even when you are tired, even when they are difficult - or has it slipped into something harsher? What needs to change?",
      },
      {
        dayNumber: 4,
        chapter: "2 Timothy 1",
        commentary:
          "Paul reminds Timothy of the sincere faith that dwelt first in his grandmother Lois and his mother Eunice - and then in him. The word for dwelt means to take up residence, to live in. The faith of these two women did not just inform Timothy. It lived in him. They did not raise him in a sermon. They raised him in a thousand ordinary moments where they were people of God, and he watched. That is how generational faith actually moves.",
        reflectionQ1:
          "If your children inherited only what they witnessed in your daily walk with God - not what you said you believed, what they actually saw - what kind of faith would dwell in them? Be honest. Where is the gap?",
        reflectionQ2:
          "What is one daily, ordinary practice - prayer, Scripture, gratitude, kindness, repentance - that you could begin to do visibly, where your kids can see it, this week? Not to perform, but to put the faith in front of them so it can take residence.",
      },
      {
        dayNumber: 5,
        chapter: "Exodus 2",
        commentary:
          "Pharaoh has decreed that every Hebrew baby boy is to be killed. Jochebed, the mother of Moses, hides him as long as she can - and when she cannot hide him anymore, she places him in a basket on the very river that was supposed to drown him. She does not surrender him to Pharaoh. She surrenders him to God. And God uses her trust to deliver an entire nation. Some of the most important things a mother does are placing her child in a basket on a river she cannot control.",
        reflectionQ1:
          "What is the river right now that you cannot control - a child's struggle, a season of distance, an environment that feels unsafe, a future that scares you - and what would it look like to place your child in God's hands instead of trying to grip them tighter?",
        reflectionQ2:
          "Jochebed's trust was not passive - she wove the basket, she sealed it, she set it in the reeds. Trust does not mean doing nothing. What is the wise, intentional thing God is asking you to do for your child - and where are you stuck because you keep waiting for certainty before you act?",
      },
      {
        dayNumber: 6,
        chapter: "Mark 7",
        commentary:
          "The Syrophoenician woman approaches Jesus on behalf of her daughter. Jesus tests her with what sounds almost dismissive: it is not right to take the children's bread and throw it to the dogs. Her response is one of the great moments of faith in the gospels: yes, Lord, yet even the dogs eat the crumbs. She does not back down. She does not get offended. She does not stop asking. She comes for her daughter, and she will not leave without an answer.",
        reflectionQ1:
          "Are you persistently going to Jesus for your child - not occasionally, not when crisis hits, but daily, fiercely, refusing to stop - or has your prayer for them gone quiet over time? What stopped you from contending the way this mother did?",
        reflectionQ2:
          "This woman did not need Jesus to comfort her or affirm her. She needed Him to act. Is there a place where you have settled for asking God to bless your child when what you actually need is to ask Him to break in? What would the bolder ask sound like?",
      },
      {
        dayNumber: 7,
        chapter: "John 19",
        commentary:
          "Mary stands at the foot of the cross. The sword Simeon prophesied would pierce her own soul is now piercing it. She does not run. She does not curse the heavens. She stays. Jesus, dying, looks down and gives her into the care of John - one final act of a son honoring his mother, and a mother bearing what no mother should have to bear. There is a kind of mothering that is mostly visible and active. And there is a kind of mothering that is mostly standing - present, faithful, refusing to look away when it would be easier.",
        reflectionQ1:
          "Where in your motherhood right now are you being called to stand rather than fix - with a child whose pain you cannot remove, in a season you cannot rush, at the foot of a cross you did not choose? What is making it so hard just to stay?",
        reflectionQ2:
          "Mary's grief did not have to be hidden, denied, or spiritualized for it to be holy. Where have you been pretending you are okay because mothers are supposed to be the strong one? Who could you tell the truth to this week - including God?",
      },
    ],
  },
  {
    title: "As For Me And My House",
    category: "family",
    totalDays: 7,
    description:
      "A 7-day devotional for families — read together at dinner, in the car, before bed. Short, honest, and meant to start conversations.",
    days: [
      {
        dayNumber: 1,
        chapter: "Joshua 24",
        commentary:
          "Near the end of his life, Joshua gathers all of Israel and gives them a choice: pick the God you will actually serve. Then he plants his flag: as for me and my house, we will serve the Lord. He does not say I hope my house will, or I will try to convince my house, or my house will figure it out. He says we. A family becomes a family that follows God when the leaders of that family declare it and then live it - publicly, repeatedly, and without apology.",
        reflectionQ1:
          "Has your household ever actually decided - out loud, together - whom you will serve? Or has it been assumed, drifted, or left up to each person to sort out? What would it mean to make the declaration explicit this week?",
        reflectionQ2:
          "Joshua's declaration was not just about beliefs - it was about practices. What is one thing your family currently does that would not match a household that serves the Lord? What is one new practice you could begin together that would?",
      },
      {
        dayNumber: 2,
        chapter: "Deuteronomy 6",
        commentary:
          "Moses tells Israel that the most important commandment - to love God with all your heart, soul, and strength - is to be taught by parents to children in the ordinary flow of life. When you sit at home. When you walk along the road. When you lie down. When you get up. Faith is not transferred in formal lessons. It is transferred in the small moments of a normal day where parents let God be part of the conversation.",
        reflectionQ1:
          "When you sit at home, walk together, lie down, and get up - what is the main topic in your house? What does your kids' everyday experience tell them is most important to your family?",
        reflectionQ2:
          "What is one normal moment - dinner, the drive to school, bedtime - where you could begin to invite God into the conversation this week? Not a lecture. A simple question, a verse, a thank you, a prayer.",
      },
      {
        dayNumber: 3,
        chapter: "Psalm 78",
        commentary:
          "Asaph commands the older generation to tell the next generation what God has done. Tell them - not let them figure it out, not hope they overhear, not assume they will inherit it. Tell. The faith of every generation depends on the willingness of the previous one to speak it out loud, including the messy, the miraculous, and the parts where God has been faithful even when the people were not.",
        reflectionQ1:
          "When was the last time you told your kids - directly, on purpose - a story about how God has been faithful to your family? Not a Bible story. A real story. What stories are they missing that they deserve to know?",
        reflectionQ2:
          "What is one moment of God's faithfulness in your family's history that your kids do not yet know - a prayer answered, a season survived, a verse that changed something - and could you tell it together this week?",
      },
      {
        dayNumber: 4,
        chapter: "Ephesians 6",
        commentary:
          "Paul writes one of the few passages in the New Testament addressed directly to children: honor your father and mother. And he writes one to parents: do not provoke your children. The instructions are not symmetrical, but they are simultaneous. A family that follows God has both ends of the equation active - children learning to honor, parents learning to lead without provoking. The home is not a battlefield to win. It is a workshop where each member is being shaped.",
        reflectionQ1:
          "What is one specific thing each member of your family could begin to do differently this week - based on this chapter - that would change the atmosphere of your home? Talk about it together.",
        reflectionQ2:
          "Verse 4 calls parents to discipline and instruction in the Lord - which is patient, formative, and rooted in Scripture. Verse 1 calls children to obey in the Lord. What does honoring God together look like in your home in practice - not as a feeling, but as a decision?",
      },
      {
        dayNumber: 5,
        chapter: "Acts 16",
        commentary:
          "Lydia is the first European convert in the book of Acts. The verse says she was baptized, and her household. Then when the Philippian jailer is converted later in the chapter, he is baptized at once, he and all his family. The pattern is clear: when God moves in a person's life, He tends to move through them into their household. Your faith is never just yours. It is the doorway through which God reaches the people you live with.",
        reflectionQ1:
          "Talk about this together: how has God moved through one person in your family to shape the rest of you? It could be a parent, a grandparent, a sibling, even a child. What seeds did they plant that you are still benefiting from?",
        reflectionQ2:
          "What is one way each person in your family could pray for the people they live with this week? Not abstractly. With specifics. Names, situations, hopes. Try saying them out loud.",
      },
      {
        dayNumber: 6,
        chapter: "Genesis 18",
        commentary:
          "God says of Abraham, I have chosen him so that he may command his children and his household after him to keep the way of the Lord. The chosen-ness of Abraham was not about him alone. God was after a household, and then a tribe, and then a nation, through one faithful father. Families that walk with God do not happen on accident. They happen because someone is intentional enough to keep pointing the household toward the way of the Lord, year after year, even when no one is impressed.",
        reflectionQ1:
          "Who in your family is most clearly trying to keep the household pointed toward God right now - and how can the rest of the family back them up rather than make their job harder? Be honest as a family.",
        reflectionQ2:
          "What is one specific way of the Lord - kindness, honesty, generosity, humility - that your family has been quietly drifting from, and what would it look like to deliberately turn back together this week?",
      },
      {
        dayNumber: 7,
        chapter: "Matthew 19",
        commentary:
          "The disciples try to keep the children away from Jesus, assuming He is too important and too busy. Jesus rebukes them: let the little children come to me. For of such is the kingdom of heaven. Jesus is not just allowing the kids - He is using them as a model. The kingdom belongs to those who come like children: open-handed, hungry, trusting, unimpressed with themselves. A family that wants to follow God does not need to be impressive. It needs to be willing to come.",
        reflectionQ1:
          "In what way has someone in your family - parent or child - been keeping themselves from Jesus because they think they are too messed up, too tired, or too far gone? What would coming look like for them this week?",
        reflectionQ2:
          "Pray together as a family right now. Each person says one thing they want to thank God for, and one thing they are bringing to Him. Keep it simple. Keep it real. Let the youngest go first.",
      },
    ],
  },
  {
    title: "First Things",
    category: "youth",
    totalDays: 7,
    description:
      "A 7-day devotional for teenagers and young adults — your identity, your courage, your purpose, and the kind of life that actually lasts.",
    days: [
      {
        dayNumber: 1,
        chapter: "1 Timothy 4",
        commentary:
          "Paul writes to a young pastor and tells him: do not let anyone look down on you because you are young, but set an example. Paul does not tell Timothy to wait until he is older. He tells him to live now in a way that makes his age irrelevant. The world will use your age as a reason to dismiss you. The Bible says your age is not a disqualification. Your example is.",
        reflectionQ1:
          "Where have you been telling yourself that you are too young to be taken seriously about your faith - and so you have not bothered to live like you mean it yet? What if today was the day you stopped waiting?",
        reflectionQ2:
          "Paul lists the areas of example: speech, conduct, love, faith, purity. Which of these is the weakest in your life right now - the one most out of step with what you say you believe? What is one specific thing you could do this week to begin to set an example there?",
      },
      {
        dayNumber: 2,
        chapter: "Daniel 1",
        commentary:
          "Daniel is taken from his home as a teenager, dragged to Babylon, and put through a program designed to erase his identity - his name, his diet, his God. The verse says Daniel resolved that he would not defile himself. Resolved. Before the pressure showed up. Before everyone around him caved. He decided in advance who he was, and the decision held when the moment came. The strongest young people are not the ones who can resist on the spot. They are the ones who decided before.",
        reflectionQ1:
          "What is the next compromise that is coming for you - the next party, the next conversation, the next opportunity to be someone you are not - and have you decided in advance how you will respond, or will you be deciding in the moment when the pressure is loudest?",
        reflectionQ2:
          "Daniel's resolve cost him in the short term but produced a life God used in extraordinary ways. What is one resolution you could make today - written down, named out loud, told to one trusted person - that would set the trajectory of the next decade of your life?",
      },
      {
        dayNumber: 3,
        chapter: "Psalm 119",
        commentary:
          "The psalmist asks one of the most important questions a young person can ask: how can a young person keep their way pure? The answer he gives is not therapy, not willpower, not better friends. The answer is by guarding it according to your word. He hides God's word in his heart so that he might not sin. He does not depend on remembering it when the moment comes. He depends on having absorbed it before the moment ever shows up.",
        reflectionQ1:
          "How much of God's word is actually in you right now - not on your phone, not on your shelf, but in you, available when you need it? If the honest answer is not much, what would it look like to begin hiding it in your heart this week?",
        reflectionQ2:
          "Which of the temptations and pressures you are facing right now would lose half its power if a specific verse was lodged in your head and ready to surface? Find that verse this week. Memorize it. See what happens.",
      },
      {
        dayNumber: 4,
        chapter: "1 Samuel 17",
        commentary:
          "Everyone tells David the truth as they see it: he is too young, too small, too inexperienced, too unequipped. But David has been quietly faithful in obscure places - watching sheep, killing a lion, killing a bear - and that hidden faithfulness has formed him into someone who knows that God is real and that God is bigger than what people see. David does not need everyone to believe in him. He has already settled that God does.",
        reflectionQ1:
          "Where is God growing you in the hidden, unimpressive places of your life right now - school, family chores, a quiet job, an obscure season - and are you despising it or letting it form you into the kind of person God can use later?",
        reflectionQ2:
          "What is your Goliath right now - the thing that feels impossibly bigger than you, the thing that makes your faith feel small? Read David's words in verse 26 and verse 45. What would it look like to face that thing in God's name rather than your own?",
      },
      {
        dayNumber: 5,
        chapter: "2 Timothy 2",
        commentary:
          "Paul tells the young pastor Timothy to flee youthful passions and pursue righteousness, faith, love, and peace. Flee is a strong word - it is what you do when fighting is foolish and getting close is dangerous. Paul knows that the issue with the strongest temptations of youth is not how to win the fight in the moment. It is how to not put yourself in the moment in the first place. Wise young people are not the ones with the most willpower. They are the ones who plan their feet.",
        reflectionQ1:
          "What is the specific situation, person, app, account, or rhythm that you keep telling yourself you can handle - but you know you cannot - and what would actually fleeing look like, not someday but this week?",
        reflectionQ2:
          "Paul tells Timothy to pursue righteousness, faith, love, and peace alongside others who call on the Lord from a pure heart. Who are the people in your life right now who are pursuing those things - and how can you spend more time near them and less time near anyone who pulls you the other way?",
      },
      {
        dayNumber: 6,
        chapter: "Ecclesiastes 12",
        commentary:
          "Solomon ends his most honest book with a charge to young people: remember your Creator in the days of your youth, before the difficult days come. He is not being morbid. He is being merciful. He knows that the patterns set in youth become the cages or the freedom of adulthood. A life given to God early bends differently than a life given to God after it has been worn out by everything else.",
        reflectionQ1:
          "What pattern are you setting right now - in how you spend your time, what you feed your mind, how you treat people, what you do with your money - that will be carrying you forward into your twenties, thirties, and forties? Is it the pattern you want?",
        reflectionQ2:
          "What is one specific thing about your relationship with God that you have been planning to take seriously later - when you are older, more stable, less busy - and what would it look like to start now instead of waiting for a later that never quite comes?",
      },
      {
        dayNumber: 7,
        chapter: "Matthew 19",
        commentary:
          "A rich young man comes to Jesus with a sincere question and a polished life. Jesus loves him - the text says so - and gives him one specific instruction: sell everything, give to the poor, and follow me. The young man walks away sad. He had wanted Jesus on his terms. Jesus offered Himself on Jesus's terms. The question every young person eventually answers is whether they want a God who fits inside their plans or a God whose plans they will follow even when it costs them their plans.",
        reflectionQ1:
          "What is the one thing - the relationship, the dream, the lifestyle, the image - that you would walk away from Jesus sad over rather than give up? Be honest about what is sitting in that spot in your life right now.",
        reflectionQ2:
          "Jesus did not pursue the young man down the road. He let him walk. But the invitation was real, and it stays real. What is the invitation Jesus is making to you right now that you have been walking away from? What would it look like to turn around?",
      },
    ],
  },
  {
    title: "Start Here",
    category: "new-believer",
    totalDays: 7,
    description:
      "A 7-day devotional for new believers — the foundations of following Jesus, one chapter at a time, with no assumed background.",
    days: [
      {
        dayNumber: 1,
        chapter: "John 3",
        commentary:
          "Nicodemus comes to Jesus at night - cautious, curious, looking for an upgrade to his already religious life. Jesus does not give him tips. He tells him he needs to be born again. The Christian life does not begin with self-improvement. It begins with God reaching into you and giving you a new beginning you could not produce yourself. If that has happened to you - or you are starting to suspect it has - the rest of this week is about what to do next.",
        reflectionQ1:
          "How would you describe what has happened or is happening in you right now? Not the religious version. The real version. What has drawn you to Jesus?",
        reflectionQ2:
          "Verse 16 is the most famous verse in the Bible: for God so loved the world. Do you actually believe that God loves you - personally, not generally? Where do you doubt it most, and what would it change if it were true?",
      },
      {
        dayNumber: 2,
        chapter: "Romans 8",
        commentary:
          "Paul opens this chapter with five of the most important words a Christian will ever read: there is therefore now no condemnation for those who are in Christ Jesus. Not less condemnation. Not eventual freedom from condemnation. No condemnation - now. The new believer needs to know this on day one and remember it on day ten thousand. The shame you have been carrying does not belong to you anymore. Jesus paid for it. He does not bring it up again.",
        reflectionQ1:
          "What past sin, failure, or version of yourself have you been quietly carrying as if God still holds it against you? Why have you found it so hard to believe He does not?",
        reflectionQ2:
          "Verse 28 says all things work together for good for those who love God. Look at one hard thing in your past or present. What would it mean to believe that God is actually working it into something good, even if you cannot see it yet?",
      },
      {
        dayNumber: 3,
        chapter: "John 14",
        commentary:
          "Jesus tells His disciples: I am the way, the truth, and the life. No one comes to the Father except through me. He does not say He is one way among many. He claims to be the only door. This is either offensive or it is the most important sentence ever spoken. Christianity is not a religion you adopt to be a better person. It is following the only Person who is the way back to God.",
        reflectionQ1:
          "Do you actually believe Jesus is the only way to God - or have you held that belief loosely because it feels harsh? What might it look like to take Him at His word here?",
        reflectionQ2:
          "Verse 27 says Jesus gives a peace the world cannot give. Where do you most need that kind of peace right now? Ask Him for it directly. Out loud. Today.",
      },
      {
        dayNumber: 4,
        chapter: "Matthew 6",
        commentary:
          "The disciples ask Jesus how to pray, and He gives them what we now call the Lord's Prayer. Notice what He does not do. He does not give them a script to recite. He gives them a structure: praise God, ask for His will, ask for what you need, confess your sins, ask for protection. Prayer is not a performance. It is a conversation with a Father who already knows what you need and still wants to hear it from you.",
        reflectionQ1:
          "What has prayer been like for you so far - awkward, intimidating, formal, missing? What story have you told yourself about who is good at prayer and who is not?",
        reflectionQ2:
          "Try praying the structure from the Lord's Prayer right now. In your own words. No special voice. Praise, kingdom, need, confession, protection. What changed in just trying it?",
      },
      {
        dayNumber: 5,
        chapter: "2 Timothy 3",
        commentary:
          "Paul writes that all Scripture is breathed out by God and is useful for teaching, correcting, training in righteousness. The Bible is not just a religious classic. Christians believe it is the actual voice of God preserved through generations to shape the actual life of every reader who comes to it. You will not change because you tried harder. You will change because what God breathed out begins to reshape what is inside you.",
        reflectionQ1:
          "What is your relationship with the Bible right now? Have you ever read it as if God might actually want to speak to you through it - personally? What has held you back?",
        reflectionQ2:
          "Pick one book of the New Testament to read this week - the Gospel of Mark is a great starting point. Plan when and where you will read it. Tell one person. What do you expect, and what do you hope for?",
      },
      {
        dayNumber: 6,
        chapter: "Hebrews 10",
        commentary:
          "The writer tells believers to not neglect meeting together, as is the habit of some. Christianity is not a private spirituality. It was never designed to be. You were made for a body - a local church where you are known, where you are formed, where you serve, where you are challenged, where you grow. Trying to follow Jesus by yourself produces a thin, easily discouraged faith. You were not meant to do this alone.",
        reflectionQ1:
          "Are you currently part of a local church where you are actually known - or have you been treating Christianity like something you can do alone with an app? What has been the cost of staying disconnected?",
        reflectionQ2:
          "Verse 24 says to stir up one another to love and good works. Who could you reach out to this week - a Christian friend, a pastor, a small group leader - and let them know you are starting this journey? What is stopping you?",
      },
      {
        dayNumber: 7,
        chapter: "Matthew 28",
        commentary:
          "The risen Jesus gives His followers their mission: go and make disciples of all nations, teaching them everything He commanded. The Christian life is not a private religion. It is an open invitation to the world delivered through ordinary believers like you. Jesus does not say this only to professional ministers. He says it to everyone who follows Him. From day one, you are sent.",
        reflectionQ1:
          "Who in your life right now does not know Jesus the way you are beginning to - and what is the fear or hesitation keeping you from being honest with them about what is happening in you?",
        reflectionQ2:
          "Jesus ends the passage with this promise: I am with you always, to the end of the age. Where do you most need to hear that promise right now? Sit with it for a minute. Then write down one step you are going to take this week.",
      },
    ],
  },
  {
    title: "The Discipline of Following",
    category: "mens",
    totalDays: 7,
    description:
      "A 7-day devotional for men on what it actually costs to follow Jesus — discipline, surrender, endurance, and the long obedience.",
    days: [
      {
        dayNumber: 1,
        chapter: "Mark 1",
        commentary:
          "Jesus walks past four men working a normal job - fishing - and says two words: follow me. They leave their nets immediately. Mark does not say they prayed about it for six months or waited for a feeling. They left the boats. Christianity at its core is not a set of beliefs. It is a man walking after the One who called him, leaving behind whatever does not come with Him. If you have been a Christian for a long time and the leaving has gone quiet in you, something has gone soft.",
        reflectionQ1:
          "What did you leave behind to follow Jesus, and what has slowly come back into your life - small enough that no one would notice, large enough that it is now competing with Him? Be specific.",
        reflectionQ2:
          "If Jesus walked past your life today and said follow me, what is one specific thing you would have to drop right now - not someday - to actually go? What is making it hard to drop it?",
      },
      {
        dayNumber: 2,
        chapter: "Luke 9",
        commentary:
          "Jesus tells the crowd what following Him will cost: deny yourself, take up your cross daily, and follow me. The cross was not a metaphor for inconvenience. It was the most brutal form of execution in the Roman world. Jesus is saying that to follow Him is to walk into the death of your own agenda, your own preferences, your own comfort - daily. The daily is what makes it disciplined. The cross is what makes it real.",
        reflectionQ1:
          "Where in your life right now is your own preference quietly winning the day - over your wife, your kids, your boss, your church, your call - because surrendering it would cost more than you have been willing to pay? Name the place.",
        reflectionQ2:
          "Take up your cross daily. What is the daily cross God has been asking you to carry that you keep putting down? What does picking it back up actually look like this week?",
      },
      {
        dayNumber: 3,
        chapter: "Hebrews 12",
        commentary:
          "The writer of Hebrews compares the Christian life to a race - and not a sprint. He tells the runner to lay aside every weight and the sin which clings so closely, and to run with endurance. The word for endurance is hypomone - patient, persistent staying-under. Not heroics. Just refusing to quit. Most men do not lose the race because they take a wrong turn. They lose it because they slow down and never start running again.",
        reflectionQ1:
          "What weight in your life is not technically sin but is slowing you down - a relationship, a hobby, a habit, a media diet, a level of fatigue - that you keep telling yourself is fine? What would it look like to lay it aside?",
        reflectionQ2:
          "Verse 2 says to look to Jesus, who endured the cross for the joy set before Him. What is the joy set before you - the future, the reunion, the well done - that you are forgetting in the daily grind? How can you keep that in front of you this week?",
      },
      {
        dayNumber: 4,
        chapter: "2 Timothy 2",
        commentary:
          "Paul gives Timothy three pictures of the Christian life: a soldier, an athlete, a farmer. Each one trains. Each one endures. Each one waits for results that come long after the work was done. Christianity is not a feeling. It is the long obedience of a man who keeps showing up because he has been enlisted, because he is in training, because he has planted seeds whose harvest he may not see for years.",
        reflectionQ1:
          "Which picture lands hardest - soldier, athlete, or farmer - and what does that say about the part of the Christian life God is asking you to grow into right now? Be specific about what training, discipline, or patience looks like for you.",
        reflectionQ2:
          "Verse 4 says no soldier gets entangled in civilian pursuits. What civilian pursuit is currently entangling you - distracting your focus, dividing your loyalty, draining your energy - and what would untangling look like this week?",
      },
      {
        dayNumber: 5,
        chapter: "Galatians 5",
        commentary:
          "Paul names the alternative to walking by the Spirit: the works of the flesh. He lists them plainly - sexual immorality, jealousy, fits of anger, divisions, drunkenness. Then he names the fruit of the Spirit: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control. The Christian life is not white-knuckling against the works of the flesh. It is daily walking with the Spirit so that the fruit grows on its own.",
        reflectionQ1:
          "Look at the works of the flesh list. Which one is the most consistent presence in your life right now - even quietly? Are you fighting it by willpower alone, or are you actually walking with the Spirit?",
        reflectionQ2:
          "Which fruit of the Spirit is most missing in your life right now? What rhythm with God - Scripture, prayer, confession, worship - has been quietest, and what would it look like to begin again this week?",
      },
      {
        dayNumber: 6,
        chapter: "Philippians 3",
        commentary:
          "Paul says he has not yet arrived but he presses on - forgetting what lies behind and straining forward toward what lies ahead. He uses the language of a runner leaning into the finish. Paul is decades into following Jesus and still describes himself as not yet attained. The mature Christian is not the one who has arrived. The mature Christian is the one who is still pressing.",
        reflectionQ1:
          "Where have you started to drift into a maintenance Christianity - keeping the basics intact but no longer pressing toward anything specific? What was the last time you were spiritually hungry?",
        reflectionQ2:
          "Paul says forgetting what lies behind. Is there a past failure or past glory that you keep going back to instead of pressing forward? What would forgetting it actually look like - not denying it, but no longer letting it define your present?",
      },
      {
        dayNumber: 7,
        chapter: "Romans 12",
        commentary:
          "Paul calls believers to present their bodies as a living sacrifice. The strange phrase says a lot - sacrifices are normally dead. A living sacrifice is one that keeps climbing back off the altar. Paul knows that the Christian life is not a single dramatic decision. It is a thousand small ones to climb back on the altar, to surrender the same thing again, to keep offering yourself even when no one notices.",
        reflectionQ1:
          "What is the part of you that keeps climbing back off the altar - the same area you have surrendered a hundred times and keep needing to surrender again? Why has it been so hard to leave it there?",
        reflectionQ2:
          "Verse 2 says do not be conformed but be transformed by the renewal of your mind. What input is shaping your mind most right now - news, scrolling, work culture, voices in your circle? What would renewing your mind look like as a daily practice instead of a once-in-a-while idea?",
      },
    ],
  },
  {
    title: "Together",
    category: "marriage",
    totalDays: 7,
    description:
      "A 7-day devotional for couples — read it together, talk about the questions, and let it form the marriage you actually have.",
    days: [
      {
        dayNumber: 1,
        chapter: "Genesis 2",
        commentary:
          "Before the fall, God designs marriage with one word that has never been improved upon: one. A man leaves his father and mother, holds fast to his wife, and the two become one flesh. Marriage is not a contract. It is a fusion. Two distinct people, fully themselves, becoming a single shared life. Almost every problem in marriage is a problem of resisting the oneness - keeping a part of yourself for yourself, holding back, hiding, choosing solo over shared.",
        reflectionQ1:
          "Talk about this together: where in your marriage right now are you still living as two separate people instead of one shared life - in finances, decisions, schedule, emotional honesty? What part of yourself have you been holding back?",
        reflectionQ2:
          "What would it look like to take one specific area - one - and begin to share it more fully this week? Not all at once. One step closer to one.",
      },
      {
        dayNumber: 2,
        chapter: "Ephesians 5",
        commentary:
          "Paul tells husbands to love their wives as Christ loved the church - sacrificially. He tells wives to respect their husbands as the church respects Christ. Both calls are hard. Both calls are unflinching. Neither is conditional on the other being easy to live with. The Christian marriage is not built on a fair exchange. It is built on each person choosing - day after day - to give what God has called them to give, regardless of what they are receiving in that moment.",
        reflectionQ1:
          "Husband: where have you tied your love for your wife to her behavior - good day, easy mood, met expectations - rather than to Christ's love for the church? Wife: where have you tied your respect for your husband to his performance instead of to his calling? Both: name it together.",
        reflectionQ2:
          "What is one thing each of you could do this week, regardless of what the other does first, that would obey what God specifically asked of you in this passage? Decide together. Then do it.",
      },
      {
        dayNumber: 3,
        chapter: "1 Corinthians 13",
        commentary:
          "Paul writes the most quoted love passage in the Bible to a church full of conflict, immaturity, and pride - not to a wedding. Love is patient. Love is kind. Love does not envy or boast. Love is not arrogant or rude. Love bears all things, believes all things, hopes all things, endures all things. Paul is not describing a feeling. He is describing a posture - what love does, even when it does not feel like loving anyone.",
        reflectionQ1:
          "Read verses 4-7 out loud and replace love with your name. Where does it stop being true about you? Be specific about the lines that hit hardest - and tell your spouse what you are seeing.",
        reflectionQ2:
          "Pick one quality from this passage that you have struggled to live out toward your spouse - patience, kindness, not keeping score, bearing, enduring. What would actually growing in that quality look like this week, with their help?",
      },
      {
        dayNumber: 4,
        chapter: "Proverbs 17",
        commentary:
          "A friend loves at all times, and a brother is born for adversity. Most marriages start as romance and have to become friendship to survive. Romance is the spark. Friendship is the fire that lasts. Marriages that endure are not the ones with the most chemistry. They are the ones where the two people genuinely like each other - and have kept choosing to be each other's closest friend through every season.",
        reflectionQ1:
          "Are you still actively friends - the kind who like each other, who choose to spend time together, who know what the other is currently carrying? Or has the friendship gone thin under the weight of life and roles?",
        reflectionQ2:
          "What is one thing that used to make you good friends - a habit, a pastime, an inside joke, a shared interest - that has fallen away? Could you bring it back this week, or replace it with something new that fits this season?",
      },
      {
        dayNumber: 5,
        chapter: "Ephesians 4",
        commentary:
          "Paul writes some of the most practical relationship advice in the Bible: do not let the sun go down on your anger. He is not banning anger. He is saying do not let it set in. Marriages do not usually die from one explosion. They die from a thousand small unresolved hurts that were allowed to sit overnight, then over a week, then over a year, until distance hardens into something almost permanent.",
        reflectionQ1:
          "Is there something between you right now - an unresolved hurt, a tension, a comment that landed wrong, a pattern that keeps repeating - that you have been letting the sun go down on? Name it together. Out loud.",
        reflectionQ2:
          "Verse 32 says be kind to one another, tenderhearted, forgiving one another, as God in Christ forgave you. What does forgiving each other look like for the thing you just named - not just letting it go quietly, but choosing it deliberately?",
      },
      {
        dayNumber: 6,
        chapter: "Mark 10",
        commentary:
          "Jesus is asked about divorce, and He goes back to Genesis. From the beginning of creation, God made them male and female. A man shall leave his father and mother and hold fast to his wife, and the two shall become one flesh. So they are no longer two but one. What therefore God has joined together, let no one separate. Jesus elevates marriage to something heavier than the culture around Him assumed - because God Himself is the one who joined you.",
        reflectionQ1:
          "Where in your marriage have you been quietly entertaining separation - emotionally, mentally, in conversations with friends, in fantasies about a different life - even if divorce is not on the table? Be brave enough to tell each other.",
        reflectionQ2:
          "Jesus says God joined you. Talk together about what it means that this marriage is not just yours to manage but God's to build. What would it look like to invite Him in more honestly this week?",
      },
      {
        dayNumber: 7,
        chapter: "Ecclesiastes 4",
        commentary:
          "Two are better than one, because they have a good reward for their toil. Solomon describes a marriage like this - if they fall, one will lift up his fellow; woe to him who is alone when he falls. And a threefold cord is not quickly broken. The most resilient marriages are not just two people. They are two people and God - three strands woven together. The two of you alone will eventually fray. The three of you woven together holds.",
        reflectionQ1:
          "What does the third strand of your marriage actually look like right now - prayer together, shared time in Scripture, going to church together, talking about God in your everyday conversation? Be honest about what is there and what is missing.",
        reflectionQ2:
          "Pray together right now. Out loud. One thing each of you wants to thank God for in your marriage, and one thing you want to ask Him for. Then plan one rhythm together that will keep the third strand in the weave this season.",
      },
    ],
  },
  {
    title: "Anchored",
    category: "general",
    totalDays: 7,
    description:
      "A 7-day devotional for any season — trusting God when life feels unsteady, hard, or uncertain.",
    days: [
      {
        dayNumber: 1,
        chapter: "Psalm 46",
        commentary:
          "God is our refuge and strength, a very present help in trouble. The psalm goes on to describe earth giving way, mountains falling into the sea, waters roaring - and the people of God not fearing. The world the psalmist describes is unstable. The God he describes is not. The most quoted line is verse 10: be still and know that I am God. The stillness is not the absence of chaos around you. It is the presence of God under you.",
        reflectionQ1:
          "What is currently roaring in your life - the worry, the situation, the relationship, the diagnosis - that is making it hard to be still? Where does your mind keep going first thing in the morning and last thing at night?",
        reflectionQ2:
          "What would being still and knowing actually look like for you this week - not as a Bible verse on a wall, but as a daily practice that puts you back under God instead of over your problems?",
      },
      {
        dayNumber: 2,
        chapter: "Isaiah 40",
        commentary:
          "Isaiah writes to a people exhausted by their circumstances. He reminds them that even youths grow tired and weary, even strong men stumble. But those who wait on the Lord shall renew their strength. They shall mount up with wings like eagles. The wait here is not passive. It is the active expectation of someone who has decided that God is real, that He shows up, and that He will be the one who lifts when the lifting needs to happen.",
        reflectionQ1:
          "Where are you exhausted right now - and have you been trying to push through in your own strength because slowing down to wait on God feels too risky? What are you afraid will happen if you stop running for a minute?",
        reflectionQ2:
          "What does waiting on the Lord look like in your specific situation - not as a feeling, but as something you actually do this week? Where would you wait, how often, and what would you bring to Him?",
      },
      {
        dayNumber: 3,
        chapter: "Romans 8",
        commentary:
          "All things work together for good for those who love God and are called according to His purpose. Paul does not say all things are good. He says all things work together for good. There is a difference. The hard thing in your life is not being labeled good - it is being woven into something good. You may not see the pattern from where you are standing. The promise is not that you will see it. The promise is that God is doing it.",
        reflectionQ1:
          "What is the hardest thing in your life right now that you have been struggling to believe God could possibly weave into anything good? What has made it hard to believe?",
        reflectionQ2:
          "What would it change about how you walk through this week if you believed that even this - even the slowest, hardest, most unresolved part - was being woven by God into something He intends for your good?",
      },
      {
        dayNumber: 4,
        chapter: "Proverbs 3",
        commentary:
          "Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge Him, and He will make your paths straight. Proverbs does not promise easy paths - it promises straightened ones. The temptation in seasons of unclarity is to try to figure it out by leaning harder on your own reasoning. The instruction is the opposite: trust harder, lean less, acknowledge Him in everything, and let Him do the straightening.",
        reflectionQ1:
          "Where have you been leaning on your own understanding - analyzing, planning, worrying, strategizing - trying to figure out the path forward without actually entrusting it to God? What would acknowledging Him look like in that specific place?",
        reflectionQ2:
          "What is the with all your heart part - what fraction of your heart is actually in this trust right now, and which fraction is still held back, betting on its own backup plan? What would full-hearted trust require?",
      },
      {
        dayNumber: 5,
        chapter: "Habakkuk 3",
        commentary:
          "Habakkuk ends his book with one of the most striking declarations of faith in Scripture: though the fig tree should not blossom, nor fruit be on the vines, the produce of the olive fail and the fields yield no food - yet I will rejoice in the Lord. He does not deny the loss. He names it. And he refuses to let the loss decide whether God is worthy of his trust. His joy is not built on his circumstances. It is built on a God whose worth is not affected by what season he is currently in.",
        reflectionQ1:
          "What is the fig tree not blossoming in your life right now - the area where the expected fruit has not come, the prayer has not been answered, the season has not turned? How long has it been?",
        reflectionQ2:
          "Practice Habakkuk's declaration out loud for your own situation: even though this, yet I will rejoice in the Lord. Say it. Mean it as much as you can. What happens in you when you say it?",
      },
      {
        dayNumber: 6,
        chapter: "Hebrews 11",
        commentary:
          "Faith is the assurance of things hoped for, the conviction of things not seen. The writer of Hebrews then walks through example after example - Abel, Noah, Abraham, Moses, Rahab - of people who lived their entire lives on the strength of promises they never saw fulfilled. The chapter ends with this line: all these died in faith, not having received the things promised. Faith is not a feeling that comes when you can see the outcome. Faith is choosing to live by God's word before the outcome ever shows up.",
        reflectionQ1:
          "What promise of God have you been waiting to see fulfilled - and have you been wavering in your faith because the waiting has gone longer than you expected? What did you assume the timeline would be?",
        reflectionQ2:
          "What would it look like this week to live by faith rather than by what you see - in the specific area where the seeing has not yet arrived? What is one concrete act of trust you could take?",
      },
      {
        dayNumber: 7,
        chapter: "Lamentations 3",
        commentary:
          "In the middle of one of the saddest books in the Bible, Jeremiah suddenly writes: the steadfast love of the Lord never ceases; His mercies never come to an end; they are new every morning; great is your faithfulness. He has not stopped grieving. The destruction around him has not changed. But he has lifted his eyes high enough to remember that God is not finished. Every morning is a new pile of mercy delivered to your doorstep. You did not earn it. You cannot exhaust it.",
        reflectionQ1:
          "Where in your life are you running on yesterday's mercy - the strength, grace, comfort, or hope you had earlier - and have not yet looked up to receive what God has prepared for today?",
        reflectionQ2:
          "Tomorrow morning, before anything else, name one new mercy. Then the next morning, name another. Keep going for a week. What changes in you when you start counting them?",
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
