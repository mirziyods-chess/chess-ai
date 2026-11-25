
from flask import Flask, render_template, request, jsonify
import chess
import chess.engine
from pathlib import Path
import atexit

app = Flask(__name__)

# Find Stockfish inside the engine folder
ENGINE_PATH = Path(__file__).parent / "engine" / "stockfish.exe"

engine = None

def get_engine():
    global engine

    if engine is None:
        if not ENGINE_PATH.exists():
            raise FileNotFoundError(
                f"Stockfish not found: {ENGINE_PATH}"
            )

        engine = chess.engine.SimpleEngine.popen_uci(
            str(ENGINE_PATH)
        )

    return engine


@atexit.register
def close_engine():
    if engine is not None:
        engine.quit()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/move", methods=["POST"])
def get_ai_move():
    try:
        data = request.get_json()

        board = chess.Board(data["fen"])

        if board.is_game_over():
            return jsonify({"error": "Game is over"}), 400

        level = int(data.get("level", 2))

        # Map website difficulty to Stockfish strength
        skill_levels = {
            1: 3,
            2: 10,
            3: 18
        }

        skill = skill_levels.get(level, 10)

        ai = get_engine()
        ai.configure({"Skill Level": skill})

        result = ai.play(
            board,
            chess.engine.Limit(time=0.5)
        )

        move = result.move
        san = board.san(move)
        board.push(move)

        return jsonify({
            "move": move.uci(),
            "san": san,
            "fen": board.fen()
        })

    except FileNotFoundError as error:
        return jsonify({"error": str(error)}), 500

    except Exception as error:
        return jsonify({"error": str(error)}), 500

@app.route("/api/analyze", methods=["POST"])
def analyze_position():
    try:
        data = request.get_json()
        board = chess.Board(data["fen"])

        ai = get_engine()
        result = ai.analyse(
            board,
            chess.engine.Limit(time=0.5)
        )

        score = result["score"].white().score(mate_score=10000)

        return jsonify({
            "evaluation": score / 100
        })

    except Exception as error:
        return jsonify({"error": str(error)}), 500
if __name__ == "__main__":
    app.run(debug=True)
