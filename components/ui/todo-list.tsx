"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react"
import { useTranslations } from 'next-intl'

interface Todo {
  id: string
  text: string
  completed: boolean
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const t = useTranslations('dashboard')

  // 从本地存储加载待办事项
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos')
    if (savedTodos) {
      try {
        setTodos(JSON.parse(savedTodos))
      } catch (e) {
        console.error('Failed to parse saved todos', e)
      }
    }
  }, [])

  // 保存待办事项到本地存储
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  // 添加新待办事项
  const addTodo = () => {
    if (newTodo.trim() === '') return
    
    const todo: Todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false
    }
    
    setTodos(prev => [...prev, todo])
    setNewTodo('')
  }

  // 切换待办事项完成状态
  const toggleTodo = (id: string) => {
    setTodos(prev => 
      prev.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }

  // 删除待办事项
  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id))
  }

  // 按未完成和已完成分组
  const activeTodos = todos.filter(todo => !todo.completed)
  const completedTodos = todos.filter(todo => todo.completed)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('todoList')}</CardTitle>
        <CardDescription>{t('addTodo')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 添加新待办事项 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder={t('addTodoPlaceholder')}
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={addTodo} size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 未完成待办事项 */}
          <div className="space-y-2">
            {activeTodos.length === 0 && completedTodos.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">{t('noTodos')}</p>
            ) : (
              activeTodos.map(todo => (
                <div key={todo.id} className="flex items-center justify-between p-3 border rounded-lg group">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleTodo(todo.id)}
                      className="text-muted-foreground hover:text-green-500"
                    >
                      <Circle className="h-5 w-5" />
                    </button>
                    <span>{todo.text}</span>
                  </div>
                  <Button 
                    onClick={() => deleteTodo(todo.id)} 
                    size="icon" 
                    variant="ghost" 
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* 已完成待办事项 */}
          {completedTodos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('completedTasks')}</h4>
              <div className="space-y-2">
                {completedTodos.map(todo => (
                  <div key={todo.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 group">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleTodo(todo.id)}
                        className="text-green-500"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <span className="line-through text-muted-foreground">{todo.text}</span>
                    </div>
                    <Button 
                      onClick={() => deleteTodo(todo.id)} 
                      size="icon" 
                      variant="ghost" 
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 