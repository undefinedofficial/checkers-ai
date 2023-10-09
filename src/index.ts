import type { Checkers, Color, Move } from "checkers-ts";

interface BestMove {
  move: Move;
  terminal: boolean;
  children: BestMove | null;
  score: number;
  activePlayer: Color;
  depth: number;
  isRequired: boolean;
}
function sortByScore(a: BestMove, b: BestMove) {
  if (a.terminal && !b.terminal) return -1;
  if (!a.terminal && b.terminal) return 1;

  if (a.isRequired && !b.isRequired) return -1;
  if (!a.isRequired && b.isRequired) return 1;

  const scoreA = a.score + (a.children ? a.children.score : 0);
  const scoreB = b.score + (b.children ? b.children.score : 0);

  if (scoreA > scoreB) return -1;
  if (scoreA < scoreB) return 1;
  return 0;
}

export class CheckersAI {
  count!: number;
  activePlayer!: Color;
  aiDepthCutoff!: number;

  async ai(checkers: Checkers, depth: number) {
    this.aiDepthCutoff = depth;
    //prep a branching future prediction
    this.activePlayer = checkers.turn();
    this.count = 0;
    console.time("decisionTree");
    const decisionTree = await this.aiBranch(checkers.clone(), depth);

    console.log(decisionTree);

    const result: BestMove[] = [];

    /**
     * Add required moves, double moves, and moves
     */
    let child: BestMove | null = decisionTree[0];
    while (child) {
      result.push(child);
      child = child.children;
      if (!child || child.activePlayer !== this.activePlayer || !child.isRequired) break;
    }

    console.timeEnd("decisionTree");
    console.log(this.count);

    return result;
  }
  aiBranch(checkers: Checkers, depth: number) {
    return new Promise<BestMove[]>(async (resolve, reject) => {
      this.count++;
      const output: BestMove[] = [];
      const moves = checkers.moves();

      let bestScore = 0;

      for (const move of moves) {
        let score = 0;

        const newBranch = checkers.clone();
        const turn = newBranch.turn();
        const runMove = newBranch.move(move.from, move.to);
        if (!runMove) {
          console.log("invalid move", move);
          continue;
        }
        const isKing = runMove.piece === "q" || runMove.piece === "Q";
        const isGameOver = newBranch.isGameOver();
        let isDoublemove = false;

        if (runMove.flag[0] === "r") {
          const delta = isKing ? 1 : 2;
          score += this.activePlayer === turn ? delta : -delta;
        }
        if (runMove.flag[0] === "j") {
          const delta = isKing ? 20 : 10;
          score += this.activePlayer === turn ? delta : -delta;
          isDoublemove = newBranch.turn() !== this.activePlayer;
        }
        if (runMove.flag[1] === "p") {
          const delta = isKing ? 60 : 50;
          score += this.activePlayer === turn ? delta : -delta;
        }
        if (isGameOver) {
          score += this.activePlayer === turn ? 1000 : -1000;
        }
        score -= depth;

        let children: BestMove | null = null;
        if (!isGameOver && depth > 0) {
          children = (await this.aiBranch(newBranch, depth - 1)).sort(sortByScore)[0];
        }
        if (this.activePlayer === turn && bestScore < score) {
          bestScore = score + (children ? children.score : 0);
        }

        output.push({
          move: runMove,
          terminal: isGameOver,
          children,
          score,
          activePlayer: turn,
          depth,
          isRequired: isDoublemove,
        });
      }

      const sorted = output.sort(sortByScore);
      resolve(sorted);
    });
  }
}
