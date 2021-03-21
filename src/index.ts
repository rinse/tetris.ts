const CELL_FIELD_WIDTH = 10 + 2
const CELL_FIELD_HEIGHT = 20 + 2

interface Position {
    x: number
    y: number
}

function makePos(x: number, y: number): Position {
    return { x: x, y: y }
}

interface MinoDefinition {
    defaultColour: string
    defaultPositions: Position[]
}

type MinoType = 'I' | 'O' | 'S' | 'Z' | 'J' | 'L' | 'T' | 'Wall' | 'Null'

const MinoTypes: { [key in MinoType]: MinoDefinition } = {
    I: {
        defaultColour: 'rgb(0, 255, 255)',
        defaultPositions: [makePos(0, -1), makePos(0, 0), makePos(0, 1), makePos(0, 2)],
    },
    O: {
        defaultColour: 'rgb(255, 255, 0)',
        defaultPositions: [makePos(0, 0), makePos(1, 0), makePos(0, 1), makePos(1, 1)],
    },
    S: {
        defaultColour: 'rgb(0, 255, 0)',
        defaultPositions: [makePos(0, 0), makePos(1, 0), makePos(0, 1), makePos(-1, 1)],
    },
    Z: {
        defaultColour: 'rgb(255, 0, 0)',
        defaultPositions: [makePos(0, 0), makePos(-1, 0), makePos(0, 1), makePos(1, 1)],
    },
    J: {
        defaultColour: 'rgb(0, 0, 255)',
        defaultPositions: [makePos(0, 0), makePos(0, -1), makePos(1, 0), makePos(2, 0)],
    },
    L: {
        defaultColour: 'rgb(255, 128, 0)',
        defaultPositions: [makePos(0, 0), makePos(0, -1), makePos(-1, 0), makePos(-2, 0)],
    },
    T: {
        defaultColour: 'rgb(255, 0, 255)',
        defaultPositions: [makePos(0, 0), makePos(0, -1), makePos(-1, 0), makePos(1, 0)],
    },
    Wall: {
        defaultColour: 'rgb(128, 128, 128)',
        defaultPositions: [
            range(CELL_FIELD_WIDTH).map(x => makePos(x, CELL_FIELD_HEIGHT - 1)),
            range(CELL_FIELD_HEIGHT).map(y => makePos(0, y)),
            range(CELL_FIELD_HEIGHT).map(y => makePos(CELL_FIELD_WIDTH - 1, y)),
        ].flat(),
    },
    Null: {
        defaultColour: 'rgb(255, 255, 255)',
        defaultPositions: [],
    },
}

const MINO_TYPE_NULL: MinoType = 'Null'
const MINO_TYPE_WALL: MinoType = 'Wall'

function getMinoTypes(): MinoType[] {
    return ['I', 'O', 'S', 'Z', 'J', 'L', 'T']
}

type Board = MinoType[][]

function getEmptyBoard(): Board {
    return repeat(CELL_FIELD_HEIGHT, getEmptyRow)
}

function getEmptyRow(): MinoType[] {
    return repeat(CELL_FIELD_WIDTH, () => MINO_TYPE_NULL)
}

function getEmptyRowWithWall(): MinoType[] {
    const row = getEmptyRow()
    row[0] = row[CELL_FIELD_WIDTH - 1] = MINO_TYPE_WALL
    return row
}

interface MinoState {
    mino: Mino
    fieldPosition: Position
}

class TetrisGame {
    private board: Board
    private minoTypes: Generator<MinoType, MinoType, undefined>
    private currentState: MinoState
    private countDeletedLines: number

    constructor() {
        this.board = getEmptyBoard()
        this.minoTypes = repeatShuffledArray(getMinoTypes())
        this.currentState = this.initialState()
        this.countDeletedLines = 0
        this.putMino(makePos(0, 0), makeMino(MINO_TYPE_WALL))
    }

