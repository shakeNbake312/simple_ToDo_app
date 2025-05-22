import styles from '../styles/todo-list.module.css'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { debounce } from 'lodash'
import ToDo from './todo'

export default function ToDoList() {
  const [todos, setTodos] = useState(null)
  const [mainInput, setMainInput] = useState('')
  const [filter, setFilter] = useState()
  const didFetchRef = useRef(false)

  useEffect(() => {
    if (!didFetchRef.current) {
      didFetchRef.current = true
      fetchTodos()
    }
  }, [])

  async function fetchTodos(completed) {
    let path = '/todos'
    if (completed !== undefined) {
      path = `/todos?completed=${completed}`
    }
    const res = await fetch(process.env.NEXT_PUBLIC_API_URL + path)
    const json = await res.json()
    setTodos(json)
  }

  // 1. Memoize updateTodo so its identity is stable
  const updateTodo = useCallback(async (todo) => {
    const data = {
      name: todo.name,
      completed: todo.completed
    }
    await fetch(
      process.env.NEXT_PUBLIC_API_URL + `/todos/${todo.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }
    )
  }, [])

  // 2. Memoize the debounced wrapper, re-creating only if updateTodo changes
  const debouncedUpdateTodo = useMemo(
    () => debounce(updateTodo, 500),
    [updateTodo]
  )

  // 3. Clean up any pending debounce calls on unmount
  useEffect(() => {
    return () => {
      debouncedUpdateTodo.cancel()
    }
  }, [debouncedUpdateTodo])

  function handleToDoChange(e, id) {
    const target = e.target
    const value = target.type === 'checkbox' ? target.checked : target.value
    const name = target.name
    const copy = [...todos]
    const idx = todos.findIndex((todo) => todo.id === id)
    const changedToDo = {
      ...todos[idx],
      [name]: value
    }
    copy[idx] = changedToDo

    debouncedUpdateTodo(changedToDo)
    setTodos(copy)
  }

  async function addToDo(name) {
    const res = await fetch(
      process.env.NEXT_PUBLIC_API_URL + `/todos/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, completed: false })
      }
    )
    if (res.ok) {
      const json = await res.json()
      setTodos((prev) => [...prev, json])
    }
  }

  async function handleDeleteToDo(id) {
    const res = await fetch(
      process.env.NEXT_PUBLIC_API_URL + `/todos/${id}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      }
    )
    if (res.ok) {
      setTodos((prev) => prev.filter((todo) => todo.id !== id))
    }
  }

  function handleMainInputChange(e) {
    setMainInput(e.target.value)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && mainInput.length > 0) {
      addToDo(mainInput)
      setMainInput('')
    }
  }

  function handleFilterChange(value) {
    setFilter(value)
    fetchTodos(value)
  }

  return (
    <div className={styles.container}>
      <div className={styles.mainInputContainer}>
        <input
          className={styles.mainInput}
          placeholder="What needs to be done?"
          value={mainInput}
          onChange={handleMainInputChange}
          onKeyDown={handleKeyDown}
        />
      </div>

      {!todos && <div>Loading...</div>}

      {todos && (
        <div>
          {todos.map((todo) => (
            <ToDo
              key={todo.id}
              todo={todo}
              onDelete={handleDeleteToDo}
              onChange={handleToDoChange}
            />
          ))}
        </div>
      )}

      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${
            filter === undefined && styles.filterActive
          }`}
          onClick={() => handleFilterChange()}
        >
          All
        </button>
        <button
          className={`${styles.filterBtn} ${
            filter === false && styles.filterActive
          }`}
          onClick={() => handleFilterChange(false)}
        >
          Active
        </button>
        <button
          className={`${styles.filterBtn} ${
            filter === true && styles.filterActive
          }`}
          onClick={() => handleFilterChange(true)}
        >
          Completed
        </button>
      </div>
    </div>
  )
}