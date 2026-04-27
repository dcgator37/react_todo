import React, { Component } from 'react';
import axios from 'axios';

class Todo extends Component {
  state = {
    todos: [],
    newItem: "",
    error: null
  };

    componentDidMount() {
        this.fetchTodos();
    }

    async fetchTodos() {
        try {
            const todos = await axios.get(`/api/todos`);
            this.setState({ todos: todos.data, error: null });
        } catch (error) {
            this.setState({ error: error.message });
        }
    }

    handlesubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/todos`, { item_text: this.state.newItem });
            this.setState({ newItem: "" });
            this.fetchTodos();
        } catch (error) {
            this.setState({ error: error.message });
        }
    }

    async handleDelete(id) {
        try {
            await axios.delete(`/api/todos/${id}`);
            this.fetchTodos();
        } catch (error) {
            this.setState({ error: error.message });
        }
    }
    
    render() {
        return (
            <div>
                <h1>Todo List</h1>
                {this.state.error && <div style={{color: 'red'}}>Error: {this.state.error}</div>}
                <form onSubmit={this.handlesubmit}>
                    <input
                        type="text"
                        value={this.state.newItem}
                        onChange={(e) => this.setState({ newItem: e.target.value })}
                        placeholder="Add a new todo"
                    />
                    <button type="submit">Add</button>
                </form>
                <ul>
                    {this.state.todos.map((todo) => (
                        <li key={todo.id}>{todo.item_text}
                        <button onClick={() => this.handleDelete(todo.id)}>
                            Delete
                        </button>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
}

export default Todo;