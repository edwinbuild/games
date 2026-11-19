import { dayNumber, seededRandom } from '../../shell/daily'

export type Question = { prompt: string; options: string[] }

// Hand-written questions: five options each, global, no country or culture-specific references.
const WRITTEN: [string, string[]][] = [
  ['Pick a number', ['7', '3', '42', '1', '100']],
  ['Pick a number', ['13', '21', '9', '64', '50']],
  ['Pick a number', ['2', '17', '33', '88', '99']],
  ['Pick a number', ['0', '5', '11', '27', '1000']],
  ['Pick a number', ['6', '12', '24', '36', '48']],
  ['Pick a number', ['8', '19', '73', '256', '365']],
  ['Pick a fruit', ['Apple', 'Banana', 'Mango', 'Grapes', 'Kiwi']],
  ['Pick a fruit', ['Orange', 'Pear', 'Cherry', 'Pineapple', 'Lemon']],
  ['Pick a fruit', ['Strawberry', 'Watermelon', 'Peach', 'Plum', 'Coconut']],
  ['Pick an animal', ['Cat', 'Dog', 'Owl', 'Octopus', 'Horse']],
  ['Pick an animal', ['Lion', 'Penguin', 'Frog', 'Elephant', 'Snail']],
  ['Pick an animal', ['Fox', 'Whale', 'Bee', 'Tortoise', 'Parrot']],
  ['Pick an animal', ['Rabbit', 'Shark', 'Bat', 'Giraffe', 'Crab']],
  ['Pick a sea creature', ['Dolphin', 'Jellyfish', 'Seahorse', 'Starfish', 'Squid']],
  ['Pick a bird', ['Eagle', 'Pigeon', 'Flamingo', 'Crow', 'Hummingbird']],
  ['Pick an insect', ['Butterfly', 'Ant', 'Ladybird', 'Dragonfly', 'Grasshopper']],
  ['Pick a day of the week', ['Monday', 'Wednesday', 'Friday', 'Saturday', 'Sunday']],
  ['Pick a month', ['January', 'April', 'July', 'October', 'December']],
  ['Pick a month', ['February', 'March', 'June', 'August', 'November']],
  ['Pick a season', ['Spring', 'Summer', 'Autumn', 'Winter', 'Rainy season']],
  ['Pick a planet', ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']],
  ['Pick a planet', ['Earth', 'Uranus', 'Neptune', 'Mars', 'Venus']],
  ['Pick a shape', ['Circle', 'Square', 'Triangle', 'Star', 'Hexagon']],
  ['Pick a shape', ['Heart', 'Diamond', 'Oval', 'Pentagon', 'Crescent']],
  ['Pick a letter', ['A', 'E', 'K', 'Q', 'Z']],
  ['Pick a letter', ['B', 'M', 'R', 'X', 'J']],
  ['Pick a vowel', ['A', 'E', 'I', 'O', 'U']],
  ['Pick a colour', ['Red', 'Blue', 'Green', 'Yellow', 'Purple']],
  ['Pick a colour', ['Orange', 'Pink', 'Black', 'White', 'Brown']],
  ['Pick a colour', ['Teal', 'Gold', 'Silver', 'Navy', 'Lilac']],
  ['Pick a drink', ['Water', 'Tea', 'Coffee', 'Juice', 'Milk']],
  ['Pick a breakfast', ['Eggs', 'Toast', 'Cereal', 'Fruit', 'Nothing']],
  ['Pick a pizza topping', ['Cheese only', 'Mushroom', 'Pineapple', 'Olives', 'Peppers']],
  ['Pick an ice cream', ['Vanilla', 'Chocolate', 'Strawberry', 'Mint', 'Coffee']],
  ['Pick a sweet', ['Cake', 'Cookie', 'Chocolate', 'Ice cream', 'Fruit']],
  ['Pick a vegetable', ['Carrot', 'Broccoli', 'Potato', 'Spinach', 'Corn']],
  ['Pick a spice', ['Pepper', 'Chilli', 'Cinnamon', 'Garlic', 'Ginger']],
  ['Pick a snack', ['Crisps', 'Nuts', 'Popcorn', 'Chocolate', 'Fruit']],
  ['Pick a cooking style', ['Boiled', 'Fried', 'Grilled', 'Baked', 'Raw']],
  ['Pick an egg', ['Fried', 'Boiled', 'Scrambled', 'Poached', 'No eggs']],
  ['Pick a superpower', ['Flying', 'Invisibility', 'Super strength', 'Teleporting', 'Reading minds']],
  ['Pick a superpower', ['Time travel', 'Talking to animals', 'Never sleeping', 'Breathing underwater', 'Healing']],
  ['Pick a place to live', ['Beach', 'Mountains', 'Big city', 'Countryside', 'Island']],
  ['Pick a holiday', ['Beach', 'City trip', 'Hiking', 'Road trip', 'Stay home']],
  ['Pick a way to travel', ['Train', 'Plane', 'Car', 'Boat', 'Bicycle']],
  ['Pick a weather', ['Sunny', 'Rainy', 'Snowy', 'Windy', 'Foggy']],
  ['Pick a time of day', ['Sunrise', 'Morning', 'Afternoon', 'Sunset', 'Midnight']],
  ['Pick a sound', ['Rain', 'Ocean waves', 'Birdsong', 'Thunder', 'Silence']],
  ['Pick a smell', ['Fresh bread', 'Coffee', 'Rain', 'Flowers', 'Pine trees']],
  ['Pick a texture', ['Soft', 'Smooth', 'Rough', 'Fluffy', 'Squishy']],
  ['Pick an instrument', ['Piano', 'Guitar', 'Drums', 'Violin', 'Flute']],
  ['Pick a music style', ['Pop', 'Rock', 'Classical', 'Jazz', 'Electronic']],
  ['Pick a sport to watch', ['Football', 'Tennis', 'Basketball', 'Swimming', 'Athletics']],
  ['Pick a sport to play', ['Running', 'Swimming', 'Cycling', 'Table tennis', 'Climbing']],
  ['Pick a board game piece', ['Pawn', 'Knight', 'Queen', 'Die', 'Card']],
  ['Pick a playing card', ['Ace', 'King', 'Queen', 'Jack', 'Seven']],
  ['Pick a card suit', ['Hearts', 'Diamonds', 'Clubs', 'Spades', 'Joker']],
  ['Pick a die roll', ['1', '2', '3', '5', '6']],
  ['Pick a chess piece', ['King', 'Queen', 'Rook', 'Bishop', 'Knight']],
  ['Pick a hobby', ['Reading', 'Gaming', 'Cooking', 'Drawing', 'Gardening']],
  ['Pick a hobby', ['Knitting', 'Photography', 'Dancing', 'Puzzles', 'Fishing']],
  ['Pick a pet', ['Cat', 'Dog', 'Fish', 'Bird', 'Hamster']],
  ['Pick a pet name', ['Max', 'Luna', 'Coco', 'Biscuit', 'Captain']],
  ['Pick a flower', ['Rose', 'Sunflower', 'Tulip', 'Daisy', 'Lily']],
  ['Pick a tree', ['Oak', 'Palm', 'Pine', 'Cherry blossom', 'Baobab']],
  ['Pick a gem', ['Diamond', 'Ruby', 'Emerald', 'Sapphire', 'Pearl']],
  ['Pick a metal', ['Gold', 'Silver', 'Copper', 'Iron', 'Titanium']],
  ['Pick an element', ['Fire', 'Water', 'Earth', 'Air', 'Lightning']],
  ['Pick a cloud shape', ['Dragon', 'Sheep', 'Castle', 'Face', 'Just a cloud']],
  ['Pick a sky', ['Clear blue', 'Starry night', 'Stormy', 'Pink sunset', 'Northern lights']],
  ['Pick a landscape', ['Desert', 'Jungle', 'Glacier', 'Volcano', 'Meadow']],
  ['Pick a building', ['Castle', 'Lighthouse', 'Treehouse', 'Skyscraper', 'Cabin']],
  ['Pick a room', ['Kitchen', 'Bedroom', 'Garden', 'Bathroom', 'Living room']],
  ['Pick a piece of furniture', ['Sofa', 'Bed', 'Hammock', 'Armchair', 'Beanbag']],
  ['Pick a shoe', ['Trainers', 'Sandals', 'Boots', 'Slippers', 'Barefoot']],
  ['Pick a hat', ['Cap', 'Beanie', 'Sun hat', 'Top hat', 'No hat']],
  ['Pick a bag', ['Backpack', 'Tote', 'Suitcase', 'Pockets only', 'Bum bag']],
  ['Pick a pen colour', ['Black', 'Blue', 'Red', 'Green', 'Pencil']],
  ['Pick a writing style', ['Typing', 'Handwriting', 'Voice notes', 'Emoji', 'Drawings']],
  ['Pick a phone wallpaper', ['A photo', 'A colour', 'Nature', 'Art', 'Default']],
  ['Pick a way to wake up', ['Alarm', 'Sunlight', 'Pet', 'Music', 'Naturally']],
  ['Pick a sleeping position', ['Back', 'Side', 'Front', 'Curled up', 'Starfish']],
  ['Pick a bedtime', ['Before 10', '10 to 11', '11 to 12', 'After midnight', 'It changes']],
  ['Pick a bread', ['Toast', 'Flatbread', 'Bun', 'Bagel', 'No bread']],
  ['Pick a soup', ['Tomato', 'Chicken', 'Vegetable', 'Mushroom', 'Lentil']],
  ['Pick a noodle', ['Spaghetti', 'Ramen', 'Rice noodles', 'Macaroni', 'Lasagne sheets']],
  ['Pick a rice dish', ['Fried rice', 'Plain rice', 'Rice pudding', 'Risotto', 'Sushi rice']],
  ['Pick a sauce', ['Ketchup', 'Mayonnaise', 'Chilli sauce', 'Soy sauce', 'Mustard']],
  ['Pick a cheese', ['Cheddar', 'Mozzarella', 'Blue cheese', 'Cream cheese', 'No cheese']],
  ['Pick a nut', ['Peanut', 'Almond', 'Cashew', 'Walnut', 'Pistachio']],
  ['Pick a berry', ['Strawberry', 'Blueberry', 'Raspberry', 'Blackberry', 'Cranberry']],
  ['Pick a citrus', ['Orange', 'Lemon', 'Lime', 'Grapefruit', 'Mandarin']],
  ['Pick a kitchen tool', ['Knife', 'Spoon', 'Whisk', 'Frying pan', 'Kettle']],
  ['Pick a tool', ['Hammer', 'Screwdriver', 'Tape', 'Scissors', 'Glue']],
  ['Pick a toy', ['Ball', 'Puzzle', 'Kite', 'Yo-yo', 'Building blocks']],
  ['Pick a party game', ['Charades', 'Cards', 'Quiz', 'Karaoke', 'Hide and seek']],
  ['Pick a playground ride', ['Swing', 'Slide', 'Seesaw', 'Roundabout', 'Climbing frame']],
  ['Pick a fairground ride', ['Ferris wheel', 'Roller coaster', 'Carousel', 'Bumper cars', 'Ghost train']],
  ['Pick a vehicle', ['Rocket', 'Submarine', 'Hot air balloon', 'Train', 'Helicopter']],
  ['Pick a robot job', ['Cook', 'Cleaner', 'Driver', 'Teacher', 'Friend']],
  ['Pick a mythical creature', ['Dragon', 'Unicorn', 'Phoenix', 'Mermaid', 'Griffin']],
  ['Pick a fairy tale item', ['Magic lamp', 'Glass slipper', 'Flying carpet', 'Golden egg', 'Magic mirror']],
  ['Pick a treasure', ['Gold coins', 'A map', 'A crown', 'A key', 'A diary']],
  ['Pick a pirate item', ['Hat', 'Parrot', 'Eye patch', 'Telescope', 'Treasure chest']],
  ['Pick a space thing', ['Moon', 'Sun', 'Comet', 'Black hole', 'Astronaut']],
  ['Pick a time of year', ['New year', 'Midyear', 'Birthday month', 'Holidays', 'Any old Tuesday']],
  ['Pick an emoji face', ['😀', '😂', '😍', '😎', '🤔']],
  ['Pick an emoji', ['🔥', '✨', '🌈', '⚡', '❄️']],
  ['Pick an emoji', ['🍕', '🍔', '🍣', '🌮', '🍜']],
  ['Pick an emoji', ['🐱', '🐶', '🐼', '🦊', '🐸']],
  ['Pick an emoji', ['❤️', '💛', '💚', '💙', '💜']],
  ['Pick an emoji', ['🚀', '🚲', '🚂', '⛵', '🛸']],
  ['Pick a hand', ['Left', 'Right', 'Both', 'Neither', 'Depends']],
  ['Pick a direction', ['North', 'South', 'East', 'West', 'Up']],
  ['Pick a side of the bed', ['Left', 'Right', 'Middle', 'Wall side', 'Door side']],
  ['Pick a seat', ['Window', 'Aisle', 'Front', 'Back', 'Middle']],
  ['Pick a coin side', ['Heads', 'Tails', 'Edge', 'Spin again', 'Keep it']],
  ['Pick a word', ['Yes', 'No', 'Maybe', 'Later', 'Why']],
  ['Pick a greeting', ['Hello', 'Hi', 'Hey', 'Good morning', 'A wave']],
  ['Pick a goodbye', ['Bye', 'See you', 'Take care', 'Later', 'A wave']],
  ['Pick a punctuation mark', ['!', '?', '.', '…', ',']],
  ['Pick a maths sign', ['+', '−', '×', '÷', '=']],
  ['Pick a fraction', ['½', '⅓', '¼', '⅔', '¾']],
  ['Pick a percentage', ['1%', '10%', '50%', '99%', '100%']],
  ['Pick a temperature', ['Freezing', 'Cool', 'Mild', 'Warm', 'Hot']],
  ['Pick a speed', ['Slow', 'Steady', 'Quick', 'Very fast', 'Stopped']],
  ['Pick a size', ['Tiny', 'Small', 'Medium', 'Large', 'Huge']],
  ['Pick an age to be forever', ['8', '18', '25', '40', '70']],
  ['Pick a decade to visit', ['1920s', '1960s', '1980s', '2000s', '2050s']],
  ['Pick a length of holiday', ['A weekend', 'A week', 'Two weeks', 'A month', 'A year']],
  ['Pick a number of pets', ['0', '1', '2', '5', '10']],
  ['Pick a number of hours of sleep', ['5', '6', '7', '8', '10']],
  ['Pick a cup size', ['Tiny', 'Small', 'Regular', 'Large', 'Bucket']],
  ['Pick a pizza slice', ['First', 'Biggest', 'Middle one', 'Last', 'All of them']],
  ['Pick a sandwich filling', ['Cheese', 'Egg', 'Chicken', 'Salad', 'Jam']],
  ['Pick a cake', ['Chocolate', 'Carrot', 'Lemon', 'Cheesecake', 'Fruit']],
  ['Pick a game genre', ['Puzzle', 'Racing', 'Adventure', 'Sports', 'Strategy']],
  ['Pick a film genre', ['Comedy', 'Action', 'Horror', 'Romance', 'Sci-fi']],
  ['Pick a book genre', ['Mystery', 'Fantasy', 'History', 'Romance', 'Comics']],
  ['Pick a school subject', ['Maths', 'Art', 'Science', 'Music', 'Sport']],
  ['Pick a job for a day', ['Astronaut', 'Chef', 'Zookeeper', 'Pilot', 'Artist']],
  ['Pick a job for a day', ['Doctor', 'Detective', 'Farmer', 'Inventor', 'Firefighter']],
]

// Generated questions fill the rest of the year, all different from each other.
const POOLS: [string, string[]][] = [
  ['Pick a number', Array.from({ length: 100 }, (_, i) => String(i + 1))],
  ['Pick a letter', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')],
  ['Pick an emoji', ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🥝', '🍍', '🥑', '🌽', '🥕', '🍄', '🌵', '🌻', '🌙', '⭐', '☀️', '🌊', '🔥', '❄️', '🎈', '🎁', '🎲', '🧩', '🪁', '🎸', '🥁', '🎺', '📚', '✏️', '🔑', '🧲', '💡', '⏰', '🧸', '🪴']],
]

/** All 365 questions in their yearly order (a fixed shuffle), the same for everyone. */
export const YEAR: Question[] = (() => {
  const r = seededRandom('odd-pick:questions:v1')
  const out: Question[] = WRITTEN.map(([prompt, options]) => ({ prompt, options }))
  const seen = new Set(out.map((q) => q.prompt + '|' + [...q.options].sort().join(',')))
  let p = 0
  while (out.length < 365) {
    const [prompt, pool] = POOLS[p++ % POOLS.length]
    const pick = [...pool].sort(() => r() - 0.5).slice(0, 5)
    const key = prompt + '|' + [...pick].sort().join(',')
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ prompt, options: pick })
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
})()

/** The question for a day, and its number (used as the question id in the crowd table). */
export function questionFor(d = new Date()): { id: number; q: Question } {
  const id = (((dayNumber(d) - 1) % 365) + 365) % 365
  return { id, q: YEAR[id] }
}

export const WRITTEN_COUNT = WRITTEN.length

/** Ranks a pick: 1 = rarest. Ties share the better rank. Returns the rank and the pick's share in percent. */
export function rarity(counts: number[], pick: number): { rank: number; share: number; total: number } {
  const total = counts.reduce((a, b) => a + b, 0)
  const rank = 1 + counts.filter((c) => c < counts[pick]).length
  return { rank, share: total ? (counts[pick] / total) * 100 : 0, total }
}
