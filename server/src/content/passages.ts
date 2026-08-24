/**
 * The typing corpus.
 *
 * Every passage is about GenLayer — the protocol, its consensus, its tooling
 * and its vocabulary — so that playing the game teaches the ecosystem.
 *
 * Difficulty is not just length:
 *   easy   — common words, minimal punctuation, no capitals mid-sentence
 *   medium — full protocol vocabulary, commas, hyphens, real paragraphs
 *   hard   — identifiers, symbols, code, mixed case, numbers
 */

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export interface Passage {
  id: string;
  difficulty: Difficulty;
  /** Short label shown in the UI before the race starts. */
  title: string;
  text: string;
}

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; codename: string; blurb: string; accent: string }
> = {
  easy: {
    label: "Easy",
    codename: "Genesis",
    blurb: "Plain language and short lines, so you learn what GenLayer is while you warm up",
    accent: "#43E08B",
  },
  medium: {
    label: "Medium",
    codename: "Consensus",
    blurb: "Real protocol vocabulary, full punctuation, longer passages",
    accent: "#9B6AF6",
  },
  hard: {
    label: "Hard",
    codename: "Byzantine",
    blurb: "Intelligent Contract code, identifiers, symbols and numbers",
    accent: "#FF4D6D",
  },
};

const EASY: Array<[string, string]> = [
  [
    "Trustless Adjudication",
    "Bitcoin gave the world trustless money. Ethereum gave it trustless computation. GenLayer adds the missing layer, and that layer is trustless adjudication. It is the place where a disagreement can be settled without a judge, a bank, or a middleman standing in the way.",
  ],
  [
    "Contracts That Read",
    "A normal smart contract can only count. It moves a number from one address to another and stops there. An intelligent contract can read a sentence, weigh what it means, and then decide. That single change opens the door to agreements written the way people actually write them.",
  ],
  [
    "The Circle of Trust",
    "Civilization has always grown by widening the circle of trust. First the family, then the village, then the city, then a global economy. The next step is already here, because billions of software agents are about to join that circle and they need rules of their own.",
  ],
  [
    "No Oracle Needed",
    "Most chains cannot see the outside world. They hire an oracle to whisper the news to them and they hope the whisper is honest. GenLayer lets the network look for itself, so the answer arrives with the reasoning attached instead of arriving as a bare number.",
  ],
  [
    "A Jury of Machines",
    "Think of the validators as a jury. Each one hears the same case, forms its own view, and then votes. No single juror can decide the outcome alone. The verdict belongs to the group, and the group is chosen at random so nobody can pick a friendly panel in advance.",
  ],
  [
    "Written in Plain Words",
    "The promise is simple. Write the deal in the words you would use with a partner, add the parts that must be exact, and let the network hold both. The clear part runs like code and the human part is judged like a contract should be judged.",
  ],
  [
    "Faster Than a Court",
    "A dispute that once took a year in court can close in minutes. There is no filing fee, no waiting room, and no need to fly anyone to another country. The rules are the same for a large company and for a single person with a laptop.",
  ],
  [
    "Agents Need Referees",
    "Software agents already book travel, move money, and sign for goods. When two of them disagree, someone has to call it. A referee that never sleeps, never takes a bribe, and shows its work is a better fit for that job than a support ticket.",
  ],
  [
    "Stake and Serve",
    "To help run the network you lock up tokens and run a node. If you do the work well you earn a reward. If you cheat or go missing you lose part of what you locked. The incentive is plain enough that you do not need to trust anyone's good manners.",
  ],
  [
    "One Shared Rule Set",
    "Borders make trade slow. A shipment can be legal on one side of a line and a problem on the other. A neutral rule set that both machines and people accept removes that friction, and it does so without asking anyone to give up their own laws.",
  ],
  [
    "Start With a Question",
    "Every intelligent contract begins with a question rather than a formula. Did the delivery arrive on time? Was the review written by a real customer? Does this photo match what the seller promised? The chain answers, and the answer is recorded forever.",
  ],
  [
    "Proof of Reasoning",
    "It is not enough for a machine to be right. It has to show why it was right, in a form that anyone can check later. GenLayer stores the path to the answer next to the answer, so a decision can be replayed long after the moment has passed.",
  ],
  [
    "The Cost of Being Wrong",
    "Anyone who thinks a result is unfair can appeal it. The appeal pulls in a larger group of validators and the case is heard again. If the challenge was honest the record is fixed. If it was noise, the challenger pays for the trouble they caused.",
  ],
  [
    "Small Print, Solved",
    "The small print exists because language is slippery and people argue about it. If the network can read the small print and rule on it, the small print stops being a trap. It becomes just another part of the deal that everyone can inspect.",
  ],
  [
    "Insurance Without Forms",
    "Picture a flight delay policy that pays out on its own. It reads the airline notice, checks the time, and sends the money. Nobody fills in a form, nobody waits on hold, and nobody has to prove a thing that the network can already see.",
  ],
  [
    "Many Models, One Answer",
    "Every validator runs a different model and nobody publishes which one. That variety is the defense. A trick that fools one model rarely fools a room full of them, so an attacker has to beat the whole crowd instead of a single target.",
  ],
  [
    "Value in Motion",
    "Money is already fast. What is slow is the agreement about whether the money should move at all. Speed up the agreement and the whole economy moves faster, because waiting for a decision is usually the longest part of any deal.",
  ],
  [
    "Learn by Building",
    "The fastest way to understand this is to build a tiny contract and watch it run. Ask it something simple, look at how the validators voted, then change one word in your prompt and run it again. The behaviour will teach you more than any diagram.",
  ],
  [
    "Escrow That Thinks",
    "Escrow used to mean a stranger holding your money and taking a cut. Now it can mean a contract that reads the shipping record, looks at the photos, and releases the funds when the terms are met. The stranger and the cut both disappear.",
  ],
  [
    "The Honest Default",
    "Most people are honest most of the time, so a system should assume the good case and only slow down when something looks wrong. That is why the network moves fast by default and only calls a bigger jury when someone actually objects.",
  ],
  [
    "Rules You Can Read",
    "There is little point in a rule that only a lawyer can parse. If the people bound by a rule cannot read it, they cannot follow it either. Contracts written in ordinary language are easier to trust because you can check them yourself.",
  ],
  [
    "Not Just Faster",
    "This is not only about doing the old thing more quickly. Some deals were never worth writing down because the cost of enforcing them was higher than the value at stake. Those deals become possible for the first time.",
  ],
  [
    "The Long Game",
    "Every new layer of the internet looked strange at first and obvious a decade later. Mail, then the web, then payments. Judgment is next, and it will feel just as ordinary once enough things quietly depend on it every day.",
  ],
  [
    "Open to Anyone",
    "There is no application to fill in and no committee to impress. If you can run a node you can help secure the network, and if you can write a sentence you can write a contract. That is the whole barrier, and it is meant to stay that low.",
  ],
];

