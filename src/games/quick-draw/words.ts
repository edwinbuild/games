// Words to draw: simple things anyone anywhere could draw and guess. Nouns and a few actions,
// nothing scary, rude, religious, political or tied to one country.
export const WORDS = `
apple banana cherry grapes lemon orange pear pineapple strawberry watermelon carrot corn mushroom pepper potato tomato
bread cake cookie cheese egg ice cream pizza sandwich soup noodles rice popcorn donut candy honey milk tea coffee juice
cat dog fish bird horse cow pig sheep goat chicken duck rabbit mouse frog turtle snake lion tiger elephant giraffe zebra
monkey bear panda kangaroo penguin owl eagle parrot whale dolphin shark octopus crab snail bee butterfly spider ant ladybird
dinosaur dragon unicorn camel fox wolf deer hedgehog squirrel bat flamingo peacock seal jellyfish starfish worm
sun moon star cloud rain snow rainbow lightning tornado volcano mountain island beach wave river lake waterfall desert
tree flower leaf cactus palm tree mushroom grass rose sunflower forest garden
house castle tent igloo lighthouse bridge tower windmill church skyscraper school hospital factory barn fence door window
roof chimney stairs ladder garage swimming pool playground
car bus train plane boat ship bicycle motorbike rocket helicopter tractor truck taxi submarine skateboard scooter
hot air balloon parachute anchor wheel traffic light
chair table bed sofa lamp clock mirror bath toilet shower sink fridge oven kettle teapot cup mug plate bowl spoon fork knife
pan bottle jar box bag basket bucket broom candle key lock phone computer keyboard television radio camera headphones
book pencil pen crayon paintbrush scissors ruler glue envelope stamp map globe calendar backpack
hat cap crown glasses scarf glove sock shoe boot dress shirt trousers skirt jacket umbrella ring necklace watch button
ball balloon kite yo-yo puzzle doll teddy bear robot drum guitar piano violin trumpet flute microphone dice card
football basketball tennis golf bowling skipping rope trophy medal whistle tent fishing rod
heart smile tear fire ice bone feather shell rock diamond coin money gift present bell flag map treasure
snowman sandcastle bubble rainbow fireworks party birthday cake candle
toothbrush toothpaste comb soap towel pillow blanket hammer screwdriver saw nail paint brush plug battery light bulb
magnet rocket alien planet comet telescope satellite astronaut robot
nose eye ear mouth hand foot tooth hair beard
swim run jump dance sing sleep cry laugh read write paint cook climb fly fish ski surf juggle
`.split(/\n/).flatMap((line) => line.trim() ? line.trim().split(/ (?=[a-z])/) : [])

/** Multi-word entries were split above; put back the ones that belong together. */
const PHRASES = ['ice cream', 'palm tree', 'swimming pool', 'hot air balloon', 'traffic light', 'teddy bear', 'skipping rope', 'fishing rod', 'light bulb']
export const WORD_LIST: string[] = (() => {
  const joined = WORDS.join(' ')
  let text = ` ${joined} `
  const out: string[] = []
  for (const p of PHRASES) {
    if (text.includes(` ${p} `)) { out.push(p); text = text.replace(` ${p} `, ' ') }
  }
  for (const w of text.trim().split(/\s+/)) if (w) out.push(w)
  return [...new Set(out)]
})()
