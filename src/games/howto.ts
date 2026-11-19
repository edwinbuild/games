// How-to-play paragraphs for each game, written into each game page's static HTML by scripts/pages.ts.
// Kept out of the registry so they are not in the JavaScript every page loads; the side panel reads
// them back from the page. Keep this file free of imports (scripts/pages.ts reads it in plain Node).
export const HOW_TO: Record<string, string[]> = {
  'blind-timer': [
    'Each day has one target time, the same for everyone, such as 7.30 seconds. Press Start, count in your head, and press Stop when you think the time is up. The clock hides after the first second.',
    'Try as many times as you like. Your closest try is your result for the day, and the share says how many tries it took.',
  ],
  'reaction-chain': [
    'Tap the panel to start a round. Wait while it is red, then tap as soon as it turns green. A tap while it is still red, or faster than 100 ms after it turns green, counts as 500 ms.',
    'After five rounds you get your average reaction time in milliseconds, and your fastest clean round. A run needs at least three taps after green to count as a result.',
  ],
  'odd-one-out': [
    'Each grid hides exactly one emoji that is different. Tap it to go to the next level, where the grid gets bigger and the difference gets smaller.',
    'You have 60 seconds in total, starting from your first tap. A wrong tap takes 3 seconds off. Your score is the number of levels you clear.',
  ],
  'memory-path': [
    'Squares on a 4×4 grid light up one at a time. When they stop, tap the same squares in the same order. Each round adds one step, and after eight steps the squares light up faster.',
    'One wrong tap ends the game. Your score is the longest path you repeated. Turn sound on to hear a note for each square.',
  ],
  'pitch-match': [
    'Press Listen to hear the target tone. Move the slider, play your tone, and press Lock in when they sound the same. Sound on is best; with it off, watch the wave instead: it shows the target while it plays, then your tone, and the higher the tone, the more tightly packed the waves.',
    'There are three tones a day, the same for everyone. Being one semitone off (one piano key) scores 50%; matching exactly scores 100%. Try as many times as you like; your best try counts and the share says how many it took.',
  ],
  'tap-duel': [
    'Two players. On one phone, each takes a half of the screen; online, each plays on their own phone (make a room and send the link). Wait for the signal, then tap as fast as you can: the first tap after it wins the round.',
    'Tap before the signal and the round goes to the other player. Taps within 10 milliseconds of each other are a tie and the round is played again. First to three wins the duel.',
  ],
  'color-recall': [
    'A colour fills the screen for two seconds, then hides. Rebuild it with the hue, saturation and lightness sliders and press Lock in. After each colour you see yours next to the real one.',
    'There are three colours a day, the same for everyone. Each match is scored by how different the two colours look to the human eye (the CIEDE2000 measure), and your day’s result is the average. Try as many times as you like; your best try counts. Each try gets its own three colours, the same for everyone.',
  ],
  'count-flash': [
    'Each field of dots shows for 0.8 seconds, which is too short to count. Type your estimate and lock it in; the field comes back with the real number.',
    'There are five fields a day, from about a dozen dots to three hundred, the same for everyone. Your result is your average error: how far your guesses were from the real counts, as a percentage (guessing 30 for 20 dots is 50% off). Try as many times as you like; your best try counts. Each try of the day gets its own five fields (the same for everyone), so the counts you see after one try never help the next.',
  ],
  'tug-of-taps': [
    'Put the phone between you; each player gets one half of the screen. After a 3-2-1 countdown, tap your half with two thumbs, left side then right side, as fast as you can. Every alternating tap pulls the rope one step toward you; tapping the same side twice does nothing.',
    'The first player to pull the rope 20 steps to their side wins. Taps before Go don’t count, and both players can tap at the same time. On a computer, one player alternates A and S, the other K and L.',
  ],
  'angle-eye': [
    'Each round asks for one thing by eye: make an angle of a given size, mark the exact middle of a line, extend a line to twice its length, or mark the centre of a circle. Drag the handle (or use the arrow keys) and lock in.',
    'After each round the true answer appears in green with how far off you were. Each round scores up to 10, for a total out of 100. Send the link to a friend and they get the exact same ten rounds.',
  ],
  'reaction-online': [
    'Create a room and send the link (or the five-letter code) to a friend. When you are both in, press Ready; the host starts the duel. Each round both screens say Wait, then turn green; tap as fast as you can.',
    'Each phone times its own reaction from the moment it turned green, so a slow connection never decides a round. Tapping before green loses the round. First to three rounds wins; Rematch keeps you in the same room.',
  ],
  'flip-grid': [
    'Each day has one 5×5 puzzle, the same for everyone. Tapping a tile flips it and the tiles directly above, below and beside it, from lit to off or back. Turn every tile off to solve it.',
    'Par is the fewest moves that can solve the day\'s grid. Undo as often as you like; only a solved grid counts. Try as many times as you like; your fewest moves is your result. On a computer, use the arrow keys and Space, and Z to undo.',
  ],
  'spot-race': [
    'Create a room and send the link (or the five-letter code). Two to eight players can join. When everyone is ready, the host starts the race and every phone gets the same sequence of grids.',
    'Tap the one emoji that is different to go to the next level; a wrong tap costs 3 seconds. Everyone sees each other’s level live. After 60 seconds the most levels wins; on a tie, whoever got there first. A player who leaves keeps their last level.',
  ],
  'stack-tower': [
    'A block slides back and forth above the tower. Tap (or press Space) to drop it. Whatever hangs over the block below is cut off, so the next block is narrower. Drop it almost exactly on top and it keeps its full width.',
    'Every five blocks the slide gets faster. Miss the tower completely and the try is over. Everyone gets the same tower each day, with the same starting width and speeds. Try as many times as you like; your tallest tower counts.',
  ],
  'pour-line': [
    'Press and hold anywhere on the glass to pour from the tap; let go to stop. The stream already in the air still lands after you let go, so stop a moment early. Pour past the rim and the try is spilled.',
    'Every day has one glass, the same for everyone: its shape, the height of the line and how fast the tap runs. Narrow parts of a glass fill faster. Your score is how far the settled drink is from the line, as a share of the glass height. Try as many times as you like; your closest pour counts. On a computer, hold Space.',
  ],
  'chain-pop': [
    'Tap one bubble. It pops and sends out a ring; any bubble the ring reaches pops too and sends out its own ring. Big bubbles send bigger rings. Then sit back and watch the chain run.',
    'Every day has one board of 60 bubbles, the same for everyone. Your score is how many popped from your one tap. Try as many times as you like; your longest chain counts. On a computer, choose a bubble with the arrow keys and press Space.',
  ],
  'fair-slice': [
    'Each shape gets one straight cut: swipe across it and it splits in two, showing each half’s share of the area. Aim for 50% / 50%. A swipe that misses the shape doesn’t count; if a cut leaves three or more pieces, every piece on one side of the line counts as that side.',
    'There are five shapes a day, the same for everyone, getting harder from a square to a wobbly blob. Your score is how far your cuts were from a fair half, on average. Try as many times as you like; your best try counts. On a computer, turn and move the cut with the arrow keys (hold Shift for fine steps) and press Space.',
  ],
  'tidy-up': [
    'The organiser has an outline for each thing in the mess below. Drag a thing onto its outline and it clicks into place, as long as it is the right way round: tap a thing to turn it a quarter turn. Coins and buttons fit any way round.',
    'The clock starts at your first touch. Dropping a thing into someone else’s outline sends it back and adds 2 seconds. Send the link to a friend and they tidy the exact same mess. On a computer, Tab to a thing, move it with the arrow keys, turn it with R and drop it with Enter.',
  ],
  'domino-drop': [
    'A winding line of dominoes has five gaps where the run would stop. Tap to place a spare domino; it lines up with its neighbours, you can drag it to adjust and tap it again to turn it. Then press Push. A domino tips the next only if it is close enough and roughly in the way it falls; blocks stop the run.',
    'Every day has one board, the same for everyone. Your score is how many of the 40 dominoes fall. Try as many times as you like; your best run counts. On a computer, move a cursor with the arrow keys, press Enter to place or turn a spare, and Space to push.',
  ],
  'odd-pick': [
    'Every day has one question with five options, the same for everyone, like “Pick a fruit” or “Pick a number”. Choose the one you think the fewest people will pick, and lock it in. One pick a day.',
    'The split is hidden until the day is over, so nobody can copy the crowd. Come back tomorrow to see how everyone picked and how rare your pick was. Only the number of picks for each option is stored; nothing about you.',
  ],
  'guess-the-crowd': [
    'Every day has one number question, the same for everyone, like “How many hours did you sleep last night?”. Slide to your own answer, then guess the average answer of everyone who plays today. One answer a day.',
    'You then see how everyone answered so far, with your answer, your guess and the real average marked. Your score is how far your guess was from the average, as a share of the range; within 3% is a great read of the crowd. Until 20 people have answered you get a provisional score from the answers so far; the final one comes later. Then there is a bonus This or That: pick a side of a two-way question and guess how everyone else split. Only the answers are stored, never who gave them.',
  ],
  'beat-keeper': [
    'Press Start and tap along with eight beats: you hear them (with sound on) and see the circle pulse. Then the beat goes silent and the circle fades. Keep tapping in time for eight more beats, on the screen or with Space.',
    'Your score is how far your silent taps were from the real beats, on average, in milliseconds; a missed beat counts as half a beat out, and so does every extra tap. The reveal shows each tap against its beat and whether you drifted fast or slow. Everyone gets the same tempo each day. Try as many times as you like; your best counts.',
  ],
  'pipe-turn': [
    'Water comes from the tap on the left. Tap a pipe to turn it a quarter turn; water flows through every pipe that connects back to the tap, so you can see how far it gets. Connect it all the way to the plant on the right.',
    'Every day has one 6×6 board, the same for everyone. Par is the number of turns the puzzle was made with; beat it if you can. Try as many times as you like; your fewest turns counts. On a computer, move with the arrow keys and turn with Space.',
  ],
  'light-path': [
    'The laser on the left fires a beam to the right. Tap a square to place a mirror, tap it again to flip it the other way, and a third time to take it away. The beam bounces off mirrors, passes through targets and stops at walls. Light every target.',
    'You have three mirrors at most. Every day has one board, the same for everyone; par is the fewest mirrors it can be solved with, and fewer moves breaks ties. Try as many times as you like; your best try counts. On a computer, move with the arrow keys and press Space to place or flip a mirror.',
  ],
  'pendulum-stop': [
    'Tap to start the pendulum swinging, then tap again to stop it. If the bob stops inside the coloured zone, the next round starts: a little faster, with a smaller zone somewhere else. One miss ends the run.',
    'Your score is how many rounds you cleared in a row. Send the link to a friend and they get exactly the same swings and zones. Tap, click or press Space.',
  ],
  'steady-line': [
    'Put your finger (or the mouse) on Start and trace the channel all the way to the flag. Touch an edge or lift your finger and the try ends. The channel gets narrower as it goes.',
    'Every day has one path, the same for everyone. Your score is how far you got; if you make it all the way, your time counts instead, and faster is better. Try as many times as you like; your best try counts.',
  ],
  'shape-recall': [
    'Each shape (a zigzag, a curve, a loop) shows for two seconds, then hides. Draw it from memory in one stroke with your finger or the mouse. Your drawing is laid over the real shape, with how closely they match.',
    'Size, position and the direction you draw in don’t matter, only the shape. There are three shapes a day, the same for everyone, and your result is the average match. Try as many times as you like; your best try counts. This game needs a touch screen, mouse or pen. Each try gets its own three shapes, the same for everyone.',
  ],
  'paint-mix': [
    'Five colours a day, easiest first: a tint, two paints, two paints with white, a dark shade, and a soft mix of all three. Tap a pot to add a drop of red, yellow, blue, white or black and watch it swirl in. Paint mixes like real paint: yellow and blue make green, white lightens, black darkens.',
    'Paint can’t come back out, and you share one tube of paint across all five colours, so plan before you pour: to fix too much yellow you have to add more of everything else. Your score for each colour shows only after you lock it in, judged by how different the colours look to the human eye; matching the exact mix earns a star. Every colour can be matched exactly. Each try gets five new colours and your best day counts. On a keyboard, 1 to 5 add paint.',
  ],
  'orbit-drop': [
    'The ball circles a planet. Tap anywhere on the space (or press Space) to let go: it flies straight off in the direction it is moving at that moment. If its path crosses the next planet’s dashed ring, it is caught and starts circling that planet instead.',
    'Each planet is a little further away, spins a little faster and has a slightly smaller ring to catch. One miss and the ball drifts off into space; your score is how many planets you reached. Every run is new; a challenge link gives your friends the same run.',
  ],
  'balance-beam': [
    'A seesaw sits on its pivot with dark weights fixed to it, so it tips. Choose a weight from the tray (1 to 5, two of each) and tap a free peg to put it there; tap it again to take it off. The beam tips and wobbles as you go.',
    'Each weight turns a beam by its size times its distance from the middle, so a 2 four pegs out balances a 4 two pegs out. From Thursday to Sunday a second beam hangs from the first: it has to sit level too, and everything on it pulls on the top beam where it hangs. Level it all with as few of your weights as you can; par is the fewest possible. One puzzle a day, the same for everyone; your best try counts. On a keyboard, the arrows choose a peg and 1 to 5 place a weight.',
  ],
  'higher-lower': [
    'Create a room and send the link (or the five-letter code); two to eight players can join. When everyone is ready, the host starts the quiz. Each question shows one country’s population or land area; say whether a second country’s number is higher or lower. You have ten seconds.',
    'The fastest right answer gets 3 points, the next 2, and every other right answer 1. Each phone times its own answer, so a slow connection doesn’t cost you. Ten questions, then the final scores. The numbers are the World Bank’s: population for 2023 and land area for 2022.',
  ],
  'quick-draw': [
    'Create a room and send the link (or the five-letter code); two to eight players can join. Everyone takes one turn to draw. The drawer sees a word and has 45 seconds to draw it; everyone else sees the drawing appear live and types guesses.',
    'The first right guess scores 2 points, and the drawer gets 1 for a drawing someone guessed. Plurals and capitals don’t matter, and a guess one letter off shows “close!” only to you. Guesses are shown only to your room and are filtered for rude words.',
  ],
}
