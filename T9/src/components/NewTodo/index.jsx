import { useState } from "react";
import "./style.css";

function NewTodo({ onAddTodo }) {
    const [text, setText] = useState("");

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedText = text.trim();

        if (!trimmedText) {
            return;
        }

        if (typeof onAddTodo === "function") {
            onAddTodo(trimmedText);
        }

        setText("");
    };

    return (
        <form className="new-todo row" onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Enter a new task"
                value={text}
                onChange={(event) => setText(event.target.value)}
            />
            <button type="submit">+</button>
        </form>
    );
}

export default NewTodo;
