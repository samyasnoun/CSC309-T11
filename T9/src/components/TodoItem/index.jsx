import "./style.css";
import trashIcon from "./trash.webp";

function TodoItem({ todo, onDelete, onToggle }) {
    if (!todo) {
        return null;
    }

    const handleToggle = () => {
        if (typeof onToggle === "function") {
            onToggle(todo.id);
        }
    };

    const handleDelete = (event) => {
        event.preventDefault();
        if (typeof onDelete === "function") {
            onDelete(todo.id);
        }
    };

    return (
        <div className='todo-item row'>
            <input
                type="checkbox"
                checked={todo.completed}
                onChange={handleToggle}
            />
            <span className={todo.completed ? "completed" : ""}>{todo.text}</span>
            <a href="#" onClick={handleDelete}>
                <img src={trashIcon} alt="Delete todo" />
            </a>
        </div>
    );
}

export default TodoItem;