    getScore() {
        return this.countDeletedLines
    }

    fixCurrentMino() {
        this.putMino(this.currentState.fieldPosition, this.currentState.mino)
        this.currentState = this.initialState()
        this.deleteLine()
    }

    private static canPutMino(board: Board, fieldPos: Position, mino: Mino): boolean {
        return mino.positions.every(minoPos => {
            const x = fieldPos.x + minoPos.x
            const y = fieldPos.y + minoPos.y
            return (0 <= x && x < CELL_FIELD_WIDTH)
                && (0 <= y && y < CELL_FIELD_HEIGHT)
                && board[y][x] === MINO_TYPE_NULL
        })
    }

    private putMino(fieldPos: Position, mino: Mino) {
        mino.positions.forEach(minoPos => {
            this.board[fieldPos.y + minoPos.y][fieldPos.x + minoPos.x] = mino.type
        })
    }

    private initialState(): MinoState {
        return {
            mino: makeMino(this.minoTypes.next().value),
            fieldPosition: makePos(CELL_FIELD_WIDTH / 2, 1)
        }
    }

    draw(context: CanvasRenderingContext2D) {
        drawBoard(context, this.board)
        drawMino(context, this.currentState.fieldPosition, this.currentState.mino)
        const ghostMino = getGhostMino(this.currentState.mino)
        const ghostPos = TetrisGame.getGhostPosition(this.board, ghostMino, this.currentState.fieldPosition)
        drawMino(context, ghostPos, ghostMino)
    }

    private static getGhostPosition(board: Board, mino: Mino, position: Position): Position {
        while (TetrisGame.canPutMino(board, incrementY(position), mino)) {
            position = incrementY(position )
        }
        return position
    }

    tryGameOverProcess(): boolean {
        return when(this.isOver(), () => {
            this.board = this.board.map(row => row.map(type => type !== MINO_TYPE_NULL ? MINO_TYPE_WALL : type))
            this.currentState.mino.colour = MinoTypes[MINO_TYPE_WALL].defaultColour
        })
    }

    private isOver(): boolean {
        return !TetrisGame.canPutMino(this.board, this.currentState.fieldPosition, this.currentState.mino)
    }

    private deleteLine() {
        const board = this.board.filter(row => {
            return row.some(t => t === MINO_TYPE_NULL) || row.every(t => t === MINO_TYPE_WALL)
        })
        const countDeletedLines = CELL_FIELD_HEIGHT - board.length
        repeat(countDeletedLines, () => { board.unshift(getEmptyRowWithWall()) })
        this.board = board
        this.countDeletedLines += countDeletedLines
    }

    tryRotateLeft(): boolean {
        return this.tryRotate(this.currentState.mino.positions.map(rotatePosLeft))
    }

    tryRotateRight(): boolean {
        return this.tryRotate(this.currentState.mino.positions.map(rotatePosRight))
    }

    private tryRotate(newPositions: Position[]): boolean {
        const newMino = makeMino(this.currentState.mino.type, newPositions)
        return when(TetrisGame.canPutMino(this.board, this.currentState.fieldPosition, newMino), () => {
            this.currentState.mino.positions = newPositions
        })
    }

    tryMoveLeft() {
        this.tryMove(makePos(this.currentState.fieldPosition.x - 1, this.currentState.fieldPosition.y))
    }

    tryMoveRight() {
        return this.tryMove(makePos(this.currentState.fieldPosition.x + 1, this.currentState.fieldPosition.y))
    }

    tryMoveDown(): boolean {
        return this.tryMove(incrementY(this.currentState.fieldPosition))
    }

    private tryMove(destination: Position): boolean {
        return when(TetrisGame.canPutMino(this.board, destination, this.currentState.mino), () => {
            this.currentState.fieldPosition = destination
        })
    }

    dropHardly() {
        this.currentState.fieldPosition = TetrisGame.getGhostPosition(this.board, this.currentState.mino, this.currentState.fieldPosition)
    }
}

