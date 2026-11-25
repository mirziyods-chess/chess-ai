
const game = new Chess();

const board = document.getElementById("board");
const statusText = document.getElementById("status");
const historyList = document.getElementById("history");
const capturedByWhite = document.getElementById("capturedByWhite");
const capturedByBlack = document.getElementById("capturedByBlack");

let selectedSquare = null;
let boardLocked = false;
let legalMoves = [];

const pieces = {
    w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
    b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }
};

function renderBoard() {
    board.innerHTML = "";

    const position = game.board();

    position.forEach((row, r) => {
        row.forEach((piece, c) => {
            const square = document.createElement("div");

            square.className =
                "square " + ((r + c) % 2 === 0 ? "light" : "dark");

            const squareName = "abcdefgh"[c] + (8 - r);
            square.dataset.file = "abcdefgh"[c];
            square.dataset.rank = 8 - r;

           if (piece) {
    square.textContent =
        pieces[piece.color][piece.type];

    square.style.color =
        piece.color === "w" ? "#ffffff" : "#171717";

    square.style.textShadow =
        piece.color === "w"
        ? "1px 1px 2px #333"
        : "1px 1px 2px #ffffff";
}

           if (selectedSquare === squareName) {
    square.classList.add("selected");
}

if (legalMoves.includes(squareName)) {
    square.classList.add("legal-move");
}

            square.addEventListener("click", () => {
                handleSquareClick(squareName);
            });

            board.appendChild(square);
        });
    });

    updateStatus();
    updateHistory();
    updateCapturedPieces();
}


function handleSquareClick(square) {
    if (boardLocked || game.game_over()) return;

    const piece = game.get(square);

    if (selectedSquare) {
       let promotion = "q";

const movingPiece = game.get(selectedSquare);

if (
    movingPiece &&
    movingPiece.type === "p" &&
    (square[1] === "8" || square[1] === "1")
) {
    const choice = prompt(
        "Promote pawn to: q (Queen), r (Rook), b (Bishop), n (Knight)",
        "q"
    );

    if (!choice || !["q", "r", "b", "n"].includes(choice.toLowerCase())) {
        return;
    }

    promotion = choice.toLowerCase();
}

const move = game.move({
    from: selectedSquare,
    to: square,
    promotion: promotion
});

        if (move) {
            selectedSquare = null;
            legalMoves = [];
            renderBoard();

            if (game.turn() === "b") {
                makeAiMove();
            }
            return;
        }
    }

    if (piece && piece.color === game.turn()) {
        selectedSquare = square;
        legalMoves = game.moves({
            square: square,
            verbose: true
        }).map(move => move.to);
    } else {
        selectedSquare = null;
        legalMoves = [];
    }

    renderBoard();
}


function updateStatus() {
    if (game.in_checkmate()) {
        statusText.textContent =
            "Checkmate! " + (game.turn() === "w" ? "Black" : "White") + " wins.";
    } else if (game.in_draw()) {
        statusText.textContent = "Draw!";
    } else if (game.in_check()) {
        statusText.textContent =
            (game.turn() === "w" ? "White" : "Black") + " is in check!";
    } else {
        statusText.textContent =
            (game.turn() === "w" ? "White" : "Black") + " to move.";
    }
}

function updateHistory() {
    historyList.innerHTML = "";

    const moves = game.history();

    for (let i = 0; i < moves.length; i += 2) {
        const item = document.createElement("li");

        item.textContent =
            (i / 2 + 1) + ". " +
            moves[i] + " " +
            (moves[i + 1] || "");

        historyList.appendChild(item);
    }
}

document.getElementById("newGame").addEventListener("click", () => {
    game.reset();
    selectedSquare = null;
    boardLocked = false;
    renderBoard();
});

document.getElementById("undo").addEventListener("click", () => {
    game.undo();
    game.undo();
    selectedSquare = null;
    renderBoard();
});

document.getElementById("analyze").addEventListener("click", async () => {
    const evaluation = document.getElementById("evaluation");
    evaluation.textContent = "Stockfish анализирует позицию...";

    try {
        const response = await fetch("/api/analyze", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({fen: game.fen()})
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Ошибка анализа");
        }

        const score = data.evaluation;
        const sign = score > 0 ? "+" : "";

        evaluation.textContent =
            "Оценка белых: " + sign + score.toFixed(2);

    } catch (error) {
        evaluation.textContent = "Ошибка: " + error.message;
    }
});

renderBoard();

async function makeAiMove() {
    boardLocked = true;
    statusText.textContent = "Stockfish is thinking...";

    try {
        const response = await fetch("/api/move", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fen: game.fen(),
                level: Number(document.getElementById("level").value)
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "AI request failed");
        }

        const move = data.move;

        game.move({
            from: move.substring(0, 2),
            to: move.substring(2, 4),
            promotion: move.substring(4, 5) || "q"
        });

        boardLocked = false;
        renderBoard();

    } catch (error) {
        boardLocked = false;
        renderBoard();
        statusText.textContent = "AI Error: " + error.message;
        console.error(error);
    }
}

function updateCapturedPieces() {
    capturedByWhite.innerHTML = "";
    capturedByBlack.innerHTML = "";

    const moves = game.history({ verbose: true });

    moves.forEach(move => {
        if (move.captured) {
            const capturedColor =
                move.color === "w" ? "b" : "w";

            const symbol = pieces[capturedColor][move.captured];

            if (move.color === "w") {
                capturedByWhite.textContent += symbol + " ";
            } else {
                capturedByBlack.textContent += symbol + " ";
            }
        }
    });
}
document.getElementById("flipBoard").addEventListener("click", () => {
    board.classList.toggle("flipped");
});