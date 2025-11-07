import { useState } from "react";
import "./App.css";
import NewTodo from "./components/NewTodo";
import TodoItem from "./components/TodoItem";

// You can use this to seed your TODO list
const seed = [
    { id: 0, text: "Submit assignment 2", completed: false },
    { id: 1, text: "Reschedule the dentist appointment", completed: false },
    { id: 2, text: "Prepare for CSC309 exam", completed: false },
    { id: 3, text: "Find term project partner", completed: true },
    { id: 4, text: "Learn React Hooks", completed: false },
];

function App() {
    const [todos, setTodos] = useState(seed);

    const handleAddTodo = (text) => {
        setTodos((prevTodos) => {
            const nextId = prevTodos.length
                ? Math.max(...prevTodos.map((todo) => todo.id)) + 1
                : 0;
            return [
                ...prevTodos,
                { id: nextId, text, completed: false },
            ];
        });
    };

    const handleDeleteTodo = (id) => {
        setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
    };

    const handleToggleTodo = (id) => {
        setTodos((prevTodos) =>
            prevTodos.map((todo) =>
                todo.id === id
                    ? { ...todo, completed: !todo.completed }
                    : todo,
            ),
        );
    };

    return (
        <div className="app">
            <h1>My ToDos</h1>
            <NewTodo onAddTodo={handleAddTodo} />
            <ul className="todo-list">
                {todos.map((todo) => (
                    <li key={todo.id}>
                        <TodoItem
                            todo={todo}
                            onDelete={handleDeleteTodo}
                            onToggle={handleToggleTodo}
                        />
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default App;