interface Mino {
    type: MinoType
    positions: Position[]
    colour: string
}

function makeMino(
    type: MinoType,
    positions: Position[] = MinoTypes[type].defaultPositions,
    colour: string = MinoTypes[type].defaultColour,
): Mino {
    return {
        type: type,
        positions: positions,
        colour,
    }
}

function getGhostColour(mino: Mino): string {
    const currentColour = mino.colour
    return currentColour.replace('rgb', 'rgba').replace(')', ', 0.25)')
}

function getGhostMino(mino: Mino): Mino {
    const ghostColour = getGhostColour(mino)
    return makeMino(mino.type, mino.positions, ghostColour)
}

function drawBoard(context: CanvasRenderingContext2D, board: Board) {
    board.forEach((row, i) => {
        row.forEach((minoTypeKey, j) => {
            context.fillStyle = MinoTypes[minoTypeKey].defaultColour
            drawCell(context, makePos(j, i))
        })
    })
}

function drawMino(context: CanvasRenderingContext2D, fieldPos: Position, mino: Mino) {
    context.fillStyle = mino.colour
    mino.positions.forEach(minoPos => {
        drawCell(context, makePos(fieldPos.x + minoPos.x, fieldPos.y + minoPos.y))
    })
}

function drawCell(context: CanvasRenderingContext2D, pixelPos: Position) {
    const cellWidth = 24
    const cellHeight = 24
    context.fillRect(pixelPos.x * cellWidth, pixelPos.y * cellHeight, cellWidth, cellHeight)
    context.strokeRect(pixelPos.x * cellWidth, pixelPos.y * cellHeight, cellWidth, cellHeight)
}

// The main function
(function() {
    const canvas: HTMLCanvasElement = document.getElementById('gameboard') as HTMLCanvasElement
    const context: CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D
    context.lineWidth = 1
    context.strokeStyle = 'rgb(32, 32, 32)'
    const scoreBoard = document.getElementById('scoreboard') as HTMLSpanElement
    const game = new TetrisGame()
    document.body.addEventListener('keydown', event => keydownEventListener(game, event))
    let frame = 0
    // The main loop of the game
    const handler = setInterval(() => {
        if (frame % 6 === 0 && !game.tryMoveDown()) {
            game.fixCurrentMino()
        }
        if (game.tryGameOverProcess()) {
            clearInterval(handler)
        }
        scoreBoard.textContent = game.getScore().toString()
        game.draw(context)
        ++frame
    }, 33.33)  // Almost 30 FPS
})()

function keydownEventListener(game: TetrisGame, event: KeyboardEvent) {
    switch (event.key) {
        case 'j':
            game.tryMoveDown()
            break
        case 'k':
            game.tryRotateRight()
            break
        case 'h':
            game.tryMoveLeft()
            break
        case 'l':
            game.tryMoveRight()
            break
        case 'f':
            game.tryRotateLeft()
            break
        case ' ':
            game.dropHardly()
            break
    }
}

function when(condition: boolean, f: () => void): boolean {
    if (condition) {
        f()
    }
    return condition
}

function range(length: number): number[] {
    return Array.from({ length: length }, (_, i) => i)
}

function repeat<A>(n: number, supply: () => A): A[] {
    return Array.from({ length: n }, supply)
}

function* repeatShuffledArray<A>(array: A[]): Generator<A, A, undefined> {
    for (;;) {
        yield* shuffle(array)
    }
}

function shuffle<A>(array: Iterable<A>): A[] {
    return [...array].sort(() => Math.random() - 0.5)
}

function rotatePosLeft(pos: Position): Position {
    return makePos(pos.y, -pos.x)
}

function rotatePosRight(pos: Position): Position {
    return makePos(-pos.y, pos.x)
}

function incrementY(pos: Position): Position {
    return makePos(pos.x, pos.y + 1)
}