const MEDIUM: Array<[string, string]> = [
  [
    "Optimistic Democracy",
    "Optimistic Democracy is GenLayer's consensus mechanism, an enhanced Delegated Proof of Stake model in which validators connect directly to large language models. A randomly selected leader proposes an outcome, and a jury of validators independently recomputes it. If a majority agrees, the transaction is accepted; if not, the case escalates to a larger set of validators through the appeal process.",
  ],
  [
    "The Equivalence Principle",
    "Traditional blockchains demand byte-for-byte agreement, which is impossible once a model is involved. The Equivalence Principle replaces that demand with something more useful: two answers may differ in form and still be equivalent in meaning. Developers declare what equivalence means for their contract, and the validators decide whether the leader's output clears that bar.",
  ],
  [
    "GenVM",
    "Every validator node runs GenVM, a sandboxed Python execution environment built to handle calls that no ordinary virtual machine would tolerate. It executes intelligent contracts, isolates their non-deterministic calls to the open web and to language models, and records enough context that another validator can independently reproduce and judge the same result.",
  ],
  [
    "Greyboxing",
    "Because every validator runs a different and undisclosed model, prompt injection loses most of its power. An adversarial input tuned to fool one model will usually fail against the rest of the jury, and the majority vote quietly discards it. This defense is called greyboxing, and it turns model diversity from an inconvenience into a security property.",
  ],
  [
    "The Appeal Window",
    "Finality is not instant, and that is deliberate. During the finality window anyone may appeal a result by posting a bond, which triggers re-evaluation by a larger validator set — typically expanding to two n plus one participants. Successful appeals correct the record and are rewarded; frivolous ones forfeit the bond, which keeps the mechanism sybil-resistant and cheap to run.",
  ],
  [
    "Validators and Roles",
    "Validators are participants who stake tokens for the right to process transactions. On any given transaction one is chosen as leader and proposes the outcome, while the others act as jurors who recompute and vote. Selection is deterministic given the chain state but unpredictable in advance, so no participant can arrange a friendly panel ahead of time.",
  ],
  [
    "Non-Determinism, Contained",
    "Fetching a live web page or calling a language model produces a different answer almost every time, which is why classical chains forbid both. GenLayer contains the non-determinism instead of banning it: the risky call happens inside the leader's sandbox, and the surrounding consensus decides whether the result is one a reasonable network would accept.",
  ],
  [
    "The Agentic Stack",
    "The agentic commerce stack is being assembled in the open. There is a payments layer, an identity layer, and an interoperability layer, each engineering the path where everything goes right. Almost none of them ship dispute resolution. GenLayer exists to fill that gap, acting as the adjudication layer beneath the agents that transact on our behalf.",
  ],
  [
    "Condorcet's Jury Theorem",
    "The intuition behind Optimistic Democracy is older than blockchains. Condorcet's jury theorem holds that if each juror is more likely than not to be correct, and they vote independently, then the probability that the majority is correct climbs toward certainty as the jury grows. Independence is doing the heavy lifting, which is why model diversity matters so much.",
  ],
  [
    "Writing a Contract",
    "An intelligent contract is a Python class that extends the contract base type. State variables carry type annotations, read-only methods are marked as public views, and state-changing methods are marked as public writes. Inside a write method you may call out to a model or to the web, provided you wrap that call in an equivalence principle the validators can evaluate.",
  ],
  [
    "Elastic Network",
    "The GenLayer chain launched on ZKsync's Elastic Network, which pairs the AI-driven consensus layer with zero-knowledge scaling. The combination keeps validator coordination affordable while the judgment work stays verifiable, and it lets the protocol inherit the security and tooling of an established ecosystem rather than rebuilding all of it alone.",
  ],
  [
    "Beyond Oracles",
    "An oracle is a promise that some outside party will report the truth. It works until the reporter is bribed, goes offline, or simply disagrees with another reporter. GenLayer removes the intermediary entirely: contracts read unstructured data and live web inputs themselves, and the network judges the reading rather than trusting the reader.",
  ],
  [
    "Delegated Proof of Stake",
    "Block production runs on delegated proof of stake, a well-understood mechanism where token holders delegate their weight to validators who produce blocks efficiently. Layered on top of that ordinary machinery sits the neural consensus path, which handles the subset of transactions that require reasoning rather than arithmetic.",
  ],
  [
    "Deterministic and Not",
    "Every transaction takes one of two routes. Deterministic transactions behave exactly as they would on any other chain: same input, same output, verified by recomputation. Non-deterministic transactions take the reasoning path, where the leader's proposal is judged against the contract's stated equivalence rules by an independent jury.",
  ],
  [
    "Real-World Disputes",
    "Consider a freelance contract that says the work must be delivered in a professional tone before payment is released. No arithmetic can settle that. A jury of models can read the delivered work, weigh it against the wording of the agreement, and reach a defensible conclusion — one that is recorded, appealable, and open to inspection by anyone.",
  ],
  [
    "A Synthetic Jurisdiction",
    "What emerges is closer to a jurisdiction than to a database. It has rules, a way of applying them to specific facts, an appeals process, and penalties for bad-faith participation. What it lacks is a border, a filing fee, and a queue, which is precisely why it can serve counterparties who would otherwise never do business.",
  ],
  [
    "Prompt as Clause",
    "Inside an intelligent contract, a prompt is not a convenience — it is a clause with legal weight. Writing it carelessly is the same mistake as writing a vague term into a paper agreement. The discipline of contract drafting therefore returns to software engineering, and precision in language becomes a security concern.",
  ],
  [
    "The Finality Trade",
    "There is always a trade between speed and certainty. Waiting for every validator to agree before anything moves is safe and unusable. Optimistic Democracy takes the other path: act quickly on the expected result, then leave a window in which anyone may object. Most of the time nothing happens, and that is the point.",
  ],
  [
    "Building on Testnet",
    "Developers usually start in a hosted studio, where a contract can be deployed and called without running any infrastructure. From there the same contract moves to testnet with real validators and real latency. Only the surrounding assumptions change; the contract code and the equivalence principles you wrote stay exactly as they are.",
  ],
  [
    "Why Judgment Scales",
    "Computation scaled because we found a way to verify it cheaply. Judgment has resisted that for centuries because verifying a judgment traditionally meant convening another court. If a network can convene a jury in seconds and charge cents for it, then judgment becomes something you can call from a function, and that changes what software can promise.",
  ],
];

