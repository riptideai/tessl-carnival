# Ring Toss

Land rings on the bottle necks before you run out.

## How to play

- Move the mouse to aim, and click to throw a ring. The red circle shows where
  the ring will land.
- The throw sways slowly from side to side, so time your click as well as your aim.
- You throw one ring at a time: wait for it to land before throwing the next.
- You have 8 rings. The round ends when the last ring has landed.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands within 14 px of a bottle's neck. Bottles further
back score more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

A ring that misses every neck scores nothing. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `throwRing`, `step`, `bottleAt`,
  `swayOffset`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
