// Common four-letter English words for Word Ladder: every step must be one of these, and each
// day's start and end words and its par come from them. Hand-picked: everyday words only, no
// names, no rude words (and src/shell/filter.ts checks that too).
export const WORDS = `
able ache acid acre acts aged aide aids aims airs airy ally also alto amid ants apes arch area arms army arts aunt auto avid away axes axis
baby back bags bait bake bald ball band bang bank bans bare bark barn bars base bash bass bath bats bays bead beak beam bean bear beat beds
beef been beep beer bees beet bell belt bend bent best bets bias bids bike bill bind bird bite bits blew blot blow blue blur boar boat body boil
bold bolt bomb bond bone book boom boot bore born boss both bout bowl bows boys brag bran brew brim brow buck buds bugs bulb bulk bull bump
bums bunk buns burn bush bust busy buys buzz cabs cafe cage cake calf call calm came camp cane cans cape caps card care carp cars cart case cash
cast cats cave cell cent chap chat chef chew chin chip chop cite city clad clam clan clap claw clay clip clog club clue coal coat code coil coin
cold colt comb come cone cook cool cope copy cord core cork corn cost cosy cots coup cove cows crab crew crib crop crow cube cubs cued cues cuff
cult cups curb cure curl cute cuts dame damp dare dark darn dart dash data date dawn days dead deaf deal dean dear debt deck deed deep deer
dent desk dial dice died dies diet digs dime dine dips dirt disc dish disk dive dock does dogs doll dome done door dose dots dove down doze
drag draw drew drip drop drum dual duck duel dues dull duly dumb dump dune dusk dust duty each earl earn ears ease east easy eats echo edge
edit eels eggs else emit ends envy epic even ever evil exam exit eyes face fact fade fail fair fake fall fame fans fare farm fast fate fear
feat feed feel fees feet fell felt fern fest fife figs file fill film find fine fins fire firm fish fist fits five flag flap flat flaw fled
flee flew flip flit flog flow foam foes fold folk fond font food fool foot ford fore fork form fort foul four fowl free frog from fuel full
fume fund fuse fuss gain gait gala gale game gang gaps gate gave gaze gear gems gift gild gill girl gist give glad glee glen glow glue gnat
goal goat goes gold golf gone good gown grab gram gray grew grey grid grim grin grip grit grow grub gulf gull gums gust guts hail hair half
hall halo halt hand hang hard hare harm harp hate haul have hawk haze hazy head heal heap hear heat heed heel held helm help herb herd here
hero hers hide high hike hill hint hips hire hits hive hold hole holy home hood hoof hook hoop hope horn hose host hour howl hubs huge hull
hump hung hunt hurt hush huts hymn icon idea idle inch info into iron isle item jabs jail jams jars jaws jazz jeep jest jets jobs jogs join
joke jolt jots joys judo jugs jump june junk jury just keen keep kelp kept keys kick kids kill kind king kiss kite kits knee knew knit knob
knot know labs lace lack lads lady laid lake lamb lame lamp land lane laps lard lark last late lawn laws lazy lead leaf leak lean leap left
legs lend lens lent less lick lids lied lies life lift like lily limb lime limp line link lint lion lips list live load loaf loan lock loft
logo logs lone long look loom loop lord lose loss lost lots loud love luck lump lung lure lush mace made maid mail main make male mall malt
mane many maps mare mark mars mash mask mass mast mate math maze meal mean meat meek meet melt memo mend menu mesh mess mice mild mile milk
mill mime mind mine mint miss mist mitt moan moat mock mode mold mole monk mood moon moor mops more moss most moth move much mule muse must
mute nail name nape near neat neck need nest nets news next nice nine node none nook noon norm nose note noun nuts oaks oars oath oats obey
odds odor ohms oils oily okay omen omit once ones only onto ooze open oral orbs oven over owed owes owls owns pace pack pact page paid pail
pain pair pale palm pals pane pans pant pare park part pass past pate path pave paws pays peak peal pear peas peat peck peek peel peep pegs
pens perk pest pets pick pier pies pigs pile pill pine pink pins pint pipe pits pity plan play plea plot plow ploy plug plum plus pods poem
poet pole poll polo pond pony pool poor pops pore pork port pose post pots pour pray prey prim prod prop puck pull pulp pump punk pups pure
push puts quay quit quiz race rack raft rage rags raid rail rain rake ramp rang rank rare rash rate rats rave rays read real ream reap rear
reed reef reel rely rent rest rice rich ride rift rims ring rink riot ripe rise risk road roam roar robe rock rode role roll roof room root
rope rose rosy rows rubs ruby rude rugs ruin rule rung runs rust sack safe saga sage said sail sake sale salt same sand sane sang sank save
says scan scar seal seam seat seed seek seem seen seep self sell send sent sets shed shin ship shoe shop shot show shut sick side sift sigh
sign silk sing sink sips site size skid skin skip skit slab slam slap sled slid slim slip slit slot slow slug snap snow soak soap soar sock
soda sofa soft soil sold sole some song soon sore sort soul soup sour spin spit spot spur stab stag star stay stem step stew stir stop stub
such suit sums sung sunk suns sure surf swam swan swap sway swim tabs tack tact tags tail take tale talk tall tame tank tape taps tart task
taxi teal team tear teas tech teen tell temp tend tens tent term test text than that thaw them then they thin this thus tick tide tidy tied
tier ties tile till tilt time tint tiny tips tire toad toes toil told toll tomb tone tons took tool tops tore torn toss tour town toys tram
trap tray tree trek trim trio trip trod trot true tube tubs tuck tuna tune turf turn tusk twig twin type undo unit upon urge used user uses
vain vale vane vase vast veil vein vent verb very vest veto vets vial vice view vine visa void vote wade wage wail wait wake walk wall wand
want ward warm warn warp wars wary wash wasp wave wavy ways weak wear webs weed week weep well went were west what when whim whip wick wide
wife wigs wild will wilt wind wine wing wink wins wipe wire wise wish with woke wolf wood wool word wore work worm worn wove wrap wren yard
yarn yawn year yell yelp yoga yoke your zeal zero zest zinc zone zoom
`.trim().split(/\s+/)