const HARD: Array<[string, string]> = [
  [
    "WizardOfCoin",
    'from genlayer import *\n\nclass WizardOfCoin(gl.Contract):\n    has_coin: bool\n\n    def __init__(self):\n        self.has_coin = True\n\n    @gl.public.write\n    def ask_for_coin(self, request: str) -> None:\n        if not self.has_coin:\n            raise gl.vm.UserError("I don\'t have a coin!")',
  ],
  [
    "Leader Function",
    'def leader_fn() -> str:\n    return gl.nondet.exec_prompt(prompt, response_format="json")\n\nresult = gl.eq_principle.prompt_comparative(\n    leader_fn,\n    criteria="Both answers must agree on give_coin",\n)\nself.has_coin = not json.loads(result)["give_coin"]',
  ],
  [
    "Contract Skeleton",
    'class MyContract(gl.Contract):\n    variable: str\n    counter: u256\n\n    def __init__(self):\n        self.variable = "initial value"\n        self.counter = u256(0)\n\n    @gl.public.view\n    def read_method(self) -> str:\n        return self.variable\n\n    @gl.public.write\n    def write_method(self, new_value: str) -> None:\n        self.variable = new_value',
  ],
  [
    "Runner Dependency",
    '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }\nfrom genlayer import *\nimport json\n\nRUNNER_VERSION = "py-genlayer:1jb45aa8"\nMAX_APPEAL_ROUNDS: int = 2 * n + 1',
  ],
  [
    "Web Render",
    'def fetch_price(url: str) -> float:\n    page = gl.nondet.web.render(url, mode="text")\n    quoted = gl.nondet.exec_prompt(\n        f"Extract the USD price from:\\n{page}",\n        response_format="json",\n    )\n    return float(json.loads(quoted)["price"])',
  ],
  [
    "Storage Types",
    "balances: TreeMap[Address, u256]\nvoters: DynArray[Address]\nmetadata: TreeMap[str, str]\nowner: Address\ndeadline: u64\n\n@gl.public.write.payable\ndef deposit(self) -> None:\n    self.balances[gl.message.sender_address] += gl.message.value",
  ],
  [
    "Equivalence Criteria",
    'CRITERIA = """\n1. Both outputs MUST classify the review as {genuine|suspicious}.\n2. Confidence scores may differ by <= 0.15.\n3. Any cited evidence must reference the same sentence index.\n"""\nverdict = gl.eq_principle.prompt_non_comparative(\n    leader_fn, task=CRITERIA, criteria=CRITERIA\n)',
  ],
  [
    "CLI Session",
    "$ npm install -g genlayer\n$ genlayer init --setup\n$ genlayer deploy --contract ./contracts/escrow.py --rpc https://studio.genlayer.com/api\n$ genlayer call 0x9A3f...c07E resolve_dispute --args '{\"case_id\": 42}'\n> status: ACCEPTED  |  validators: 5/5  |  gas: 1_842_300",
  ],
  [
    "Consensus Log",
    "[leader]   proposing tx 0x7fE2a19c... round=1 model=<undisclosed>\n[validator-2] recompute -> EQUIVALENT (delta=0.04)\n[validator-3] recompute -> EQUIVALENT (delta=0.11)\n[validator-4] recompute -> DIVERGENT  (delta=0.62)\n[consensus] majority=3/4 -> ACCEPTED; finality_window=300s",
  ],
  [
    "Appeal Math",
    "Given n validators and a per-validator accuracy p > 0.5, the probability\nthat a majority is correct is sum(C(n, k) * p**k * (1 - p)**(n - k))\nfor k in range((n // 2) + 1, n + 1). As n -> infinity this tends to 1.\nAppeals expand the jury from n to 2*n + 1, so P(correct) increases monotonically.",
  ],
  [
    "Type Annotations",
    "from genlayer import *\nfrom typing import Any\n\n@allow_storage\n@dataclass\nclass Claim:\n    claimant: Address\n    amount: u256\n    evidence_uri: str\n    resolved: bool = False\n\nclaims: DynArray[Claim]",
  ],
  [
    "Error Handling",
    'try:\n    outcome = gl.eq_principle.prompt_comparative(leader_fn, criteria=RULE)\nexcept gl.vm.UserError as exc:\n    gl.advanced.emit_event("ResolutionFailed", {"reason": str(exc)})\n    raise\nfinally:\n    self.attempts = u32(self.attempts + 1)',
  ],
  [
    "Test Harness",
    'from genlayer_test import *\n\ndef test_wizard_keeps_coin(setup_validators):\n    setup_validators(n=5, threshold=0.6)\n    contract = deploy(WizardOfCoin)\n    contract.ask_for_coin("please, I am poor").transact()\n    assert contract.has_coin.view() is True',
  ],
  [
    "Network Constants",
    'CHAIN_ID = 4221\nRPC_URL = "https://genlayer-testnet.rpc.caldera.xyz/http"\nFINALITY_WINDOW_SECONDS = 300\nDEFAULT_VALIDATOR_COUNT = 5\nAPPEAL_BOND_GEN = 25.0\nMAX_PROMPT_BYTES = 16_384  # 16 KiB',
  ],
  [
    "Address Book",
    "0x9A3fE1b0c4D27a8E5f61B90cA7dE3f4821bC07E9  # escrow\n0x4C81dA6f0937Bb2e5Ac1f8D30e9B7a62C5f01D34  # oracle-free feed\n0xE07b3C92aF14d658E0B2c7A19fD46035b8Ce27A1  # dispute registry\nassert len(set(ADDRESSES)) == 3, \"duplicate deployment!\"",
  ],
  [
    "Validator Config",
    'validator:\n  stake: "50_000 GEN"\n  llm_providers: ["provider-a", "provider-b"]\n  max_concurrent_txs: 8\n  heartbeat_interval_ms: 2_500\n  region: "eu-central-1"\n  telemetry: { enabled: true, level: "warn" }',
  ],
];

function build(): Passage[] {
  const rows: Array<[Difficulty, Array<[string, string]>]> = [
    ["easy", EASY],
    ["medium", MEDIUM],
    ["hard", HARD],
  ];
  const out: Passage[] = [];
  for (const [difficulty, list] of rows) {
    list.forEach(([title, text], i) => {
      out.push({
        id: `${difficulty}-${String(i + 1).padStart(2, "0")}`,
        difficulty,
        title,
        text: text.replace(/\r\n/g, "\n"),
      });
    });
  }
  return out;
}

export const PASSAGES: Passage[] = build();

const BY_ID = new Map(PASSAGES.map((p) => [p.id, p]));

export function getPassage(id: string): Passage | undefined {
  return BY_ID.get(id);
}

export function passagesFor(difficulty: Difficulty): Passage[] {
  return PASSAGES.filter((p) => p.difficulty === difficulty);
}

export function randomPassage(difficulty: Difficulty, excludeId?: string): Passage {
  const pool = passagesFor(difficulty);
  const candidates = pool.length > 1 && excludeId ? pool.filter((p) => p.id !== excludeId) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Words are whitespace-delimited; the standard WPM formula uses 5 chars = 1 word. */
export function passageStats(text: string) {
  return {
    chars: text.length,
    words: text.trim().split(/\s+/).length,
    normalizedWords: text.length / 5,
  };
}
